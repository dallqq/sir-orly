# Network Monitoring & Performance Analysis System

> **Course:** CCS 234 — Communications and Networking (West Visayas State University — CICT)  
> **Final Project Codename:** `NetPulse NOC` (`sir-orly`)  
> **Architecture:** Pure Python Network Engine (`FastAPI` + `Sockets` + `Scapy`) + Next.js 16 Cyber-NOC Web Dashboard + Native Python Tkinter Desktop GUI

---

## Executive Overview

**NetPulse NOC** is an industry-grade, full-stack **Network Monitoring, Traffic Inspection, and Security Diagnostic Platform** engineered to satisfy 100% of the **CCS 234 Final Project** specifications and all 8 innovation bonus features.

Designed with an **offline-first and multi-environment architecture**, NetPulse NOC works out-of-the-box across varied conditions: home Wi-Fi networks, university computer laboratories with AP client isolation, mobile hotspots, and air-gapped offline environments without administrative privileges.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Dual User Interface Ecosystem                        │
├───────────────────────────────────────┬────────────────────────────────┤
│   Next.js 16 Cyber-NOC Web GUI       │   Native Python Tkinter GUI    │
│   (Port 3000 — Dark NOC Telemetry)    │   (backend/tkinter_gui.py)     │
└───────────────────▲───────────────────┴────────────────▲───────────────┘
                    │ REST / WebSockets                  │ In-Process
┌───────────────────┴────────────────────────────────────┴───────────────┐
│              Python FastAPI Networking Engine (Port 8000)               │
├────────────────────────────────────────────────────────────────────────┤
│ • Layer 2 ARP Broadcast Sweep (Scapy) & Layer 3/4 Fallback Probing     │
│ • 3-Tier Multi-Protocol Ping Engine (Raw ICMP · OS Ping · TCP-Ping)    │
│ • Async TCP/UDP Socket Port Scanner & Service Banner Grabbing          │
│ • Wireshark Traffic Sniffer, 3-Pane OSI Dissector & .pcap Engine       │
│ • 4-Category Deterministic Security & Connectivity Rule Engine         │
│ • Pure-Python ReportLab PDF, CSV & JSON Diagnostic Report Generator    │
│ • Asynchronous SMTP Email Alerts with Local Outbox Demo Preview        │
│ • Hybrid Database Engine: Local SQLite WAL & Cloud PostgreSQL Sync     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Feature Traceability Matrix

Every feature is fully implemented and mapped to the CCS 234 syllabus and grading rubric:

### Core Requirements (100% Implemented)

| Feature | PDF Specification | Technical Implementation |
| :--- | :--- | :--- |
| **Feature 1: Network Discovery** | • Detect local IP address<br>• Display network range<br>• List active devices | **4-Tier Discovery Engine:**<br>1. *Smart NIC Scoring:* Auto-detects real Wi-Fi/Ethernet adapters while filtering virtual adapters (WSL, Docker, VMware, VirtualBox).<br>2. *Subnet Slicing:* Computes CIDR ranges (`ipaddress.IPv4Network`) with automatic `/24` safety slicing on massive `/8` or `/16` campus subnets.<br>3. *Multi-Layer Sweep:* Layer 2 Scapy ARP Broadcast + Layer 3 ICMP Ping Sweep + Layer 4 TCP Port Probes (`80, 443, 135, 445, 22`) + OS ARP Cache (`arp -a`).<br>4. *Metadata Resolution:* Offline IEEE OUI MAC vendor lookup, reverse DNS (`socket.gethostbyaddr`), NetBIOS/mDNS, and OS fingerprinting.<br>5. *Campus Lab Simulation:* One-click seed populating realistic campus routers, switches, servers, and IoT nodes when running behind AP client isolation. |
| **Feature 2: Connectivity Testing** | • Ping selected devices<br>• Display response time<br>• Show packet loss percentage | **3-Tier Fallback Ping Engine:**<br>1. *Raw ICMP:* Privileged unbuffered ping via `icmplib`.<br>2. *Subprocess Ping:* Native Windows/POSIX ping with precision regex handling `time=Xms` and sub-millisecond `time<1ms` (normalized to `0.5ms`).<br>3. *TCP-PING Handshake:* Connect timing on standard ports (`80, 443, 445, 135, 22`) to measure latency and mark Windows hosts online even when Windows Defender Firewall blocks ICMP Echo.<br>4. *Live WebSocket Stream:* Real-time per-packet sequence logging with RTT (ms), TTL, and packet loss %. |
| **Feature 3: Network Statistics** | Display:<br>• Hostname & IP Address<br>• Average Latency<br>• Maximum Latency<br>• Packet Loss % | **Per-Host QoS Aggregator:**<br>Calculates and tracks **Min Latency**, **Average Latency**, **Maximum Latency**, **Jitter (ms)** (standard deviation of RTT samples), and **Packet Loss (%)**. Displays sparklines, interactive data tables, and comparative latency bar charts. |
| **Feature 4: Network Report Generator** | Generate a report containing:<br>• Date and time<br>• Devices detected<br>• Ping results<br>• Network performance summary | **Diagnostic Report Generator:**<br>Exports structured audit sessions containing timestamps, active interface details, subnet CIDR, discovered device inventory, ping QoS tables, and executive health summaries in three formats:<br>• **Official Styled PDF** via pure-Python `ReportLab Platypus`<br>• **CSV Spreadsheet** for Excel/Google Sheets<br>• **JSON Payload** for automated parsing |
| **Feature 5: Security Recommendations** | Evaluates all 4 required categories:<br>• Weak connectivity alerts<br>• Unreachable hosts<br>• Basic firewall recommendations<br>• Password security reminders | **Rule-Based Security Advisor:**<br>• *Weak Connectivity:* Flags packet loss >5%, latency >100ms, or jitter >25ms.<br>• *Unreachable Hosts:* Alerts on offline nodes or dropped hosts.<br>• *Firewall Rules:* Identifies exposed high-risk ports (`21/FTP`, `23/Telnet`, `135/RPC`, `139/445/SMB`, `3306/MySQL`, `3389/RDP`, `5900/VNC`, `6379/Redis`) and provides actionable Windows/Linux firewall commands.<br>• *Password Security:* Flags default gateway credential hygiene, unhardened router admin portals, and default SNMP strings.<br>• *Scoring Engine:* Computes a Network Security Health Index (0–100) and letter grade (A to F). |

