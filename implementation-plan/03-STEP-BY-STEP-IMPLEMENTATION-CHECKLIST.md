# 03 — Step-by-Step Implementation Plan & Master Checklist

> **How to Use This Checklist:**  
> Each phase below is mapped to a specialized **Antigravity Agentic Skill** located in `.agents/skills/<skill-name>/SKILL.md`. Before starting any phase, activate the designated skill so the agent follows the exact architectural, protocol, and verification standards.

---

## Phase 0: Workspace Preparation & Agentic Skills Initialization
**Assigned Skill:** `netpulse-backend-core` & `noc-dashboard-ui`

- [x] **0.1** Analyze CCS 234 Final Project & ALA PDF specifications and map all 5 Core Features + 8 Bonus Features.
- [x] **0.2** Create `implementation-plan/` architecture and step-by-step documentation suite.
- [x] **0.3** Scaffold `.agents/skills/` workspace skills for agentic development across all modules.
- [ ] **0.4** Configure root `.gitignore` to exclude Python virtual environments (`backend/.venv/`), SQLite runtime databases (`*.db`), and temporary packet captures (`backend/captures/*.pcap` except sample demo pcaps).
- [ ] **0.5** Create root helper scripts (`start-netpulse.ps1` and `package.json` concurrent scripts) to launch both the Python FastAPI server (`port 8000`) and Next.js frontend (`port 3000`) with a single command.

---

## Phase 1: Python FastAPI Backend Core & Hybrid Database Layer
**Assigned Skill:** [`.agents/skills/netpulse-backend-core/SKILL.md`](../.agents/skills/netpulse-backend-core/SKILL.md)

### 1.1 Python Environment & Dependencies (`backend/`)
- [ ] **1.1.1** Create `backend/` directory and initialize Python virtual environment (`python -m venv backend/.venv`).
- [ ] **1.1.2** Create `backend/requirements.txt` with pinned, production-grade packages:
  - `fastapi>=0.115.0`
  - `uvicorn[standard]>=0.32.0`
  - `sqlmodel>=0.0.22`
  - `psutil>=6.1.0`
  - `scapy>=2.6.1`
  - `icmplib>=3.0.4`
  - `mac-vendor-lookup>=0.1.12`
  - `reportlab>=4.2.5`
  - `aiosmtplib>=3.0.2`
  - `python-multipart>=0.0.17`
  - `pydantic-settings>=2.6.0`
  - `pytest>=8.3.0`, `pytest-asyncio>=0.24.0`, `httpx>=0.27.0`
- [ ] **1.1.3** Install dependencies inside `backend/.venv` and verify imports.

### 1.2 Database Configuration & SQLModel Schemas (`backend/app/models/`)
- [ ] **1.2.1** Implement `backend/app/config.py` using `pydantic-settings` with defaults for `DATABASE_URL="sqlite:///./netpulse.db"` (and optional PostgreSQL/Supabase URL override for the Cloud Database bonus feature).
- [ ] **1.2.2** Implement `backend/app/database.py` with SQLite `check_same_thread=False`, WAL mode pragma for high-concurrency telemetry writes, and automatic table creation on startup.
- [ ] **1.2.3** Define `ScanSession` and `DiscoveredDevice` models in `backend/app/models/device.py`:
  - `id`, `ip_address`, `mac_address`, `hostname`, `vendor`, `os_guess`, `interface_name`, `subnet_cidr`, `is_online`, `is_gateway`, `discovery_method` (`ARP` / `ICMP` / `TCP`), `first_seen`, `last_seen`.
- [ ] **1.2.4** Define `PingSample`, `HostQoSStats`, and `PortScanResult` models in `backend/app/models/telemetry.py`:
  - `ip_address`, `hostname`, `packets_sent`, `packets_received`, `packet_loss_pct`, `min_latency_ms`, `avg_latency_ms`, `max_latency_ms`, `jitter_ms`, `ttl`, `timestamp`.
  - `PortScanResult`: `ip_address`, `port`, `protocol` (`TCP`/`UDP`), `state` (`OPEN`/`CLOSED`/`FILTERED`), `service_name`, `banner`, `osi_layer` (`Layer 4 / Layer 7`), `risk_level`.
