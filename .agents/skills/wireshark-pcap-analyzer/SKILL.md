---
name: wireshark-pcap-analyzer
description: >-
  Use this skill when implementing Course Topic 7 and the Bonus Wireshark Packet
  Integration: live packet sniffing with Scapy, active socket synthesizer fallback,
  BPF filtering, OSI Layer 2/3/4/7 packet dissection, hexadecimal/ASCII byte dumps,
  and .pcap file import/export for direct interoperability with Wireshark (Phase 4).
---

# Wireshark Traffic Analyzer & `.pcap` Engine Skill (`Phase 4 — Topic 7 & Bonus`)

## Overview
Integrates **Wireshark Traffic Analysis** directly into NetPulse NOC by capturing live packets, dissecting OSI/TCP-IP protocol headers, importing `.pcap` files, exporting `.pcap` files, and optionally launching desktop `Wireshark.exe`.

## Implementation Rules
1. **Live Packet Capture & Socket Synthesizer Fallback (`backend/app/services/packet_analyzer.py`)**:
   - Validate BPF filter strings (`all`, `arp`, `icmp`, `tcp`, `udp`, `port 80`, etc.) before passing to `scapy.all.sniff(filter=bpf_filter, count=limit, timeout=timeout)`.
   - **Automatic Fallback when Npcap is Absent**: If `scapy.sniff` raises an error or returns 0 packets on a restricted system without Npcap, automatically inspect active machine connections via `psutil.net_connections(kind="inet")` and ARP table entries, and construct genuine Scapy `Ether()/IP()/TCP()`, `UDP()`, `ICMP()`, and `ARP()` frames reflecting real active socket traffic on the host!
2. **OSI & TCP/IP Layer Dissection**:
   - For every packet, return a structured JSON dictionary containing:
     - `index`, `timestamp`, `length`, `protocol` (`ARP`, `ICMP`, `TCP`, `UDP`, `DNS`, `HTTP`, `TLS`, `OTHER`), `src_ip`, `dst_ip`, `src_port`, `dst_port`, `info`.
     - `osi_layers`:
       - `layer_2_datalink`: `{"protocol": "Ethernet II", "src_mac": ..., "dst_mac": ..., "ether_type": ...}`
       - `layer_3_network`: `{"protocol": "IPv4" | "ARP" | "ICMP", "src_ip": ..., "dst_ip": ..., "ttl": ..., "flags": ...}`
       - `layer_4_transport`: `{"protocol": "TCP" | "UDP", "src_port": ..., "dst_port": ..., "tcp_flags": ..., "seq": ..., "ack": ...}`
       - `layer_7_application`: Decoded DNS query/answer, HTTP request/response line, TLS SNI, or payload preview.
     - `hex_dump`: Standard 16-byte offset hex + printable ASCII representation (`0000  45 00 00 3c ...  E..<...`).
3. **Wireshark `.pcap` Import, Export & Desktop Launch (`routers/packets.py`)**:
   - Automatically generate `backend/captures/demo_lan_traffic.pcap` on startup (containing ARP, ICMP Echo, DNS Query/Response, TCP 3-way handshake, HTTP GET, and TLS ClientHello packets) so the user always has a rich capture session ready immediately.
   - Save every capture session using `scapy.utils.wrpcap("backend/captures/<filename>.pcap", packets)`.
   - Expose:
     - `POST /api/v1/packets/capture`
     - `POST /api/v1/packets/upload`
     - `GET /api/v1/packets/sessions`
     - `GET /api/v1/packets/sessions/{id}`
     - `GET /api/v1/packets/sessions/{id}/download` (`application/vnd.tcpdump.pcap`)
     - `POST /api/v1/packets/sessions/{id}/open-wireshark` (checks `C:\Program Files\Wireshark\Wireshark.exe` or `shutil.which("wireshark")` and launches it non-blockingly if installed).

## Verification Steps
1. Run `pytest backend/tests/test_packet_analyzer.py` to verify `.pcap` creation, reading via `rdpcap`, and OSI Layer 2–7 dissection.
