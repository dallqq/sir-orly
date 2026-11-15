"""Feature 1a: Smart Network Interface Scorer, Local IP, Subnet Mask, Gateway & CIDR Resolver."""
import ipaddress
import re
import socket
import subprocess
from typing import Any
import psutil

VIRTUAL_ADAPTER_KEYWORDS = (
    "vethernet",
    "wsl",
    "docker",
    "vmware",
    "virtualbox",
    "vbox",
    "hyper-v",
    "host-only",
    "tailscale",
    "radmin",
    "zerotier",
    "hamachi",
    "npcap",
    "loopback",
    "bluetooth",
    "teredo",
    "isatap",
    "tunnel",
    "tap-",
    "tun",
)

PREFERRED_ADAPTER_KEYWORDS = (
    "wi-fi",
    "wifi",
    "wlan",
    "wireless",
    "ethernet",
    "eth0",
    "en0",
    "lan",
)


def _get_outbound_route_ip() -> str | None:
    """Determine the preferred outbound local IPv4 via a non-transmitting UDP socket probe."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.settimeout(0.3)
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:  # noqa: BLE001
        return None


def _detect_windows_gateways() -> dict[str, str]:
    """Parse Windows routing table (`route print 0.0.0.0`) to map interface IP -> Gateway IP."""
    gateways: dict[str, str] = {}
    try:
        proc = subprocess.run(
            ["route", "print", "0.0.0.0"],
            capture_output=True,
            text=True,
            timeout=2.0,
            check=False,
        )
        # Match lines like: 0.0.0.0   0.0.0.0   192.168.1.1   192.168.1.105   25
        pattern = re.compile(
            r"0\.0\.0\.0\s+0\.0\.0\.0\s+(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)"
        )
        for line in proc.stdout.splitlines():
            match = pattern.search(line)
            if match:
                gw_ip, iface_ip = match.group(1), match.group(2)
                gateways[iface_ip] = gw_ip
    except Exception:  # noqa: BLE001
        pass
    return gateways


def score_interface(name: str, ip_str: str, is_up: bool, outbound_ip: str | None) -> int:
    """Compute heuristic score for an interface to prioritize real LAN/WLAN adapters."""
    score = 0
    lower_name = name.lower()

    if is_up:
        score += 40
    else:
        score -= 100

    if outbound_ip and ip_str == outbound_ip:
        score += 75

    try:
        ip_obj = ipaddress.IPv4Address(ip_str)
        if ip_obj.is_loopback:
            score -= 80
        elif ip_obj.is_link_local or ip_str.startswith("169.254."):
            score -= 90
        elif ip_obj.is_private:
            score += 35
            if ip_str.startswith("192.168.") or ip_str.startswith("10."):
                score += 15
    except ValueError:
        return -999

    if any(k in lower_name for k in PREFERRED_ADAPTER_KEYWORDS):
        score += 30
    if any(k in lower_name for k in VIRTUAL_ADAPTER_KEYWORDS):
        score -= 65
    if ip_str.startswith("192.168.56."):  # VirtualBox Host-Only default
        score -= 60

    return score


def compute_subnet_ranges(local_ip: str, netmask: str) -> dict[str, Any]:
    """Calculate true NIC CIDR and safe /24 scan CIDR (Large Subnet Safety Cap)."""
    try:
        true_net = ipaddress.IPv4Network(f"{local_ip}/{netmask}", strict=False)
    except Exception:  # noqa: BLE001
        true_net = ipaddress.IPv4Network(f"{local_ip}/24", strict=False)

    true_cidr = str(true_net)
    is_capped = False
    if true_net.prefixlen < 24 and not true_net.network_address.is_loopback:
        scan_net = ipaddress.IPv4Network(f"{local_ip}/24", strict=False)
        is_capped = True
    elif true_net.network_address.is_loopback:
        scan_net = ipaddress.IPv4Network("127.0.0.0/29", strict=False)
    else:
        scan_net = true_net

    hosts = list(scan_net.hosts())
    first_host = str(hosts[0]) if hosts else local_ip
    last_host = str(hosts[-1]) if hosts else local_ip

    return {
        "true_cidr": true_cidr,
        "scan_cidr": str(scan_net),
        "network_address": str(scan_net.network_address),
        "broadcast_address": str(scan_net.broadcast_address),
        "prefix_length": scan_net.prefixlen,
        "true_prefix_length": true_net.prefixlen,
        "usable_hosts": len(hosts),
        "first_usable_ip": first_host,
        "last_usable_ip": last_host,
        "is_large_subnet_capped": is_capped,
    }


def get_network_interfaces(preferred_interface: str | None = None) -> dict[str, Any]:
    """Enumerate, score, and return all network interfaces plus the active primary NIC."""
    addrs = psutil.net_if_addrs()
    stats = psutil.net_if_stats()
    outbound_ip = _get_outbound_route_ip()
    win_gateways = _detect_windows_gateways()

    interfaces: list[dict[str, Any]] = []

    for iface_name, snic_list in addrs.items():
        iface_stat = stats.get(iface_name)
        is_up = bool(iface_stat.isup) if iface_stat else False
        speed_mbps = int(iface_stat.speed) if iface_stat and iface_stat.speed else 0

        ipv4_addr = None
        netmask = "255.255.255.0"
        mac_addr = "00:00:00:00:00:00"

        for snic in snic_list:
            if snic.family == socket.AF_INET and not ipv4_addr:
                ipv4_addr = snic.address
                netmask = snic.netmask or "255.255.255.0"
            elif snic.family in ( getattr(psutil, "AF_LINK", -1), getattr(socket, "AF_PACKET", -1) ):
                if snic.address and len(snic.address) >= 17:
                    mac_addr = snic.address.replace("-", ":").upper()

        if not ipv4_addr:
            continue

        score = score_interface(iface_name, ipv4_addr, is_up, outbound_ip)
        subnet_info = compute_subnet_ranges(ipv4_addr, netmask)

        # Determine Default Gateway IP
        gateway_ip = win_gateways.get(ipv4_addr)
        if not gateway_ip:
            parts = ipv4_addr.split(".")
            gateway_ip = "127.0.0.1" if ipv4_addr.startswith("127.") else f"{parts[0]}.{parts[1]}.{parts[2]}.1"

        is_virtual = any(k in iface_name.lower() for k in VIRTUAL_ADAPTER_KEYWORDS)

        interfaces.append(
            {
                "interface_name": iface_name,
                "local_ip": ipv4_addr,
                "netmask": netmask,
                "mac_address": mac_addr,
                "gateway_ip": gateway_ip,
                "subnet_cidr": subnet_info["scan_cidr"],
                "true_cidr": subnet_info["true_cidr"],
                "network_address": subnet_info["network_address"],
                "broadcast_address": subnet_info["broadcast_address"],
                "first_usable_ip": subnet_info["first_usable_ip"],
                "last_usable_ip": subnet_info["last_usable_ip"],
                "usable_hosts": subnet_info["usable_hosts"],
                "is_large_subnet_capped": subnet_info["is_large_subnet_capped"],
                "is_up": is_up,
                "is_virtual": is_virtual,
                "speed_mbps": speed_mbps,
                "score": score,
            }
        )

    interfaces.sort(key=lambda x: x["score"], reverse=True)

    if not interfaces:
        fallback = compute_subnet_ranges("127.0.0.1", "255.0.0.0")
        interfaces.append(
            {
                "interface_name": "Loopback Pseudo-Interface",
                "local_ip": "127.0.0.1",
                "netmask": "255.0.0.0",
                "mac_address": "00:00:00:00:00:01",
                "gateway_ip": "127.0.0.1",
                "subnet_cidr": fallback["scan_cidr"],
                "true_cidr": fallback["true_cidr"],
                "network_address": fallback["network_address"],
                "broadcast_address": fallback["broadcast_address"],
                "first_usable_ip": fallback["first_usable_ip"],
                "last_usable_ip": fallback["last_usable_ip"],
                "usable_hosts": fallback["usable_hosts"],
                "is_large_subnet_capped": True,
                "is_up": True,
                "is_virtual": True,
                "speed_mbps": 1000,
                "score": 0,
            }
        )

    active = interfaces[0]
    if preferred_interface:
        for item in interfaces:
            if item["interface_name"].lower() == preferred_interface.lower():
                active = item
                break

    internet_reachable = bool(outbound_ip is not None and not active["local_ip"].startswith("127."))
    if internet_reachable:
        connection_state = "WAN_ONLINE"
    elif not active["local_ip"].startswith("127.") and active["is_up"]:
        connection_state = "LAN_ONLY"
    else:
        connection_state = "LOOPBACK_OFFLINE"

    return {
        "active_interface": active,
        "interfaces": interfaces,
        "hostname": socket.gethostname(),
        "internet_reachable": internet_reachable,
        "outbound_ip": outbound_ip,
        "connection_state": connection_state,
    }