### All 8 Innovation & Bonus Features Included

| # | Bonus Feature | Implementation in NetPulse NOC |
| :- | :--- | :--- |
| **1** | **GUI using Tkinter** | **Native Dark-Themed Desktop Companion GUI (`backend/tkinter_gui.py`):** Standalone Python Tkinter (`ttk`) application sharing identical networking engines and database models as the web app. Features Discovery, Ping, Port Scanner, Security Advisor tabs, and a `--self-test` mode. |
| **2** | **Dashboard Charts** | Real-time RTT latency area charts, packet loss gauges, bandwidth throughput (`TX/RX kbps`) charts, OSI protocol breakdown donut charts, and an interactive Subnet Topology Map connecting Gateway -> Discovered Hosts. |
| **3** | **Export to PDF** | Pure-Python multi-page diagnostic and security audit report compilation using `ReportLab Platypus` (no headless browser or external OS binaries required). |
| **4** | **Email Notification** | Asynchronous SMTP alert notifications (`aiosmtplib`) with a built-in **Local Outbox Preview** ensuring alert emails can be triggered, viewed, and graded even without live internet access. |
| **5** | **Port Scanner** | Async Python TCP/UDP socket scanner with concurrency pools (`asyncio.Semaphore`), non-intrusive service banner grabbing, and OSI Layer 4/7 risk mapping. |
| **6** | **Wireshark Packet Integration** | **Wireshark 3-Pane Packet Inspector:** Live sniffing (`scapy.sniff` / Socket Synthesizer), BPF filtering, OSI Layers 2–7 dissection, 16-byte hex + ASCII dumps, `.pcap` upload/export, and a *"Launch in Wireshark Desktop"* button. |
| **7** | **Real-Time Monitoring** | High-performance FastAPI WebSocket (`/ws/monitor`) broadcasting bandwidth throughput (`psutil.net_io_counters`), scan progress, and live ping streams every 2 seconds. |
| **8** | **Cloud Database Storage** | Dual-mode SQLModel ORM: runs on local **SQLite WAL** (`netpulse.db`) by default for zero-setup offline reliability, with live hot-switching to **Cloud PostgreSQL (Supabase / Neon)**. |

---

## 🛠️ Technology Stack