- [ ] **1.2.5** Define `SecurityAlert` and `DiagnosticReport` models in `backend/app/models/security.py`.

### 1.3 FastAPI App Factory & WebSocket Telemetry Manager
- [ ] **1.3.1** Implement `backend/app/services/ws_manager.py` to manage active WebSocket clients and broadcast JSON events (`telemetry_tick`, `scan_progress`, `ping_result`, `packet_captured`, `security_alert`).
- [ ] **1.3.2** Implement `backend/app/main.py` with CORS configured for `http://localhost:3000`, `/api/v1/health` endpoint, lifespan startup hook, and `/ws/monitor` WebSocket endpoint.

---

## Phase 2: Feature 1 — Network Discovery & Subnet Engine
**Assigned Skill:** [`.agents/skills/network-discovery-and-arp/SKILL.md`](../.agents/skills/network-discovery-and-arp/SKILL.md)

### 2.1 Local IP, NIC & Network Range Detection (`interface_detector.py`)
- [ ] **2.1.1** Implement `get_active_interfaces()` using `psutil.net_if_addrs()`, `psutil.net_if_stats()`, and `socket.AF_INET` to detect:
  - Active IPv4 Address (e.g., `192.168.1.105`)
  - Subnet Mask (e.g., `255.255.255.0`)
  - Calculated Network Range in CIDR notation via `ipaddress.IPv4Network(f"{ip}/{netmask}", strict=False)` (e.g., `192.168.1.0/24`)
  - Default Gateway IP (via routing table / `psutil` / `route print` parsing on Windows)
  - Local Hardware MAC Address (`AF_LINK`) and Link Speed (`Mbps`).
- [ ] **2.1.2** Determine the primary outward-facing interface automatically using a UDP socket connect probe (`socket.socket(socket.AF_INET, socket.SOCK_DGRAM)` connected to `8.8.8.8:80` without sending packets, fallback to first non-loopback UP interface).

### 2.2 Multi-Layer Active Device Scanner (`network_scanner.py`)
- [ ] **2.2.1** Implement **Method A — Layer 2 Scapy ARP Broadcast Sweep** (`srp(Ether(dst="ff:ff:ff:ff:ff:ff")/ARP(pdst=cidr), timeout=2)`):
  - Extracts responder IP and hardware MAC address directly from Layer 2 Ethernet/ARP frames.
- [ ] **2.2.2** Implement **Method B — Layer 3 Async ICMP + OS ARP Cache Fallback**:
  - Automatically runs if Npcap/Administrator privileges are unavailable or for hosts that ignore ARP broadcasts.
  - Sends concurrent async ICMP Echo probes across all usable host IPs in the CIDR subnet (`icmplib.async_multiping` or bounded `asyncio` ping pool), then reads the OS ARP table (`arp -a`) to enrich MAC addresses.
- [ ] **2.2.3** Implement **Hostname & Vendor Enrichment**:
  - Async reverse DNS lookup via `socket.gethostbyaddr(ip)` + NetBIOS/mDNS fallback with a strict `1.0s` timeout per host.
  - IEEE OUI MAC Vendor lookup (resolving MAC prefix to vendor name such as `Cisco`, `TP-Link`, `Apple`, `Intel`, `Realtek`).
- [ ] **2.2.4** Expose REST endpoints in `backend/app/routers/discovery.py`:
  - `GET /api/v1/discovery/interface` -> Returns current local IP, subnet mask, CIDR network range, gateway, and all NICs.
  - `POST /api/v1/discovery/scan` -> Triggers subnet discovery scan, persists results to `DiscoveredDevice`, emits progress over WebSocket, and returns the active device list.
  - `GET /api/v1/discovery/devices` -> Returns cached/persisted devices with latest status and latency.

