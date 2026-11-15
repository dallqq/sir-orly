# 03 — Step-by-Step Implementation Plan & Master Checklist

> **How to Use This Checklist:**  
> Each phase below is mapped to a specialized **Antigravity Agentic Skill** located in `.agents/skills/<skill-name>/SKILL.md`. Before starting any phase, read the designated skill so the implementation follows the exact canonical models, API paths, edge-case fallbacks, and verification standards.

---

## Phase 0: Workspace Preparation & Submission Readiness
**Assigned Skill:** `netpulse-backend-core` & `noc-dashboard-ui`

- [x] **0.1** Analyze CCS 234 Final Project & ALA PDF specifications and map all 5 Core Features + all 8 Bonus Features.
- [x] **0.2** Create `implementation-plan/` architecture and step-by-step documentation suite.
- [x] **0.3** Scaffold `.agents/skills/` workspace skills for agentic development across all modules.
- [x] **0.4** Configure root `.gitignore` to exclude Python virtual environments (`backend/.venv/`), SQLite runtime databases (`*.db`, `*.db-wal`, `*.db-shm`), and temporary packet captures while keeping `backend/captures/demo_lan_traffic.pcap`.
- [x] **0.5** Create root launcher scripts (`start-netpulse.ps1` and `README.txt` per PDF Section 4/6 submission requirements) to launch the Python FastAPI server (`port 8000`), Next.js Web NOC frontend (`port 3000`), and optional Native Python Tkinter GUI (`backend/tkinter_gui.py`).

---

## Phase 1: Python FastAPI Backend Core, Hybrid Database & Tkinter Companion
**Assigned Skill:** [`.agents/skills/netpulse-backend-core/SKILL.md`](../.agents/skills/netpulse-backend-core/SKILL.md)

### 1.1 Python Environment & Dependencies (`backend/`)
- [x] **1.1.1** Create `backend/` directory structure (`backend/app/models`, `backend/app/services`, `backend/app/routers`, `backend/captures`, `backend/reports`, `backend/tests`) and initialize Python virtual environment (`python -m venv backend/.venv`).
- [x] **1.1.2** Create `backend/requirements.txt` with pinned packages:
  - `fastapi>=0.115.0`
  - `uvicorn[standard]>=0.32.0`
  - `sqlmodel>=0.0.22`
  - `psycopg2-binary>=2.9.9` (for Cloud PostgreSQL / Supabase bonus support)
  - `psutil>=6.1.0`
  - `scapy>=2.6.1`
  - `icmplib>=3.0.4`
  - `mac-vendor-lookup>=0.1.12`
  - `reportlab>=4.2.5`
  - `aiosmtplib>=3.0.2`
  - `python-multipart>=0.0.17`
  - `pydantic-settings>=2.6.0`
  - `pytest>=8.3.0`, `pytest-asyncio>=0.24.0`, `httpx>=0.27.0`
- [x] **1.1.3** Install dependencies inside `backend/.venv` and verify imports.

### 1.2 Hybrid Database Configuration & Canonical SQLModel Schemas (`backend/app/models/`)
- [x] **1.2.1** Implement `backend/app/config.py` using `pydantic-settings` with defaults for `DATABASE_URL="sqlite:///./netpulse.db"`, optional `CLOUD_DATABASE_URL` (PostgreSQL/Supabase), and SMTP settings.
- [x] **1.2.2** Implement `backend/app/database.py` supporting both **Local SQLite** (`check_same_thread=False` + `PRAGMA journal_mode=WAL;`) and **Cloud PostgreSQL** (`pool_pre_ping=True`), plus a runtime connection status helper for the Cloud Database Bonus UI.
- [x] **1.2.3** Define `ScanSession` and `DiscoveredDevice` models in `backend/app/models/device.py` matching the canonical schema in `01-TECH-STACK-AND-ARCHITECTURE.md`.
- [x] **1.2.4** Define `PingSample`, `HostQoSStats`, and `PortScanResult` models in `backend/app/models/telemetry.py`.
- [x] **1.2.5** Define `PcapCaptureSession` and packet dissection schemas in `backend/app/models/packet.py`.
- [x] **1.2.6** Define `SecurityAlert`, `DiagnosticReport`, and `EmailAlertLog` models in `backend/app/models/security.py`.