### Backend & Network Systems (Python 3.11+)
- **Web & WebSocket Framework:** [FastAPI](https://fastapi.tiangolo.com/) + [Uvicorn](https://www.uvicorn.org/) (ASGI high-concurrency server)
- **Desktop Companion GUI:** Python Standard Library `tkinter` & `ttk`
- **Packet Sniffing & Synthesis:** [Scapy](https://scapy.net/) (Layer 2 ARP broadcast & packet inspection)
- **Low-Level Socket Programming:** Python `socket` & `asyncio` (TCP/UDP port scanning, banner grabbing, reverse DNS)
- **ICMP Ping Engine:** [icmplib](https://github.com/ValentinBELYN/icmplib) + Native OS Subprocess + TCP-Ping Handshake fallback
- **Network Interface & Bandwidth Telemetry:** [psutil](https://github.com/giampaolo/psutil) (NIC enumeration, bandwidth TX/RX counters)
- **Subnet & IP Calculations:** Python `ipaddress` (CIDR calculations, safety range capping)
- **MAC Vendor Resolution:** Embedded offline IEEE OUI lookup table + [mac-vendor-lookup](https://pypi.org/project/mac-vendor-lookup/)
- **Database & Hybrid ORM:** [SQLModel](https://sqlmodel.tiangolo.com/) (`SQLAlchemy` + `Pydantic v2`) + `psycopg2-binary` (SQLite WAL + PostgreSQL)
- **Document Generation:** [ReportLab](https://www.reportlab.com/) (Vector PDF compilation)
- **Email Alerts:** [aiosmtplib](https://aiosmtplib.readthedocs.io/) + Python `email.message`
- **Testing Suite:** `pytest`, `pytest-asyncio`, and `httpx`

### Frontend NOC Dashboard (Next.js 16)
- **Framework:** [Next.js 16.4](https://nextjs.org/) (App Router, React 19, TypeScript)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Component Primitives:** [shadcn/ui](https://ui.shadcn.com/) (Radix UI)
- **Data Visualizations:** [Recharts](https://recharts.org/) (Latency area charts, throughput curves, protocol donut charts)
- **Network Topology:** [React Flow (`@xyflow/react`)](https://reactflow.dev/) (Interactive node-link subnet topology map)
- **State Management:** Reactive Store + Bidirectional WebSocket Stream (`/ws/monitor`)

---

## Repository Structure

```
sir-orly/
├── backend/
│   ├── app/
│   │   ├── models/            # SQLModel schemas: DiscoveredDevice, HostQoSStats,
│   │   │                      # SecurityAlert, DiagnosticReport, PcapSession
│   │   ├── routers/           # REST endpoints: discovery, connectivity, packets,
│   │   │                      # reports, security
│   │   ├── services/          # Pure-Python networking engines:
│   │   │   ├── interface_detector.py  # Smart NIC scoring & CIDR resolver
│   │   │   ├── network_scanner.py     # 4-tier ARP/ICMP/TCP subnet discovery
│   │   │   ├── ping_engine.py         # 3-tier raw ICMP/OS/TCP ping & QoS engine
│   │   │   ├── port_scanner.py        # Async socket port scanner & banner grabber
│   │   │   ├── packet_analyzer.py     # Scapy sniffer, OSI dissector & .pcap engine
│   │   │   ├── security_advisor.py    # 4-category security recommendation rules
│   │   │   ├── report_generator.py    # ReportLab PDF, CSV & JSON exporter
│   │   │   ├── email_notifier.py      # Async SMTP alerts & Local Outbox
│   │   │   ├── oui_lookup.py          # Offline IEEE OUI vendor resolution
│   │   │   └── ws_manager.py          # WebSocket hub & bandwidth monitor
│   │   ├── config.py          # Centralized configuration & environment settings
│   │   ├── database.py        # SQLite WAL / Cloud PostgreSQL database engine
│   │   └── main.py            # FastAPI entry point & unified WebSocket endpoint
│   ├── captures/              # Saved & uploaded Wireshark .pcap capture files
│   ├── reports/               # Compiled PDF diagnostic reports
│   ├── tests/                 # Automated pytest test suites
│   ├── requirements.txt       # Python dependencies
│   └── tkinter_gui.py         # Native Python Tkinter Desktop Companion GUI
├── implementation-plan/       # Traceability matrix, architecture blueprints & specs
├── public/                    # Static assets & demo PCAP captures
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout with dark/light themes & fonts
│   │   ├── page.tsx           # NOC Overview, Speedometer & Telemetry KPI cards
│   │   ├── discovery/         # Feature 1: LAN Device Inventory & Topology Map
│   │   ├── connectivity/      # Features 2 & 3 + Bonus 5: Ping Console, QoS & Ports
│   │   ├── packets/           # Course Topic 7 + Bonus 6: Wireshark 3-Pane Dissector
│   │   ├── security/          # Feature 5 + Bonus 4/8: Security Advisor & Outbox
│   │   └── reports/           # Feature 4 + Bonus 3: Diagnostic Reports & PDF Export
│   ├── components/
│   │   ├── dashboard/         # Real-time Recharts & SVG Speedometer
│   │   ├── layout/            # Sidebar, Topbar & Navigation Shell
│   │   └── ui/                # Cyber-NOC design system components
│   ├── hooks/                 # useTelemetrySocket WebSocket hook
│   ├── lib/                   # Typed API client & data models
│   └── store/                 # useNetPulseStore reactive state management
├── package.json               # Next.js 16 dependencies & build scripts
├── start-netpulse.ps1         # One-click Windows PowerShell system launcher
└── README.md                  # Project documentation
```

---

## Quick Start Guide

### Prerequisites
- **Operating System:** Windows 10/11 (or Linux/macOS)
- **Python:** Python 3.11 or newer (added to PATH)
- **Node.js:** Node.js 18.x or newer & npm
- *(Optional)* [Npcap for Windows](https://npcap.com/) for promiscuous raw Layer 2 sniffing (if absent, NetPulse automatically activates its socket synthesizer and Layer 3/4 fallback modes).
- *(Optional)* [Wireshark Desktop](https://www.wireshark.org/) to use the *"Launch in Wireshark"* button.

---

### Option A: One-Click Windows Launcher (Recommended)

Run the included PowerShell script from the project root:

```powershell
# Launch Backend (Port 8000) and Web Dashboard (Port 3000)
.\start-netpulse.ps1

# Launch Backend, Web Dashboard, and Native Python Tkinter GUI simultaneously
.\start-netpulse.ps1 -IncludeTkinter

# Run headless system verification and Tkinter self-test
.\start-netpulse.ps1 -CheckOnly
```

Once running:
- **Web NOC Dashboard:** [http://localhost:3000](http://localhost:3000)
- **Interactive REST API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **WebSocket Telemetry Stream:** `ws://localhost:8000/ws/monitor`

---

### Option B: Manual Setup

#### 1. Start the Python Networking Engine
```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# Linux/macOS:
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI Uvicorn server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Start the Next.js 16 Web NOC Dashboard
Open a new terminal in the project root:
```bash
# Install frontend packages (if not already installed)
npm install

# Start Next.js development server
npm run dev
```

#### 3. (Optional) Run the Native Python Tkinter Companion GUI
Open another terminal:
```bash
backend\.venv\Scripts\python backend\tkinter_gui.py
```

---

## 🧪 Testing & Verification

NetPulse NOC includes an automated test suite verifying each networking subsystem:

```bash
# Activate backend virtual environment
.\backend\.venv\Scripts\activate

# Run backend test suite
pytest backend/tests -v

# Run Tkinter headless verification
python backend/tkinter_gui.py --self-test

# Verify Next.js production build
npm run build
```

---

## Edge-Case Resilience

To prevent failures during grading or live demonstrations, NetPulse NOC incorporates specialized safeguards:

1. **Non-Admin / Missing Npcap Windows Environments:**  
   If Npcap is missing or administrative privileges are restricted, Layer 2 Scapy sweeps automatically fall back to concurrent Layer 3 ICMP ping sweeps, Layer 4 TCP socket sweeps, and OS `arp -a` cache harvesting. Live packet sniffing falls back to socket flow analysis.
2. **Offline Classroom LANs (Zero Internet):**  
   All IEEE OUI MAC vendor lookups use an **embedded offline dictionary**. Email notifications default to a **Local Outbox Preview** in the UI and database. Database storage uses zero-configuration **SQLite WAL**.
3. **University AP Client Isolation (`10.x.x.x/8` or `/16`):**  
   Large subnets automatically cap to the active `/24` neighborhood slice (254 hosts). The built-in **Campus Lab Simulation Mode** seeds a realistic multi-tier campus topology with routers, switches, servers, and workstations if wireless isolation blocks peer discovery.
4. **Virtual & VPN Adapters:**  
   Virtual adapters (WSL, Docker, VMware, VirtualBox, Tailscale, Radmin) are deprioritized by the Smart NIC Scorer. A live interface switcher in the header enables instant manual adapter selection.
5. **Windows Defender Blocking ICMP Echo:**  
   Targets that drop ICMP are probed using **TCP-PING Handshakes** on standard ports (`80, 443, 445, 135, 22`), correctly classifying active hosts as online.

---

## License & Academic Integrity

Developed for **CCS 234 — Communications and Networking** at the **College of Information and Communications Technology (CICT), West Visayas State University (WVSU)**.  
Submitted for final project evaluation covering Python Network Programming, Socket Programming, OSI/TCP-IP Protocols, and Wireshark Packet Analysis.
