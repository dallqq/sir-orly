---
name: network-discovery-and-arp
description: >-
  Use this skill when implementing or debugging Feature 1 (Network Discovery):
  detecting local IP address, NIC interface details, subnet CIDR range, Scapy
  Layer 2 ARP broadcast scanning, Layer 3 ICMP sweep fallback, OS ARP cache
  parsing, reverse DNS hostname lookup, and IEEE OUI MAC vendor resolution (Phase 2).
---

# Network Discovery & ARP Engine Skill (`Phase 2 — Feature 1`)

## Overview
Implements **Feature 1: Network Discovery** (`Detect local IP address`, `Display network range`, `List active devices`) with full Windows compatibility and graceful fallbacks.

## Implementation Rules
1. **Local Interface & CIDR Detection (`backend/app/services/interface_detector.py`)**:
   - Determine primary outbound IPv4 address via a non-transmitting UDP socket (`s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(("8.8.8.8", 80)); local_ip = s.getsockname()[0]`).
   - Match `local_ip` against `psutil.net_if_addrs()` to extract the exact `netmask` (e.g., `255.255.255.0`), interface name (e.g., `Wi-Fi` or `Ethernet`), and hardware MAC address (`psutil.AF_LINK`).
   - Compute the network range using `ipaddress.IPv4Network(f"{local_ip}/{netmask}", strict=False)` -> returns CIDR string (e.g., `192.168.1.0/24`), network address, broadcast address, and total usable hosts.
   - Detect the Default Gateway IP on Windows by parsing `route print 0.0.0.0` (or `netstat -rn`) and falling back to `.1` of the subnet.
2. **Multi-Layer Active Host Discovery (`backend/app/services/network_scanner.py`)**:
   - **Layer 2 Scapy ARP Scan (Primary)**: Attempt `scapy.all.srp(Ether(dst="ff:ff:ff:ff:ff:ff")/ARP(pdst=str(network_cidr)), timeout=2, verbose=0)`.
   - **Layer 3 Async Ping Sweep + OS ARP Cache (Automatic Fallback)**:
     - Always run or fallback if Npcap is not installed or user lacks Admin rights.
     - Concurrently probe all hosts in the `/24` subnet (using `icmplib.async_multiping` with `privileged=False` or `asyncio.create_subprocess_exec("ping", "-n", "1", "-w", "400", ip)` with a semaphore of 64).
     - Parse `arp -a` output on Windows to map discovered IPv4 addresses to their hardware MAC addresses (`00-1a-2b-...` normalized to `00:1A:2B:...`).
3. **Host Enrichment**:
   - **Hostname**: Run `socket.gethostbyaddr(ip)` inside `asyncio.to_thread` with a `1.0s` timeout so slow DNS never blocks the scan.
   - **MAC Vendor (OUI)**: Resolve MAC prefix using `mac_vendor_lookup` or an embedded top-OUI lookup dictionary with safe fallback to `"Unknown / Private MAC"`.

## Verification Steps
1. Run `pytest backend/tests/test_interface_detector.py` to confirm valid IPv4, Netmask, and CIDR range detection on the host machine.
2. Trigger `POST /api/v1/discovery/scan` and verify at least the local host and default gateway are discovered with valid IP, MAC, and Hostname.