### 1.3 FastAPI App Factory & Unified WebSocket Hub (`/ws/monitor`)
- [x] **1.3.1** Implement `backend/app/services/ws_manager.py` to manage active WebSocket connections, broadcast structured events (`telemetry_tick`, `scan_progress`, `ping_reply`, `packet_captured`, `security_alert`), and run a background real-time monitoring loop (streaming `psutil.net_io_counters()` bandwidth and active host pings every 2 seconds).
- [x] **1.3.2** Implement `backend/app/main.py` with CORS configured, `/api/v1/health`, `/api/v1/system/database-mode`, lifespan startup hook (creating DB tables and seeding `demo_lan_traffic.pcap`), and `/ws/monitor` WebSocket endpoint.

---

## Phase 2: Feature 1 — Multi-Scenario Network Discovery & Subnet Engine
**Assigned Skill:** [`.agents/skills/network-discovery-and-arp/SKILL.md`](../.agents/skills/network-discovery-and-arp/SKILL.md)

### 2.1 Smart NIC Scorer, Local IP & CIDR Detection (`interface_detector.py`)
- [x] **2.1.1** Implement `get_network_interfaces()` using `psutil.net_if_addrs()`, `psutil.net_if_stats()`, and `socket.AF_INET` with **Smart Adapter Scoring**:
  - Prioritize active physical `Wi-Fi` / `Ethernet` interfaces with valid RFC1918 IPv4 addresses (`192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`).
  - Deprioritize virtual/tunnel adapters (`vEthernet`, `WSL`, `Docker`, `VMware`, `VirtualBox`, `Tailscale`, `Radmin`, `Loopback`, and `169.254.x.x` APIPA).
  - Support manual interface selection (`interface_name` query parameter) so the user can switch NICs in the UI.
- [x] **2.1.2** Compute CIDR network range via `ipaddress.IPv4Network(f"{ip}/{netmask}", strict=False)` with **Large Subnet Safety Slicing**:
  - If the detected prefix is larger than `/24` (e.g., `/16` or `/8` university network), report both the true NIC CIDR and the safe `/24` active neighborhood scan range (`254` usable hosts) so scans always complete in `< 8 seconds`.
- [x] **2.1.3** Detect the Default Gateway IP via Windows routing table (`route print 0.0.0.0` / `netstat -rn`) with `.1` fallback.

### 2.2 Offline OUI Lookup & Multi-Layer Active Device Scanner (`oui_lookup.py` & `network_scanner.py`)
- [x] **2.2.1** Implement `backend/app/services/oui_lookup.py` with a comprehensive embedded dictionary of common IEEE MAC OUI prefixes (Apple, Intel, Cisco, TP-Link, Realtek, Samsung, Dell, HP, ASUS, Xiaomi, Huawei, Espressif, Raspberry Pi, VMware, Microsoft, etc.) + `mac_vendor_lookup` fallback so vendor resolution works **100% offline**.
- [x] **2.2.2** Implement **Multi-Tier Active Host Discovery** (`network_scanner.py`):
  1. **Tier 1 — Layer 2 Scapy ARP Broadcast Sweep** (`srp(Ether(dst="ff:ff:ff:ff:ff:ff")/ARP(pdst=cidr), timeout=1.5)`), wrapped in `try/except` so missing Npcap/Admin rights never crash.
  2. **Tier 2 — Layer 3 Concurrent Ping Sweep + Layer 4 TCP Quick Probe**: Concurrently probes usable hosts via `icmplib` / native `ping -n 1 -w 350` AND checks common TCP ports (`80, 443, 135, 445, 22`) so Windows Firewall hosts that block ICMP are still discovered!
  3. **Tier 3 — OS ARP Cache Table Harvest (`arp -a`)**: Parses the OS ARP cache to enrich hardware MAC addresses (`00:1A:2B:3C:4D:5E`) and catch silent neighbors.
  4. **Tier 4 — Campus Lab Simulation Mode (`scan_mode="simulation"`)**: Seeds realistic enterprise subnet devices (Gateway Router, Core Switch, Web Server, File Server, Legacy Telnet IoT Camera, Workstations) for offline or AP-isolated demonstrations.
- [x] **2.2.3** Enrich discovered hosts with async Reverse DNS (`socket.gethostbyaddr` with `1.0s` timeout), MAC Vendor, OS heuristic guess, and initial ping RTT, then expose `GET /api/v1/discovery/interfaces`, `POST /api/v1/discovery/scan`, and `GET /api/v1/discovery/devices`.

---

## Phase 3: Features 2 & 3 (+ Bonus) — 3-Tier Ping Engine, Network Statistics & Port Scanner
**Assigned Skill:** [`.agents/skills/connectivity-and-stats-engine/SKILL.md`](../.agents/skills/connectivity-and-stats-engine/SKILL.md)