---

## Phase 3: Features 2 & 3 (+ Bonus) — Connectivity Testing, Network Statistics & Port Scanner
**Assigned Skill:** [`.agents/skills/connectivity-and-stats-engine/SKILL.md`](../.agents/skills/connectivity-and-stats-engine/SKILL.md)

### 3.1 ICMP & TCP Connectivity Testing Engine (`ping_engine.py`)
- [ ] **3.1.1** Implement single-host and multi-host ping functions supporting configurable `count` (default `4`), `interval` (`0.5s`), `timeout` (`1.5s`), and `payload_size` (`32` bytes).
- [ ] **3.1.2** Implement dual-mode probing:
  - **Primary:** ICMP Echo Request (`icmplib.async_ping` or raw `socket.IPPROTO_ICMP`).
  - **Fallback:** TCP Socket Connect RTT timing (`asyncio.open_connection` on port `80`/`443`/`135`/`445`) when ICMP is blocked by Windows Firewall, clearly labeled as `TCP-PING`.
- [ ] **3.1.3** Stream each individual sequence reply (`seq`, `ip`, `bytes`, `rtt_ms`, `ttl`, `status`) over `/ws/monitor` for live terminal visualization.

### 3.2 Feature 3: Network Statistics Aggregation (`ping_engine.py`)
- [ ] **3.2.1** Compute and persist exact QoS metrics for every tested host:
  - **Hostname** (resolved or fallback to IP/Vendor tag)
  - **IP Address**
  - **Minimum Latency (`min_latency_ms`)**
  - **Average Latency (`avg_latency_ms`)**
  - **Maximum Latency (`max_latency_ms`)**
  - **Jitter (`jitter_ms`)** — mean absolute deviation of consecutive RTT samples
  - **Packet Loss Percentage (`packet_loss_pct`)** — `((sent - received) / sent) * 100`
- [ ] **3.2.2** Implement continuous background monitoring loop (`ws_manager.py`) that pings all pinned/discovered devices every `N` seconds and updates rolling time-series windows for live dashboard charts.

### 3.3 Bonus Feature: Async Socket Port Scanner (`port_scanner.py`)
- [ ] **3.3.1** Implement async TCP Connect scanner using Python `socket` / `asyncio.open_connection` with a bounded `asyncio.Semaphore(100)` so scanning 1,000 ports completes in `< 3 seconds`.
- [ ] **3.3.2** Implement lightweight Service Banner Grabbing (sending safe probe bytes or reading initial greeting on open ports like `21`, `22`, `23`, `25`, `80`, `3306`, `8080`).
- [ ] **3.3.3** Map every scanned port to its **Standard Service Name**, **OSI Layer (`Layer 4 TCP` / `Layer 7 App`)**, and **Security Risk Level** (e.g., `23/Telnet` = `CRITICAL`, `21/FTP` = `HIGH`, `445/SMB` = `HIGH`, `80/HTTP` = `MEDIUM`, `443/HTTPS` = `LOW`).
- [ ] **3.3.4** Expose REST endpoints in `backend/app/routers/connectivity.py`:
  - `POST /api/v1/connectivity/ping` -> Ping selected device(s) and return full per-packet + aggregate statistics.
  - `GET /api/v1/connectivity/stats` -> Return Feature 3 Network Statistics table for all monitored hosts.
  - `POST /api/v1/connectivity/port-scan` -> Run socket port scan on target IP and persist findings.

---

## Phase 4: Course Topic 7 & Bonus — Wireshark Traffic Analysis & `.pcap` Engine
**Assigned Skill:** [`.agents/skills/wireshark-pcap-analyzer/SKILL.md`](../.agents/skills/wireshark-pcap-analyzer/SKILL.md)

