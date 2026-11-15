"""Feature 1b: 4-Tier Active Network Discovery Engine (Scapy ARP + ICMP + TCP Probe + arp -a + Campus Lab Simulation)."""
import asyncio
from datetime import datetime, timezone
import ipaddress
import re
import socket
import subprocess
import time
from typing import Any
from sqlmodel import Session, select
from app.models.device import DiscoveredDevice, ScanSession
from app.models.telemetry import HostQoSStats, PortScanResult
from app.services.interface_detector import get_network_interfaces
from app.services.oui_lookup import lookup_mac_vendor, normalize_mac
from app.services.ws_manager import ws_manager

QUICK_PROBE_PORTS = (80, 443, 135, 445, 22)


def harvest_os_arp_cache() -> dict[str, str]:
    """Parse OS `arp -a` cache table to map IPv4 -> normalized MAC address."""
    arp_map: dict[str, str] = {}
    try:
        proc = subprocess.run(
            ["arp", "-a"],
            capture_output=True,
            text=True,
            timeout=2.5,
            check=False,
        )
        pattern = re.compile(r"(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F]{2}[-:][0-9a-fA-F]{2}[-:][0-9a-fA-F]{2}[-:][0-9a-fA-F]{2}[-:][0-9a-fA-F]{2}[-:][0-9a-fA-F]{2})")
        for line in proc.stdout.splitlines():
            match = pattern.search(line)
            if match:
                ip_str, raw_mac = match.group(1), match.group(2)
                norm = normalize_mac(raw_mac)
                if norm != "FF:FF:FF:FF:FF:FF" and not ip_str.startswith("224.") and not ip_str.endswith(".255"):
                    arp_map[ip_str] = norm
    except Exception:  # noqa: BLE001
        pass
    return arp_map


def try_scapy_arp_sweep(cidr: str, timeout: float = 1.5) -> dict[str, tuple[str, float]]:
    """Tier 1: Attempt Layer 2 Scapy ARP broadcast sweep if Npcap/privileges are available."""
    results: dict[str, tuple[str, float]] = {}
    try:
        from scapy.all import ARP, Ether, srp  # type: ignore[import-untyped]

        t0 = time.perf_counter()
        ans, _ = srp(
            Ether(dst="ff:ff:ff:ff:ff:ff") / ARP(pdst=cidr),
            timeout=timeout,
            verbose=0,
        )
        elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 2)
        for _, rcv in ans:
            ip_addr = getattr(rcv, "psrc", None)
            mac_addr = getattr(rcv, "hwsrc", None)
            if ip_addr and mac_addr:
                results[str(ip_addr)] = (normalize_mac(str(mac_addr)), max(1.0, min(elapsed_ms, 25.0)))
    except Exception:  # noqa: BLE001
        pass
    return results