### 3.1 3-Tier Connectivity Testing Engine (`ping_engine.py` — *Feature 2*)
- [x] **3.1.1** Implement `ping_host()` and `ping_multiple_hosts()` supporting configurable `count` (default `4`), `timeout_ms` (`1500`), `packet_size` (`32`), and `protocol` (`auto`, `icmp`, `tcp`):
  - **Tier 1**: `icmplib.async_ping(..., privileged=False)` (or `privileged=True` if available).
  - **Tier 2**: Windows/POSIX native `ping` subprocess parser supporting both `time=12ms` and sub-millisecond `time<1ms` (`0.5ms`) and extracting `TTL=`.
  - **Tier 3**: **TCP Handshake Ping (`TCP-PING`)** timing `asyncio.open_connection` on ports `80/443/135/445/22` when ICMP Echo is filtered by a host firewall.
- [x] **3.1.2** Broadcast each sequence reply over `/ws/monitor` (`event_type="ping_reply"`) for real-time terminal streaming.

### 3.2 Feature 3: Network Statistics Aggregation (`ping_engine.py`)
- [x] **3.2.1** Compute and persist exact QoS metrics in `HostQoSStats` for every tested host (handling `100%` packet loss gracefully with `0.0` latency values and zero division errors):
  - `hostname`, `ip_address`, `min_latency_ms`, `avg_latency_ms`, `max_latency_ms`, `jitter_ms`, `packet_loss_pct`, `packets_sent`, `packets_received`, `last_ttl`, `ping_method`.