### 4.1 Live Packet Sniffer & Synthetic/Socket Fallback (`packet_analyzer.py`)
- [ ] **4.1.1** Implement live packet capture using `scapy.all.sniff(iface=..., filter=bpf_filter, count=max_packets, timeout=duration)` running in a background worker thread.
- [ ] **4.1.2** Extract structured OSI/TCP-IP layer details for each packet:
  - Timestamp, Frame Length, Protocol (`ARP`, `ICMP`, `TCP`, `UDP`, `DNS`, `HTTP`, `TLS`)
  - **Layer 2 (Data Link)**: Source MAC, Destination MAC, EtherType
  - **Layer 3 (Network)**: Source IP, Destination IP, TTL, IPv4 Protocol ID
  - **Layer 4 (Transport)**: Source Port, Destination Port, TCP Flags (`SYN`, `ACK`, `FIN`, `RST`, `PSH`), Sequence/Ack numbers, or UDP length
  - **Hex & ASCII Dump**: First 256 bytes formatted in standard 16-byte Wireshark rows.
- [ ] **4.1.3** Implement **Wireshark `.pcap` File Export & Upload**:
  - Save captured packets to `backend/captures/capture_<timestamp>.pcap` via `scapy.utils.wrpcap()` so the user can click **"Download .pcap for Wireshark"** and open it directly in the Wireshark desktop app!
  - Allow uploading any existing `.pcap` file recorded in Wireshark (`scapy.utils.rdpcap()`) to analyze its protocol breakdown, top talkers, and packet list inside NetPulse NOC.
- [ ] **4.1.4** Include a bundled sample `demo_lan_traffic.pcap` in `backend/captures/` so the Wireshark inspector can be demonstrated immediately even on restricted networks.

---

## Phase 5: Features 4 & 5 (+ Bonus) — Security Recommendations, PDF Reports & Email Alerts
**Assigned Skill:** [`.agents/skills/security-advisor-and-reports/SKILL.md`](../.agents/skills/security-advisor-and-reports/SKILL.md)

### 5.1 Feature 5: Automated Security Recommendations Engine (`security_advisor.py`)
- [ ] **5.1.1** Implement deterministic diagnostic rules covering all required PDF categories plus port exposure analysis:
  1. **Weak Connectivity Alerts (`CATEGORY: CONNECTIVITY`)**:
     - Trigger when `avg_latency_ms > 100ms`, `max_latency_ms > 250ms`, `jitter_ms > 30ms`, or `0% < packet_loss_pct < 100%`.
     - Output actionable recommendation (check Wi-Fi RSSI/channel congestion, inspect Ethernet cable/duplex settings, apply QoS traffic shaping).
  2. **Unreachable Hosts Alerts (`CATEGORY: AVAILABILITY`)**:
     - Trigger when a discovered or monitored host has `packet_loss_pct == 100%` or transitions from `ONLINE` to `OFFLINE`.
     - Output troubleshooting steps (verify power/NIC link state, check VLAN/subnet mask mismatch, check local host ICMP firewall rule).
  3. **Basic Firewall Recommendations (`CATEGORY: FIREWALL`)**:
     - Trigger based on open ports discovered per host:
       - Unencrypted legacy services (`21/FTP`, `23/Telnet`) -> **CRITICAL**: Block immediately on perimeter/host firewall; replace with SFTP/SSH.
       - Lateral movement / administrative ports (`445/SMB`, `135/RPC`, `3389/RDP`, `5900/VNC`) exposed to LAN -> **HIGH**: Restrict via Windows Defender Firewall / `iptables` to trusted admin IPs only.
       - Excessive open ports (`> 5` listening services on a client workstation) -> **MEDIUM**: Enforce least-privilege port filtering.
       - Default baseline firewall advisory when no port scan has been run yet.
  4. **Password & Authentication Security Reminders (`CATEGORY: AUTHENTICATION`)**:
     - Trigger for gateway routers (`is_gateway == True`), web admin interfaces (`80`, `443`, `8080`, `8443`), SSH (`22`), and databases (`3306`, `5432`).
     - Output reminders to rotate default router/IoT admin credentials, enforce WPA3/WPA2-AES Wi-Fi passphrases, disable cleartext HTTP basic auth, and enable MFA/SSH key-based authentication.
