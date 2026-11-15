---
name: connectivity-and-stats-engine
description: >-
  Use this skill when implementing Feature 2 (Connectivity Testing via Ping),
  Feature 3 (Network Statistics: Hostname, IP, Avg/Max/Min Latency, Jitter,
  Packet Loss %), and the Bonus Async TCP/UDP Socket Port Scanner (Phase 3).
---

# Connectivity, QoS Statistics & Socket Port Scanner Skill (`Phase 3 — Features 2, 3 & Bonus`)

## Overview
Implements **Feature 2 (Connectivity Testing)**, **Feature 3 (Network Statistics)**, and the **Bonus Port Scanner** using Python networking and raw/stream sockets.

## Implementation Rules
1. **Multi-Protocol Ping Engine (`backend/app/services/ping_engine.py`)**:
   - Support pinging one or multiple target IPs with configurable `count` (default `4`), `timeout_ms` (`1500`), and `packet_size` (`32`).
   - **Windows Non-Admin Compatibility**:
     - Use `icmplib.async_ping(ip, count=count, interval=0.3, timeout=1.5, privileged=False)` first.
     - If `icmplib` raises a socket permission error or all packets time out on a known-online host, support optional **TCP Connect Ping** (`asyncio.open_connection` timing the TCP 3-way handshake SYN -> SYN-ACK on port `80`, `443`, `135`, or `445`) or Windows native `ping -n 1 -l <size> -w <timeout> <ip>` parser so RTT (`time=12ms` or `time<1ms`) and `TTL=` are 100% accurate in every environment.
   - Broadcast each individual sequence reply over `/ws/monitor` (`event_type="ping_reply"`) for real-time UI feedback.
2. **Feature 3 Network Statistics Calculation**:
   - For every host tested, compute and persist to `HostQoSStats`:
     - `hostname`: Resolved hostname or fallback label
     - `ip_address`: Target IPv4
     - `min_latency_ms`: `round(min(rtts), 2)`
     - `avg_latency_ms`: `round(sum(rtts) / len(rtts), 2)`
     - `max_latency_ms`: `round(max(rtts), 2)`
     - `jitter_ms`: Mean absolute difference between consecutive RTT values (`sum(|rtt[i] - rtt[i-1]|) / (len(rtts)-1)`)
     - `packet_loss_pct`: `round(((sent - received) / sent) * 100, 1)`
3. **Bonus Async Socket Port Scanner (`backend/app/services/port_scanner.py`)**:
   - Use Python `socket` & `asyncio.open_connection(ip, port)` bounded by `asyncio.Semaphore(100)` with a `0.8s` connect timeout.
   - Include preset port lists: `QUICK_PORTS` (21, 22, 23, 25, 53, 80, 110, 135, 139, 143, 443, 445, 993, 995, 1433, 3306, 3389, 5432, 5900, 6379, 8000, 8080, 8443) and custom port ranges (`start_port` to `end_port`).
   - Grab service banners safely (e.g., send `b"HEAD / HTTP/1.0\r\n\r\n"` on HTTP ports or read initial 128 bytes on SSH/FTP/SMTP) and map each open port to its **OSI Layer** (`Layer 4 TCP` / `Layer 7 Application`) and **Risk Severity**.

## Verification Steps
1. Run `pytest backend/tests/test_ping_engine.py` against `127.0.0.1` and verify `packet_loss_pct == 0.0` and `avg_latency_ms >= 0`.
2. Run `pytest backend/tests/test_port_scanner.py` against a local test socket listener and verify open port detection and banner capture.

