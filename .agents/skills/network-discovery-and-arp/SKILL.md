---
name: network-discovery-and-arp
description: >-
  Use this skill when implementing or debugging Feature 1 (Network Discovery):
  detecting local IP address, smart NIC scoring, subnet CIDR range, Scapy
  Layer 2 ARP broadcast scanning, Layer 3 ICMP + Layer 4 TCP sweep fallback, OS ARP cache
  parsing, Campus Lab Simulation mode, reverse DNS hostname lookup, and offline IEEE OUI MAC vendor resolution (Phase 2).
---

# Network Discovery & ARP Engine Skill (`Phase 2 — Feature 1`)

## Overview
Implements **Feature 1: Network Discovery** (`Detect local IP address`, `Display network range`, `List active devices`) with full Windows compatibility, smart virtual-adapter filtering, and 100% offline/non-admin fallbacks.

## Implementation Rules
1. **Smart Local Interface & CIDR Detection (`backend/app/services/interface_detector.py`)**:
   - Enumerate all interfaces via `psutil.net_if_addrs()` and `psutil.net_if_stats()`.
   - **Smart Adapter Scoring**: Prioritize UP interfaces named `Wi-Fi`, `WLAN`, or `Ethernet` with RFC1918 IPv4 addresses (`192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`). Deprioritize virtual adapters (`vEthernet`, `WSL`, `Docker`, `VMware`, `VirtualBox`, `Host-Only`, `Tailscale`, `Radmin`, `Loopback`, and `169.254.x.x` APIPA). Also verify with a non-transmitting UDP socket probe (`8.8.8.8:80`) wrapped in `try/except` so offline LANs never fail.
   - Compute the network range using `ipaddress.IPv4Network(f"{local_ip}/{netmask}", strict=False)`.
   - **Large Subnet Safety Cap**: If `network.prefixlen < 24` (e.g., `/16` or `/8` university network), compute `scan_cidr = str(ipaddress.IPv4Network(f"{local_ip}/24", strict=False))` so scans complete in `< 8 seconds` without scanning 65,534 hosts.
   - Detect the Default Gateway IP on Windows by parsing `route print 0.0.0.0` (matching the interface IP) and falling back to `.1` of the subnet.
2. **Offline OUI MAC Vendor Lookup (`backend/app/services/oui_lookup.py`)**:
   - Include an embedded dictionary of top IEEE OUI prefixes (Apple, Intel, Cisco, TP-Link, Realtek, Samsung, Dell, HP, ASUS, Huawei, Xiaomi, Espressif, Microsoft, VMware, VirtualBox, Ubiquiti, D-Link, Netgear, etc.) + `mac_vendor_lookup` fallback so MAC vendor resolution works **100% offline** and detects locally administered randomized MACs (second hex digit `2, 6, A, E` -> `"Randomized / Private MAC"`).
3. **4-Tier Active Host Discovery (`backend/app/services/network_scanner.py`)**:
   - **Tier 1 — Layer 2 Scapy ARP Broadcast (`ARP_L2`)**: Attempt `scapy.all.srp(Ether(dst="ff:ff:ff:ff:ff:ff")/ARP(pdst=scan_cidr), timeout=1.5, verbose=0)` inside `try/except`.
   - **Tier 2 — Layer 3 Async Ping + Layer 4 TCP Probe (`ICMP_L3` / `TCP_L4`)**: Concurrently probe hosts in `scan_cidr` (`asyncio.Semaphore(64)`). If ICMP is blocked by Windows Firewall, perform a fast `0.35s` TCP connect probe on ports `80, 443, 135, 445, 22` (even a `ConnectionRefusedError` TCP `RST` proves the host is alive!).
   - **Tier 3 — OS ARP Cache Harvest (`ARP_CACHE`)**: Parse `arp -a` output on Windows to map discovered IPv4 addresses to hardware MAC addresses (`00-1a-2b-...` normalized to `00:1A:2B:...`).
   - **Tier 4 — Campus Lab Simulation Mode (`scan_mode="simulation"`)**: Seeds realistic enterprise LAN hosts (Gateway Router, Core Switch, Web Server, File/SMB Server, Legacy Telnet Camera, Workstations) for restricted/AP-isolated networks.
4. **Endpoints (`routers/discovery.py`)**:
   - `GET /api/v1/discovery/interfaces` (and alias `/api/v1/discovery/interface`)
   - `POST /api/v1/discovery/scan`
   - `GET /api/v1/discovery/devices`

## Verification Steps
1. Run `pytest backend/tests/test_interface_detector.py` and `test_network_scanner.py`.
2. Trigger `POST /api/v1/discovery/scan` and verify at least the local host and default gateway (plus simulated hosts when requested) are returned with valid IP, MAC, Vendor, and Hostname.
