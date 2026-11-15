---
name: wireshark-pcap-analyzer
description: >-
  Use this skill when implementing Course Topic 7 and the Bonus Wireshark Packet
  Integration: live packet sniffing with Scapy, BPF filtering, OSI Layer 2/3/4/7
  packet dissection, hexadecimal/ASCII byte dumps, and .pcap file import/export
  for direct interoperability with Wireshark (Phase 4).
---

# Wireshark Traffic Analyzer & `.pcap` Engine Skill (`Phase 4 — Topic 7 & Bonus`)

## Overview
Integrates **Wireshark Traffic Analysis** directly into NetPulse NOC by capturing live packets, dissecting OSI/TCP-IP protocol headers, importing `.pcap` files, and exporting `.pcap` files that open natively in Wireshark.

## Implementation Rules
1. **Live Packet Capture (`backend/app/services/packet_analyzer.py`)**:
   - Use `scapy.all.sniff(filter=bpf_filter, count=limit, timeout=timeout)` inside a thread executor.
   - **Graceful Fallback when Npcap is Absent**: If `scapy.sniff` raises a Layer 2 provider error on a machine without Npcap, automatically fallback to capturing active socket connections (`psutil.net_connections(kind='inet')`) + generating valid Scapy `Ether()/IP()/TCP()` / `ICMP()` frames representing live active socket flows so the user can still inspect real connections and export a valid `.pcap` file!
2. **OSI & TCP/IP Layer Dissection**:
   - For every packet, return a structured JSON dictionary containing:
     - `index`, `timestamp`, `length`, `protocol` (`ARP`, `ICMP`, `TCP`, `UDP`, `DNS`, `HTTP`, `TLS`, `OTHER`), `src_ip`, `dst_ip`, `src_port`, `dst_port`, `info`.
     - `osi_layers`:
       - `layer_2_datalink`: `{"protocol": "Ethernet II", "src_mac": ..., "dst_mac": ..., "ether_type": ...}`
       - `layer_3_network`: `{"protocol": "IPv4" | "ARP" | "ICMP", "src_ip": ..., "dst_ip": ..., "ttl": ..., "flags": ...}`
       - `layer_4_transport`: `{"protocol": "TCP" | "UDP", "src_port": ..., "dst_port": ..., "tcp_flags": ..., "seq": ..., "ack": ...}`
       - `layer_7_application`: Decoded DNS qname, HTTP request line, or payload length summary.
     - `hex_dump`: Standard 16-byte offset hex + printable ASCII representation (`0000  45 00 00 3c ...  E..<...`).
3. **Wireshark `.pcap` Import & Export**:
   - Save every capture session using `scapy.utils.wrpcap("backend/captures/<session_id>.pcap", packets)`.
   - Expose `GET /api/v1/packets/sessions/{id}/download` returning `application/vnd.tcpdump.pcap` so clicking **"Open in Wireshark (.pcap)"** downloads a genuine `.pcap` file.
   - Expose `POST /api/v1/packets/upload` accepting `.pcap` or `.pcapng` files, parsing them via `scapy.utils.rdpcap()`, and returning packet list + protocol distribution statistics.

## Verification Steps
1. Generate a sample `.pcap` file with ARP, ICMP, DNS, and TCP 3-way handshake packets using `scapy.utils.wrpcap`, then parse it with `rdpcap` and verify all 4 OSI layers dissect cleanly.