- [ ] **5.1.2** Compute an overall **Network Security & Health Score (`0–100`)** with letter grade (`A` through `F`).

### 5.2 Feature 4 & Bonus: Diagnostic Report Generator & PDF Exporter (`report_generator.py`)
- [ ] **5.2.1** Aggregate a complete snapshot containing:
  - Generation Date & Time (ISO-8601 + local formatted timestamp)
  - Active Network Interface, Local IP, and CIDR Network Range
  - Executive Network Performance Summary (Total Hosts, Online/Offline, Subnet Avg/Max Latency, Overall Packet Loss %, Health & Security Score)
  - Full Discovered Devices Inventory Table
  - Full Connectivity & Ping Statistics Table (Hostname, IP, Min/Avg/Max Latency, Packet Loss %)
  - Open Ports Summary & Prioritized Security Recommendations.
- [ ] **5.2.2** Implement `generate_pdf_report(report_id)` using **`ReportLab` (`platypus.SimpleDocTemplate`, `Table`, `Paragraph`)** to output a publication-grade, multi-page PDF document withWVSU CICT / NetPulse NOC branding headers, color-coded status tables, and diagnostic conclusions.
- [ ] **5.2.3** Implement CSV and JSON report download endpoints alongside PDF.

### 5.3 Bonus Feature: Email Alert Notification Service (`email_notifier.py`)
- [ ] **5.3.1** Implement async SMTP email sender (`aiosmtplib`) with HTML email templates for:
  -Critical Host Unreachable Alert
  - High Packet Loss / Latency Threshold Breach
  - Critical Open Port / Security Recommendation Summary
- [ ] **5.3.2** Provide a "Dry-Run / Local Preview & Log Mode" when SMTP credentials are not configured so the feature can be safely tested and verified offline during live grading.

---

## Phase 6: Next.js NOC Dashboard Shell & Shared Telemetry Components
**Assigned Skill:** [`.agents/skills/noc-dashboard-ui/SKILL.md`](../.agents/skills/noc-dashboard-ui/SKILL.md)

- [ ] **6.1** Install frontend dependencies in root `package.json`:
  - `lucide-react`, `recharts`, `@xyflow/react`, `@tanstack/react-query`, `@tanstack/react-table`, `zustand`, `clsx`, `tailwind-merge`, `class-variance-authority`, `sonner`, `radix-ui` primitives (via `shadcn` CLI).
- [ ] **6.2** Configure `src/app/globals.css` with the **Cyber-NOC Obsidian** dark theme tokens (`#090D16` background, `#0F172A` card surfaces, `#06B6D4` cyan primary, emerald/amber/rose status indicators) and `Geist Mono` tabular numerals.
- [ ] **6.3** Build the `shadcn-admin`-inspired App Shell (`src/components/layout/`):
  - `AppSidebar.tsx` with navigation links (`Overview`, `Discovery & Topology`, `Connectivity & Ports`, `Wireshark Packets`, `Security Advisor`, `Diagnostic Reports`).
  - `TopStatusBar.tsx` displaying live Local IP, CIDR range badge, WebSocket connection pulse (`LIVE`), and a one-click `Quick Subnet Scan` button.
- [ ] **6.4** Implement `src/lib/api.ts` (typed REST client for `http://localhost:8000/api/v1`) and `src/hooks/useTelemetrySocket.ts` (auto-reconnecting WebSocket hook updating the Zustand store).

---

## Phase 7: Implementing All 6 Feature Pages in Next.js
**Assigned Skill:** [`.agents/skills/noc-dashboard-ui/SKILL.md`](../.agents/skills/noc-dashboard-ui/SKILL.md)