### 3.3 Bonus Feature: Async Socket Port Scanner (`port_scanner.py`)
- [x] **3.3.1** Implement async TCP Connect & UDP probe scanner using Python `socket` / `asyncio.open_connection` bounded by `asyncio.Semaphore(100)` with a `0.75s` timeout.
- [x] **3.3.2** Implement safe Service Banner Grabbing (HTTP `Server:` header extraction, SSH/FTP/SMTP/Telnet greeting capture) and map every port to its **Service Name**, **OSI Layer (`Layer 4 TCP` / `Layer 7 Application`)**, and **Risk Level** (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
- [x] **3.3.3** Expose `POST /api/v1/connectivity/ping`, `GET /api/v1/connectivity/stats`, `POST /api/v1/connectivity/ports/scan`, and `GET /api/v1/connectivity/ports/{ip}`.

---

## Phase 4: Course Topic 7 & Bonus — Wireshark Traffic Analysis & `.pcap` Engine
**Assigned Skill:** [`.agents/skills/wireshark-pcap-analyzer/SKILL.md`](../.agents/skills/wireshark-pcap-analyzer/SKILL.md)

### 4.1 Live Sniffer, Active Socket Synthesizer Fallback & `.pcap` Engine (`packet_analyzer.py`)
- [x] **4.1.1** Implement BPF filter validator and live packet capture via `scapy.all.sniff(filter=bpf_filter, count=limit, timeout=timeout)`.
- [x] **4.1.2** Implement **Automatic Live Socket Packet Synthesizer Fallback**:
  - If `scapy.sniff` fails because Npcap is not installed or permissions are restricted, inspect real active network connections on the machine via `psutil.net_connections(kind="inet")` + ARP cache and construct genuine Scapy `Ether()/IP()/TCP()`, `UDP()`, `ICMP()`, and `ARP()` frames reflecting actual live system traffic so capture and `.pcap` export work in **100% of environments**!
- [x] **4.1.3** Implement full **OSI Layer 2, 3, 4, and 7 Dissector** + **16-Byte Hex/ASCII Dump** formatter.
- [x] **4.1.4** Implement `.pcap` export (`scapy.utils.wrpcap`), `.pcap` upload parser (`scapy.utils.rdpcap`), bundled `demo_lan_traffic.pcap` generator on startup, and optional **"Launch in Wireshark Desktop"** helper (`C:\Program Files\Wireshark\Wireshark.exe`).
- [x] **4.1.5** Expose `/api/v1/packets/capture`, `/api/v1/packets/upload`, `/api/v1/packets/sessions`, `/api/v1/packets/sessions/{id}`, `/api/v1/packets/sessions/{id}/download`, and `/api/v1/packets/sessions/{id}/open-wireshark`.

---

## Phase 5: Features 4 & 5 (+ Bonus) — Security Advisor, ReportLab PDF & Email Alerts
**Assigned Skill:** [`.agents/skills/security-advisor-and-reports/SKILL.md`](../.agents/skills/security-advisor-and-reports/SKILL.md)

### 5.1 Feature 5: 4-Category Security Recommendations Engine (`security_advisor.py`)
- [x] **5.1.1** Implement deterministic diagnostic rules guaranteeing coverage of all 4 PDF-mandated categories:
  1. **`CONNECTIVITY` (Weak Connectivity Alerts)**: High latency (`> 80ms`), jitter (`> 25ms`), or partial packet loss (`> 0%`), plus healthy baseline verification if all links are optimal.
  2. **`AVAILABILITY` (Unreachable Hosts)**: Offline devices (`is_online == False`) or `100%` ping packet loss.
  3. **`FIREWALL` (Basic Firewall Recommendations)**: Critical/High open port alerts (`21/FTP`, `23/Telnet`, `135/RPC`, `139/NetBIOS`, `445/SMB`, `3389/RDP`, `3306/MySQL`, `80/HTTP`) with exact Windows `netsh advfirewall` & Linux `ufw` lockdown commands + baseline firewall rule recommendations.
  4. **`AUTHENTICATION` (Password Security Reminders)**: Router gateway (`is_gateway`), web admin panels, and SSH/RDP credential hygiene reminders (default password rotation, WPA3/WPA2-AES, MFA).
- [x] **5.1.2** Calculate overall **Network Security & Health Score (`0–100`)** and letter grade (`A–F`).

### 5.2 Feature 4 & Bonus: Diagnostic Report & ReportLab PDF Generator (`report_generator.py`)
- [x] **5.2.1** Generate comprehensive `DiagnosticReport` snapshots containing Date & Time, Active Interface & CIDR Range, Executive Network Performance Summary, Detected Devices Inventory, Ping Results & QoS Statistics, and Security Recommendations.
- [x] **5.2.2** Build multi-page styled PDF files using **`ReportLab` (`SimpleDocTemplate`, `Table`, `TableStyle`, `Paragraph`)** with WVSU CICT / NetPulse NOC branding headers, summary cards, and color-coded status tables.
- [x] **5.2.3** Expose `POST /api/v1/reports/generate`, `GET /api/v1/reports`, `GET /api/v1/reports/{id}`, `GET /api/v1/reports/{id}/pdf`, and `GET /api/v1/reports/{id}/csv`.

### 5.3 Bonus Feature: Email Alert Notification Service & Local Outbox (`email_notifier.py`)
- [x] **5.3.1** Implement async SMTP dispatcher (`aiosmtplib`) for real email delivery when SMTP credentials are provided, AND automatically record every alert email in `EmailAlertLog` (Local Outbox Preview) so email notifications can be inspected and verified live offline.
- [x] **5.3.2** Expose `POST /api/v1/security/evaluate`, `GET /api/v1/security/recommendations`, `POST /api/v1/security/alerts/email`, and `GET /api/v1/security/alerts/outbox`.

### 5.4 Bonus Feature 1: Native Python Tkinter Companion GUI (`backend/tkinter_gui.py`)
- [x] **5.4.1** Implement `backend/tkinter_gui.py` using Python's built-in `tkinter` and `ttk` styled in the Cyber-NOC dark theme (`#090D16` / `#0F172A` / `#06B6D4`), allowing standalone or API-synced execution of Network Discovery, Ping & Statistics, Port Scanning, PDF Report generation, and a 1-click button to open the Next.js Web NOC Dashboard (`http://localhost:3000`).

---

## Phase 6: Next.js 16 NOC Dashboard Shell & Real-Time Telemetry Store
**Assigned Skill:** [`.agents/skills/noc-dashboard-ui/SKILL.md`](../.agents/skills/noc-dashboard-ui/SKILL.md)

- [x] **6.1** Read `node_modules/next/dist/docs/` per `AGENTS.md` to ensure full compliance with Next.js 16.4 conventions.
- [x] **6.2** Configure frontend telemetry charts, interactive topology canvas, and state architecture.
- [x] **6.3** Configure `src/app/globals.css` with Cyber-NOC Obsidian dark theme variables and offline-safe monospace typography (`tabular-nums`).
- [x] **6.4** Implement `src/lib/api.ts` (typed REST client covering all canonical `/api/v1/*` endpoints) and `src/store/useNetPulseStore.ts` + `src/hooks/useTelemetrySocket.ts` (connecting to `ws://localhost:8000/ws/monitor`).
- [x] **6.5** Build the `shadcn-admin`-inspired App Shell (`src/components/layout/AppShell.tsx`, `Sidebar`, `TopStatusBar` with live NIC switcher, `Quick Scan` button, `Seed Lab` button, and system status indicators).

---

## Phase 7: Implementing All 6 NOC Dashboard Pages in Next.js
**Assigned Skill:** [`.agents/skills/noc-dashboard-ui/SKILL.md`](../.agents/skills/noc-dashboard-ui/SKILL.md)

- [x] **7.1 Overview Dashboard (`src/app/page.tsx`)**:
  - 4 KPI Cards (Local IP/CIDR, Active Devices, Avg/Max Latency & Loss, Security Score).
  - Real-time Latency & Jitter Area Chart + Live NIC Bandwidth Throughput Chart.
  - Active Devices table with 1-click `Ping` / `Scan Ports` actions + Security Recommendations feed.
- [x] **7.2 Network Discovery & Topology Page (`src/app/discovery/page.tsx`)**:
  - Local IP, Subnet Mask, Gateway & CIDR Range Banner (`Feature 1`).
  - Scan Mode Toolbar (`Hybrid Auto`, `ARP L2`, `ICMP L3`, `Campus Simulation`) + Live Progress Bar.
  - Sortable/Filterable Device Inventory Table + Interactive Subnet Topology Graph.
- [x] **7.3 Connectivity Testing, Statistics & Port Scanner Page (`src/app/connectivity/page.tsx`)**:
  - Supports URL query params (`?target=IP&tab=ports`) for instant cross-page workflows.
  - Multi-host Ping Tester + Live scrolling Ping Terminal (`Feature 2`).
  - **Network Statistics Table (`Feature 3`)**: Displays `Hostname`, `IP Address`, `Min Latency`, `Average Latency`, `Maximum Latency`, `Jitter`, and `Packet Loss %` + Latency Comparison Bar Chart.
  - **Async Socket Port Scanner Tab (`Bonus`)**: Scan ports, view open TCP/UDP services, grabbed banners, OSI Layer 4/7 badges, and risk levels.
- [x] **7.4 Wireshark Packet Analyzer Page (`src/app/packets/page.tsx`)**:
  - Live Capture Controls with BPF filter chips, `.pcap` upload, **`Download .pcap for Wireshark`**, and **`Launch in Wireshark Desktop`** button.
  - Wireshark 3-Pane Inspector (Color-coded Packet Table + Collapsible OSI Layer 2/3/4/7 Dissection Tree + 16-byte Hex/ASCII Viewer) + Protocol Distribution breakdown.
- [x] **7.5 Security Advisor, Email Alerts & Cloud DB Page (`src/app/security/page.tsx`)**:
  - Security Posture Score Card & Category Filter (`All`, `Weak Connectivity`, `Unreachable Hosts`, `Firewall Rules`, `Password Reminders`).
  - Actionable Recommendation Cards with copyable remediation commands.
  - **Email Notification & Local Outbox Panel (`Bonus`)** + **Database Storage Mode Panel (`SQLite WAL` / `Cloud PostgreSQL` Bonus)**.
- [x] **7.6 Diagnostic Report Generator Page (`src/app/reports/page.tsx`)**:
  - One-click `Generate Full Diagnostic Report` button (`Feature 4`).
  - Interactive on-screen report viewer showing Date/Time, Detected Devices, Ping Results, Network Performance Summary, and Security Recommendations.
  - **`Download Official PDF Report`**, **`Export CSV`**, and **`Export JSON`** buttons.

---

## Phase 8: Quality Assurance, Automated Testing & Rubric Verification
**Assigned Skill:** [`.agents/skills/network-qa-and-verification/SKILL.md`](../.agents/skills/network-qa-and-verification/SKILL.md)

- [x] **8.1** Build backend `pytest` suite (`backend/tests/`) covering:
  - Interface detection, virtual NIC filtering, and CIDR calculation (`test_interface_detector.py`).
  - Host discovery, offline OUI vendor lookup, and simulation mode (`test_network_scanner.py`).
  - 3-tier Ping engine against `127.0.0.1` and unreachable IPs, verifying `min`, `avg`, `max`, `jitter`, and `packet_loss_pct` math (`test_ping_engine.py`).
  - Async TCP socket port scanner against a local ephemeral test socket (`test_port_scanner.py`).
  - `.pcap` generation, upload parsing, and OSI Layer 2–7 dissection (`test_packet_analyzer.py`).
  - Security Recommendation rule triggers across all 4 required PDF categories + Email Outbox (`test_security_advisor.py`).
  - Full diagnostic report generation and valid `%PDF-1.` byte output (`test_report_generator.py`).
- [x] **8.2** Implement `python backend/tkinter_gui.py --self-test`.
- [x] **8.3** Run Frontend TypeScript & Next.js production build check (`npm run build`).
- [x] **8.4** Verify `start-netpulse.ps1` and all CCS 234 Grading Rubric items.