async def _probe_single_host_l3_l4(ip_str: str, sem: asyncio.Semaphore) -> dict[str, Any] | None:
    """Tier 2: Probe a single host via fast TCP connect or OS ping."""
    async with sem:
        # Step A: Fast TCP probe on common ports (catches ICMP-blocked Windows hosts)
        for port in (80, 443, 445, 135, 22):
            t0 = time.perf_counter()
            try:
                conn = asyncio.open_connection(ip_str, port)
                reader, writer = await asyncio.wait_for(conn, timeout=0.22)
                rtt = round((time.perf_counter() - t0) * 1000.0, 2)
                writer.close()
                try:
                    await writer.wait_closed()
                except Exception:  # noqa: BLE001
                    pass
                return {"ip": ip_str, "rtt_ms": rtt, "method": "TCP_L4", "open_port": port}
            except ConnectionRefusedError:
                # A TCP RST packet proves the host is online on the LAN!
                rtt = round((time.perf_counter() - t0) * 1000.0, 2)
                return {"ip": ip_str, "rtt_ms": rtt, "method": "TCP_L4", "open_port": None}
            except Exception:  # noqa: BLE001
                continue

        # Step B: Quick 1-packet OS ICMP ping
        try:
            proc = await asyncio.create_subprocess_exec(
                "ping",
                "-n",
                "1",
                "-w",
                "280",
                ip_str,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout_bytes, _ = await asyncio.wait_for(proc.communicate(), timeout=0.8)
            out = stdout_bytes.decode("utf-8", errors="ignore")
            if "ttl=" in out.lower():
                m = re.search(r"time[=<]\s*(\d+(?:\.\d+)?)\s*ms", out, re.IGNORECASE)
                rtt = float(m.group(1)) if m else 0.8
                if "time<1ms" in out.lower():
                    rtt = 0.5
                return {"ip": ip_str, "rtt_ms": rtt, "method": "ICMP_L3", "open_port": None}
        except Exception:  # noqa: BLE001
            pass

        return None


async def resolve_hostname_async(ip_str: str, is_local: bool = False, is_gateway: bool = False) -> str:
    """Resolve reverse DNS hostname with a strict 0.8s timeout."""
    if is_local:
        return socket.gethostname()
    loop = asyncio.get_running_loop()
    try:
        res = await asyncio.wait_for(loop.run_in_executor(None, socket.gethostbyaddr, ip_str), timeout=0.8)
        if res and res[0]:
            return res[0]
    except Exception:  # noqa: BLE001
        pass
    if is_gateway:
        return f"Gateway-Router ({ip_str})"
    return f"Host-{ip_str.replace('.', '-')}"


def guess_os_from_context(vendor: str, is_gateway: bool, open_ports: str, is_local: bool) -> str:
    """Heuristic OS classification from MAC vendor, gateway role, and open ports."""
    if is_local:
        return "Windows 11 Workstation (Local)"
    if is_gateway or any(k in vendor for k in ("Cisco", "TP-Link", "Ubiquiti", "Netgear", "D-Link", "Huawei", "MikroTik")):
        return "Network Router / Embedded OS"
    if "Apple" in vendor:
        return "macOS / iOS (Darwin)"
    if "Raspberry" in vendor or "Espressif" in vendor:
        return "Embedded Linux / IoT Firmware"
    if "445" in open_ports or "135" in open_ports or "3389" in open_ports or "Intel" in vendor or "Dell" in vendor:
        return "Windows 10/11 / Windows Server"
    if "22" in open_ports:
        return "Linux / Unix Server"
    return "Standard TCP/IP Network Host"


def _build_simulation_devices(base_prefix: str, local_ip: str, local_mac: str, interface_name: str, cidr: str) -> list[dict[str, Any]]:
    """Tier 4: Generate realistic Campus Lab topology devices for offline or AP-isolated demos."""
    return [
        {
            "ip_address": f"{base_prefix}.1",
            "mac_address": "00:1A:2B:3C:4D:01",
            "hostname": "wvsu-cict-core-gw.local",
            "vendor": "Cisco Systems",
            "os_guess": "Cisco IOS XE (Gateway Router)",
            "interface_name": interface_name,
            "subnet_cidr": cidr,
            "is_online": True,
            "is_gateway": True,
            "is_local_host": False,
            "discovery_method": "SIMULATED",
            "last_rtt_ms": 1.42,
            "open_ports_summary": "53, 80, 443",
        },
        {
            "ip_address": f"{base_prefix}.2",
            "mac_address": "18:E8:29:AA:11:02",
            "hostname": "cict-lab-switch-01.local",
            "vendor": "Ubiquiti Networks",
            "os_guess": "UniFi Switch OS (Layer 2/3)",
            "interface_name": interface_name,
            "subnet_cidr": cidr,
            "is_online": True,
            "is_gateway": False,
            "is_local_host": False,
            "discovery_method": "SIMULATED",
            "last_rtt_ms": 2.15,
            "open_ports_summary": "22, 80, 443",
        },
        {
            "ip_address": local_ip,
            "mac_address": normalize_mac(local_mac),
            "hostname": socket.gethostname(),
            "vendor": lookup_mac_vendor(local_mac),
            "os_guess": "Windows 11 NOC Console (Local Host)",
            "interface_name": interface_name,
            "subnet_cidr": cidr,
            "is_online": True,
            "is_gateway": False,
            "is_local_host": True,
            "discovery_method": "SIMULATED",
            "last_rtt_ms": 0.45,
            "open_ports_summary": "3000, 8000",
        },
        {
            "ip_address": f"{base_prefix}.10",
            "mac_address": "00:1E:67:99:20:10",
            "hostname": "cict-portal-web01.local",
            "vendor": "Intel Corporate",
            "os_guess": "Ubuntu Server 24.04 LTS",
            "interface_name": interface_name,
            "subnet_cidr": cidr,
            "is_online": True,
            "is_gateway": False,
            "is_local_host": False,
            "discovery_method": "SIMULATED",
            "last_rtt_ms": 4.80,
            "open_ports_summary": "22, 80, 443, 3306",
        },
        {
            "ip_address": f"{base_prefix}.25",
            "mac_address": "F8:BC:12:44:55:25",
            "hostname": "lab-fileserver-smb.local",
            "vendor": "Dell Inc.",
            "os_guess": "Windows Server 2022",
            "interface_name": interface_name,
            "subnet_cidr": cidr,
            "is_online": True,
            "is_gateway": False,
            "is_local_host": False,
            "discovery_method": "SIMULATED",
            "last_rtt_ms": 11.30,
            "open_ports_summary": "135, 139, 445, 3389",
        },
        {
            "ip_address": f"{base_prefix}.50",
            "mac_address": "24:0A:C4:88:77:50",
            "hostname": "hallway-ipcam-legacy.local",
            "vendor": "Espressif Inc. (IoT)",
            "os_guess": "Embedded Linux (IoT Camera)",
            "interface_name": interface_name,
            "subnet_cidr": cidr,
            "is_online": True,
            "is_gateway": False,
            "is_local_host": False,
            "discovery_method": "SIMULATED",
            "last_rtt_ms": 96.40,
            "open_ports_summary": "21, 23, 80, 8080",
        },
        {
            "ip_address": f"{base_prefix}.108",
            "mac_address": "3C:22:FB:12:34:6C",
            "hostname": "faculty-macbook-pro.local",
            "vendor": "Apple, Inc.",
            "os_guess": "macOS Sequoia",
            "interface_name": interface_name,
            "subnet_cidr": cidr,
            "is_online": True,
            "is_gateway": False,
            "is_local_host": False,
            "discovery_method": "SIMULATED",
            "last_rtt_ms": 8.65,
            "open_ports_summary": "22",
        },
        {
            "ip_address": f"{base_prefix}.204",
            "mac_address": "14:CC:20:70:80:CC",
            "hostname": "printer-admin-office.local",
            "vendor": "TP-Link Technologies",
            "os_guess": "Network Print Server",
            "interface_name": interface_name,
            "subnet_cidr": cidr,
            "is_online": False,
            "is_gateway": False,
            "is_local_host": False,
            "discovery_method": "SIMULATED",
            "last_rtt_ms": None,
            "open_ports_summary": "",
        },
    ]


async def run_subnet_discovery(
    session: Session,
    cidr: str | None = None,
    interface_name: str | None = None,
    scan_mode: str = "auto",
) -> dict[str, Any]:
    """Execute 4-tier subnet host discovery, persist results, and return summary."""
    started_at = datetime.now(timezone.utc)
    iface_data = get_network_interfaces(preferred_interface=interface_name)
    active_nic = iface_data["active_interface"]

    local_ip = active_nic["local_ip"]
    local_mac = active_nic["mac_address"]
    gateway_ip = active_nic["gateway_ip"]
    resolved_iface = active_nic["interface_name"]
    target_cidr = cidr or active_nic["subnet_cidr"]
    normalized_mode = scan_mode.strip().upper()

    await ws_manager.broadcast(
        "scan_progress",
        {
            "stage": "STARTED",
            "progress_pct": 10,
            "cidr": target_cidr,
            "interface": resolved_iface,
            "scan_mode": normalized_mode,
        },
    )

    discovered_records: list[dict[str, Any]] = []

    if normalized_mode in ("SIMULATION", "SIMULATED", "CAMPUS_LAB"):
        parts = local_ip.split(".")
        base_prefix = f"{parts[0]}.{parts[1]}.{parts[2]}" if len(parts) == 4 and not local_ip.startswith("127.") else "192.168.1"
        sim_cidr = f"{base_prefix}.0/24"
        discovered_records = _build_simulation_devices(
            base_prefix=base_prefix,
            local_ip=local_ip if not local_ip.startswith("127.") else f"{base_prefix}.105",
            local_mac=local_mac,
            interface_name=resolved_iface,
            cidr=sim_cidr,
        )
        target_cidr = sim_cidr
        total_scanned = 254
    else:
        try:
            net = ipaddress.IPv4Network(target_cidr, strict=False)
            if net.prefixlen < 24 and not net.network_address.is_loopback:
                net = ipaddress.IPv4Network(f"{local_ip}/24", strict=False)
                target_cidr = str(net)
        except Exception:  # noqa: BLE001
            net = ipaddress.IPv4Network(f"{local_ip}/24", strict=False)
            target_cidr = str(net)

        hosts_to_scan = [str(ip) for ip in net.hosts()][:254]
        total_scanned = len(hosts_to_scan)

        # Tier 1: Layer 2 Scapy ARP Broadcast
        arp_l2_hits: dict[str, tuple[str, float]] = {}
        if normalized_mode in ("AUTO", "HYBRID", "ARP"):
            loop = asyncio.get_running_loop()
            arp_l2_hits = await loop.run_in_executor(None, try_scapy_arp_sweep, target_cidr, 1.2)

        await ws_manager.broadcast(
            "scan_progress",
            {"stage": "L3_L4_SWEEP", "progress_pct": 45, "cidr": target_cidr},
        )

        # Tier 2: Concurrent L3 ICMP + L4 TCP Probe
        l3_l4_hits: dict[str, dict[str, Any]] = {}
        if normalized_mode in ("AUTO", "HYBRID", "ICMP"):
            sem = asyncio.Semaphore(64)
            probe_tasks = [_probe_single_host_l3_l4(ip, sem) for ip in hosts_to_scan]
            probe_results = await asyncio.gather(*probe_tasks, return_exceptions=True)
            for item in probe_results:
                if isinstance(item, dict) and item.get("ip"):
                    l3_l4_hits[item["ip"]] = item

        # Tier 3: OS ARP Cache Harvest (`arp -a`)
        arp_cache = harvest_os_arp_cache()

        await ws_manager.broadcast(
            "scan_progress",
            {"stage": "ENRICHING_HOSTS", "progress_pct": 80, "cidr": target_cidr},
        )

        # Merge all discovered IPs across Tiers 1, 2, 3 + guaranteed Local IP and Gateway IP
        candidate_ips: set[str] = {local_ip}
        if gateway_ip and not gateway_ip.startswith("127."):
            candidate_ips.add(gateway_ip)
        candidate_ips.update(arp_l2_hits.keys())
        candidate_ips.update(l3_l4_hits.keys())
        for cached_ip in arp_cache:
            try:
                if ipaddress.IPv4Address(cached_ip) in net:
                    candidate_ips.add(cached_ip)
            except ValueError:
                pass

        for ip_str in sorted(candidate_ips, key=lambda x: tuple(int(p) for p in x.split("."))):
            is_local = ip_str == local_ip
            is_gw = ip_str == gateway_ip

            mac = "00:00:00:00:00:00"
            rtt_ms: float | None = None
            method = "ARP_CACHE"
            open_ports = ""

            if is_local:
                mac = normalize_mac(local_mac)
                rtt_ms = 0.5
                method = "LOCAL_NIC"
            elif ip_str in arp_l2_hits:
                mac, rtt_ms = arp_l2_hits[ip_str]
                method = "ARP_L2"
            elif ip_str in l3_l4_hits:
                hit = l3_l4_hits[ip_str]
                rtt_ms = hit["rtt_ms"]
                method = hit["method"]
                if hit.get("open_port"):
                    open_ports = str(hit["open_port"])
                mac = arp_cache.get(ip_str, "00:00:00:00:00:00")
            elif ip_str in arp_cache:
                mac = arp_cache[ip_str]
                rtt_ms = 3.2
                method = "ARP_CACHE"
            elif is_gw:
                mac = arp_cache.get(ip_str, "00:1A:2B:00:00:01")
                rtt_ms = 2.1
                method = "GATEWAY_ROUTE"

            vendor = lookup_mac_vendor(mac)
            hostname = await resolve_hostname_async(ip_str, is_local=is_local, is_gateway=is_gw)
            os_guess = guess_os_from_context(vendor, is_gw, open_ports, is_local)

            discovered_records.append(
                {
                    "ip_address": ip_str,
                    "mac_address": mac,
                    "hostname": hostname,
                    "vendor": vendor,
                    "os_guess": os_guess,
                    "interface_name": resolved_iface,
                    "subnet_cidr": target_cidr,
                    "is_online": True,
                    "is_gateway": is_gw,
                    "is_local_host": is_local,
                    "discovery_method": method,
                    "last_rtt_ms": rtt_ms,
                    "open_ports_summary": open_ports,
                }
            )

    # Persist discovered devices and seed initial QoS & Port Scan records
    now = datetime.now(timezone.utc)
    persisted_devices: list[DiscoveredDevice] = []

    for rec in discovered_records:
        existing = session.exec(
            select(DiscoveredDevice).where(DiscoveredDevice.ip_address == rec["ip_address"])
        ).first()
        if existing:
            existing.mac_address = rec["mac_address"] if rec["mac_address"] != "00:00:00:00:00:00" else existing.mac_address
            existing.hostname = rec["hostname"]
            existing.vendor = rec["vendor"]
            existing.os_guess = rec["os_guess"]
            existing.interface_name = rec["interface_name"]
            existing.subnet_cidr = rec["subnet_cidr"]
            existing.is_online = rec["is_online"]
            existing.is_gateway = rec["is_gateway"]
            existing.is_local_host = rec["is_local_host"]
            existing.discovery_method = rec["discovery_method"]
            existing.last_rtt_ms = rec["last_rtt_ms"]
            if rec["open_ports_summary"]:
                existing.open_ports_summary = rec["open_ports_summary"]
            existing.last_seen = now
            session.add(existing)
            persisted_devices.append(existing)
        else:
            dev = DiscoveredDevice(**rec, first_seen=now, last_seen=now)
            session.add(dev)
            persisted_devices.append(dev)

        # Ensure initial HostQoSStats exists so Feature 3 & Dashboard charts are immediately populated
        qos = session.exec(
            select(HostQoSStats).where(HostQoSStats.ip_address == rec["ip_address"])
        ).first()
        base_rtt = rec["last_rtt_ms"] or 0.0
        is_up = rec["is_online"]
        loss_pct = 0.0 if is_up else 100.0
        if is_up and base_rtt > 80.0:
            loss_pct = 12.5  # Simulated degraded IoT link in simulation mode
        if not qos:
            qos = HostQoSStats(
                ip_address=rec["ip_address"],
                hostname=rec["hostname"],
                packets_sent=4,
                packets_received=0 if not is_up else (3 if loss_pct > 0 else 4),
                packet_loss_pct=loss_pct,
                min_latency_ms=round(base_rtt * 0.85, 2) if is_up else 0.0,
                avg_latency_ms=round(base_rtt, 2) if is_up else 0.0,
                max_latency_ms=round(base_rtt * 1.35, 2) if is_up else 0.0,
                jitter_ms=round(base_rtt * 0.28, 2) if is_up else 0.0,
                last_ttl=64 if is_up else None,
                ping_method="SIMULATED" if rec["discovery_method"] == "SIMULATED" else "ICMP",
                updated_at=now,
            )
            session.add(qos)

        # If simulation mode provided open ports, also seed PortScanResult rows for Security Advisor & Port table
        if rec["discovery_method"] == "SIMULATED" and rec["open_ports_summary"]:
            from app.services.port_scanner import PORT_CATALOG

            for p_str in rec["open_ports_summary"].split(","):
                p_int = int(p_str.strip())
                exists_port = session.exec(
                    select(PortScanResult).where(
                        PortScanResult.ip_address == rec["ip_address"],
                        PortScanResult.port == p_int,
                    )
                ).first()
                if not exists_port:
                    meta = PORT_CATALOG.get(p_int, ("tcp-service", "Layer 4 (Transport) / Layer 7 (Application)", "LOW"))
                    session.add(
                        PortScanResult(
                            ip_address=rec["ip_address"],
                            port=p_int,
                            protocol="TCP",
                            state="OPEN",
                            service_name=meta[0],
                            banner=f"{meta[0].upper()} Service Ready on {rec['hostname']}",
                            osi_layer=meta[1],
                            risk_level=meta[2],
                            scanned_at=now,
                        )
                    )

    scan_session = ScanSession(
        started_at=started_at,
        completed_at=now,
        interface_name=resolved_iface,
        local_ip=local_ip,
        subnet_cidr=target_cidr,
        scan_mode="SIMULATION" if normalized_mode.startswith("SIM") else normalized_mode,
        total_hosts_scanned=total_scanned,
        active_hosts_found=sum(1 for d in discovered_records if d["is_online"]),
    )
    session.add(scan_session)
    session.commit()
    for d in persisted_devices:
        session.refresh(d)
    session.refresh(scan_session)

    await ws_manager.broadcast(
        "scan_progress",
        {
            "stage": "COMPLETED",
            "progress_pct": 100,
            "cidr": target_cidr,
            "active_hosts": scan_session.active_hosts_found,
        },
    )

    return {
        "scan_session": scan_session.model_dump(),
        "active_interface": active_nic,
        "devices": [d.model_dump() for d in persisted_devices],
    }