- [ ] **7.1 Overview Dashboard (`src/app/page.tsx`)**:
  - 4 KPI Cards (Local IP/CIDR, Active Devices, Avg/Max Latency & Loss, Security Score).
  - Real-time multi-host Latency Area Chart + Bandwidth TX/RX Chart (`Recharts`).
  - Active Devices mini-table + top Security Recommendations preview.
- [ ] **7.2 Network Discovery & Topology Page (`src/app/discovery/page.tsx`)**:
  - Local Interface & CIDR Subnet Banner (`Feature 1`).
  - Subnet Scanner Controls + live progress indicator.
  - Sortable/Filterable Active Devices DataTable (`IP`, `MAC`, `Hostname`, `Vendor`, `Method`, `Status`, `Quick Actions`).
  - Interactive `@xyflow/react` Network Topology Map with Gateway at center and color-coded host nodes.
- [ ] **7.3 Connectivity Testing, Statistics & Port Scanner Page (`src/app/connectivity/page.tsx`)**:
  - Multi-host Ping Selector & Configuration (`Feature 2`).
  - Live ICMP/TCP Ping Console showing real-time sequence replies, RTT, and packet loss %.
  - **Network Statistics Table (`Feature 3`)**: Displays `Hostname`, `IP Address`, `Min Latency`, `Average Latency`, `Maximum Latency`, `Jitter`, and `Packet Loss %` with visual health bars.
  - **Integrated Port Scanner Tab (`Bonus`)**: Scan target IP ports, view open TCP/UDP ports, grabbed banners, and OSI Layer tags.
- [ ] **7.4 Wireshark Packet Analyzer Page (`src/app/packets/page.tsx`)**:
  - Live Sniffer Controls (BPF filter presets: `All`, `ARP`, `ICMP`, `TCP`, `UDP`, `DNS`, `HTTP`), `.pcap` upload, and **`Download .pcap for Wireshark`** button.
  - Wireshark 3-Pane Inspector (Color-coded Packet Table + Collapsible OSI Layer 2/3/4/7 Tree + Hex/ASCII Byte Viewer) + Protocol Distribution Chart.
- [ ] **7.5 Security Recommendations & Email Alerts Page (`src/app/security/page.tsx`)**:
  - Security Posture Score Card & Category Filter (`Weak Connectivity`, `Unreachable Hosts`, `Firewall Rules`, `Password Security`).
  - Detailed Recommendation Cards with Severity badge, affected host IP, technical explanation, and copyable remediation command.
  - Email Notification Settings & Test Alert modal (`Bonus`).
- [ ] **7.6 Diagnostic Report Generator Page (`src/app/reports/page.tsx`)**:
  - One-click `Generate Comprehensive Diagnostic Report` button (`Feature 4`).
  - Interactive on-screen report viewer showing Date/Time, Detected Devices, Ping Results, Network Performance Summary, and Security Recommendations.
  - **`Export to PDF`**, **`Export CSV`**, and **`Export JSON`** buttons.

---

## Phase 8: Quality Assurance, Automated Testing & Rubric Verification
**Assigned Skill:** [`.agents/skills/network-qa-and-verification/SKILL.md`](../.agents/skills/network-qa-and-verification/SKILL.md)

- [ ] **8.1** Run backend `pytest` suite (`backend/tests/`) covering:
  - Interface & CIDR calculation accuracy (`test_interface_detector.py`).
  - Loopback & LAN ping RTT/Packet Loss math (`test_ping_engine.py`).
  - Async TCP socket port scanner against a local ephemeral test socket (`test_port_scanner.py`).
  - `.pcap` generation and parsing round-trip (`test_packet_analyzer.py`).
  - Security Recommendation rule triggers for weak connectivity, unreachable hosts, firewall rules, and password reminders (`test_security_advisor.py`).
  - PDF report generation byte verification (`test_report_generator.py`).
- [ ] **8.2** Run Frontend TypeScript & Next.js production build check (`npm run build`).
- [ ] **8.3** Perform end-to-end live verification against the local network and verify every single line item in the CCS 234 Grading Rubric.

