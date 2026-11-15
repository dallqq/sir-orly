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
1. **3-Tier Multi-Protocol Ping Engine (`backend/app/services/ping_engine.py`)**:
   - Support pinging one or multiple target IPs with configurable `count` (default `4`), `timeout_ms` (`1500`), `packet_size` (`32`), and `protocol` (`auto` | `icmp` | `tcp`).
   - **Tier 1 (`icmplib`)**: Try `icmplib.async_ping(ip, count=1, timeout=timeout_s, payload_size=packet_size, privileged=False)` (or `privileged=True`).
   - **Tier 2 (`OS_PING` Subprocess Fallback)**: Run `ping -n 1 -l <size> -w <timeout_ms> <ip>` on Windows. Parse RTT with regex supporting both `time=12ms` / `time=12.4ms` AND sub-millisecond `time<1ms` (mapped to `0.5ms`), plus `TTL=(\d+)`.
   - **Tier 3 (`TCP_PING` Handshake Fallback)**: If ICMP times out or `protocol == "tcp"`, measure the high-resolution time (`time.perf_counter()`) to complete a TCP `SYN -> SYN-ACK` or `SYN -> RST` handshake on ports `80, 443, 135, 445, 22`.
   - Broadcast each individual sequence reply over `/ws/monitor` (`event_type="ping_reply"`) for real-time UI feedback.
2. **Feature 3 Network Statistics Calculation (`HostQoSStats`)**:
   - Guard against `len(rtts) == 0` (when `packet_loss_pct == 100.0`, set `min_latency_ms = 0.0`, `avg_latency_ms = 0.0`, `max_latency_ms = 0.0`, `jitter_ms = 0.0` without dividing by zero).
   - When `len(rtts) > 0`:
     - `min_latency_ms`: `round(min(rtts), 2)`
     - `avg_latency_ms`: `round(sum(rtts) / len(rtts), 2)`
     - `max_latency_ms`: `round(max(rtts), 2)`
     - `jitter_ms`: Mean absolute difference between consecutive RTT values (`round(sum(abs(rtts[i] - rtts[i-1]) for i in range(1, len(rtts))) / (len(rtts)-1), 2)` if `len(rtts) > 1` else `0.0`)
     - `packet_loss_pct`: `round(((sent - received) / sent) * 100, 1)`
3. **Bonus Async Socket Port Scanner (`backend/app/services/port_scanner.py`)**:
   - Use Python `socket` & `asyncio.open_connection(ip, port)` bounded by `asyncio.Semaphore(100)` with a `0.75s` connect timeout.
   - Include preset port lists: `QUICK_PORTS` (21, 22, 23, 25, 53, 80, 110, 135, 139, 143, 443, 445, 993, 995, 1433, 3306, 3389, 5432, 5900, 6379, 8000, 8080, 8443) and custom port ranges (`start_port` to `end_port`).
   - Grab service banners safely and map each open port to its **OSI Layer** (`Layer 4 (Transport) / Layer 7 (Application)`) and **Risk Severity** (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
4. **Canonical Endpoints (`routers/connectivity.py`)**:
   - `POST /api/v1/connectivity/ping`
   - `GET /api/v1/connectivity/stats`
   - `POST /api/v1/connectivity/ports/scan` (and alias `/api/v1/connectivity/port-scan`)
   - `GET /api/v1/connectivity/ports/{ip}`

## Verification Steps
1. Run `pytest backend/tests/test_ping_engine.py` against `127.0.0.1` and an unreachable IP (`192.0.2.1`) to verify both `0%` and `100%` packet loss math.
2. Run `pytest backend/tests/test_port_scanner.py` against a local test socket listener and verify open port detection and banner capture.
