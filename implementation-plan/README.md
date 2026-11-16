# NetPulse SOC/NOC: Network Monitoring & Performance Analysis System
## Master Implementation Plan & CCS 234 Requirements Traceability

> **Course:** CCS 234 — Communications and Networking (West Visayas State University - CICT)  
> **Project Title:** Network Monitoring and Performance Analysis System (*Codename: NetPulse NOC*)  
> **Scope of this Plan:** Full-Stack Application Architecture, Tech Stack, Native Tkinter Control Center + Web NOC UI/UX System, Real-World Edge-Case Resilience, Agentic Development Skills, and Step-by-Step Implementation Checklist (Presentation, Documentation, and Video excluded per instructions).

---

## 1. Executive Summary

**NetPulse NOC** is an industry-standard, full-stack **Network Monitoring, Traffic Analysis, and Security Diagnostic Platform** engineered specifically to fulfill and exceed every functional, technical, and bonus requirement of the **CCS 234 Final Project**.

To guarantee maximum points across every rubric category (**100/100**) and ensure zero points can ever be deducted for interpretation of the requirements, this architecture pairs three synchronized layers:
1. **A Pure Python Network Systems Backend (`FastAPI` + `Socket` + `Scapy` + `Psutil` + `SQLModel`)**: Directly satisfies the syllabus requirement for **Python Network Programming**, **Socket Programming**, **OSI & TCP/IP Protocol Analysis**, and **Wireshark (`.pcap`) Traffic Analysis**.
2. **A Modern Real-Time NOC/SOC Web Dashboard (`Next.js 16` + `TypeScript` + `Tailwind CSS v4` + `shadcn/ui` + `Tremor` + `React Flow`)**: Built on top of the open-source **`shadcn-admin`** dashboard architecture and styled after **Cloudflare Radar / Grafana Dark NOC Telemetry** interfaces, connected to the Python backend via **REST APIs and bidirectional WebSockets**.
3. **A Native Python `Tkinter` Companion GUI & System Launcher (`backend/tkinter_gui.py`)**: Directly satisfies the literal PDF bonus bullet *"GUI using Tkinter"*! Provides a native dark-themed Python Tkinter desktop window that can run standalone (executing scans, pings, port scans, and PDF reports directly via the Python engine) OR launch/sync with the Next.js Web NOC Dashboard.

---

## 2. PDF Requirements & Rubric Traceability Matrix

Every feature in this implementation plan maps directly to the grading rubric (**30 pts Functionality**, **20 pts Technical Implementation**, **10 pts UI & Design**, **10 pts Testing & Evaluation**, **5 pts Innovation & Creativity**).

### 2.1 Core Features (Required — 100% Covered)

| Requirement ID | PDF Specification | Technical Implementation in NetPulse NOC | Course Concept Demonstrated | Agentic Skill Mapped |
| :--- | :--- | :--- | :--- | :--- |
| **Feature 1: Network Discovery** | • Detect local IP address<br>• Display network range<br>• List active devices | • Auto-detect active NIC IPv4, Subnet Mask, Default Gateway, and MAC via `psutil` & `socket` (filtering out virtual/VPN adapters like WSL, Docker, VMware, VirtualBox)<br>• Compute CIDR network range (`ipaddress.IPv4Network`) with safety capping (`/24` slice on giant `/8` or `/16` campus networks)<br>• Multi-layered discovery: Layer 2 ARP Broadcast (`scapy.ARP`) + Layer 3 ICMP Sweep + Layer 4 TCP Port Probe (`80, 443, 135, 445, 22`) + OS ARP Cache (`arp -a`)<br>• Offline IEEE OUI MAC Vendor dictionary + Reverse DNS (`socket.gethostbyaddr`) + NetBIOS/mDNS lookup | • OSI Layer 2 (Data Link / ARP) & Layer 3 (Network / IPv4)<br>• IP Addressing, Subnetting & CIDR Routing | `network-discovery-and-arp` |
| **Feature 2: Connectivity Testing** | • Ping selected devices<br>• Display response time<br>• Show packet loss percentage | • 3-Tier Fallback Ping Engine: (1) `icmplib` unprivileged/raw ICMP, (2) Native OS `ping` subprocess parser (`time<1ms` / `time=12ms`, locale-agnostic), (3) TCP SYN/Connect handshake timing (`TCP-PING`) for ICMP-blocked hosts<br>• Live per-sequence RTT (ms), TTL inspection, and real-time packet loss % calculation streamed via WebSockets | • ICMP Protocol (Type 8 / Type 0)<br>• TTL & Hop Routing behavior<br>• Socket timeouts & error handling | `connectivity-and-stats-engine` |
| **Feature 3: Network Statistics** | Display:<br>• Hostname<br>• IP Address<br>• Average Latency<br>• Maximum Latency<br>• Packet Loss | • Persistent & real-time telemetry aggregation per host and across the subnet<br>• Calculates **Min RTT**, **Avg RTT**, **Max RTT**, **Jitter (ms std-dev)**, and **Packet Loss %**<br>• Interactive sorting, filtering, and historical sparklines | • Network Performance Monitoring<br>• QoS Metrics (Latency, Jitter, Packet Loss) | `connectivity-and-stats-engine` |
| **Feature 4: Network Report Generator** | Generate a report containing:<br>• Date and time<br>• Devices detected<br>• Ping results<br>• Network performance summary | • One-click generation of structured diagnostic reports<br>• Includes session metadata (ISO timestamp, interface, CIDR), discovered device inventory, per-host ping & latency tables, and executive network performance summary<br>• Exportable as **Official PDF**, **CSV**, and **JSON** | • Network Diagnostics & SLA Auditing<br>• Automated Technical Reporting | `security-advisor-and-reports` |
| **Feature 5: Security Recommendations** | Examples:<br>• Weak connectivity alerts<br>• Unreachable hosts<br>• Basic firewall recommendations<br>• Password security reminders | • Deterministic Rule Engine evaluating scan results, latency anomalies, and open ports<br>• Always evaluates all 4 required categories: Weak Connectivity (high packet loss/latency/jitter), Unreachable Hosts (offline nodes), Firewall Recommendations (exposed risky ports like `21/FTP`, `23/Telnet`, `445/SMB`, `3389/RDP` + baseline firewall rules), and Password Security Reminders (gateway/admin credential hygiene) with severity badges (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) | • Network Security Concepts<br>• Attack Surface & Port Exposure Analysis<br>• Hardening & Firewall Policies | `security-advisor-and-reports` |

### 2.2 Bonus & Innovation Features (All 8 Explicitly Included)

| # | PDF Bonus Feature | Implementation Strategy in NetPulse NOC | Agentic Skill Mapped |
| :- | :--- | :--- | :--- |
| **1** | **GUI using Tkinter** | **Dual-GUI Architecture**: Includes a sleek, dark-themed **Native Python `Tkinter` Control Center & Companion GUI** (`backend/tkinter_gui.py`) with tabs for Quick Subnet Scan, Ping Tester, Port Scanner, Backend Server Status, and a *"Launch Web NOC Dashboard"* button — alongside the **Next.js 16 NOC Web GUI**! | `netpulse-backend-core` & `noc-dashboard-ui` |
| **2** | **Dashboard Charts** | Real-time RTT Latency Area Charts, Packet Loss Radial Gauges, Bandwidth Throughput (`TX/RX kbps`) Charts, Protocol Breakdown Donut Charts, and Interactive Subnet Topology Map (`Recharts` + `@xyflow/react`) | `noc-dashboard-ui` |
| **3** | **Export to PDF** | Pure-Python server-side styled Diagnostic PDF Report generator (`ReportLab` Platypus engine) producing multi-page executive & technical tables without external binary dependencies | `security-advisor-and-reports` |
| **4** | **Email Notification** | Configurable SMTP / App-Password Alert service (`aiosmtplib`) + **Built-in Local Outbox / Preview Mailbox** in the UI & DB so email alerts can be triggered, inspected, and demonstrated live even without classroom internet | `security-advisor-and-reports` |
| **5** | **Port Scanner** | Async Python `socket` TCP Connect & UDP probe scanner (`asyncio` semaphore pool) scanning common/custom port ranges (`20–1024`, top 25 ports) with Service Banner Grabbing & OSI Layer 4/7 protocol mapping | `connectivity-and-stats-engine` |
| **6** | **Wireshark Packet Integration** | 1. Live packet capture sniffer (`scapy.sniff`) with BPF filter validation (`tcp`, `udp`, `icmp`, `arp`, `port 80`) + Live Socket Packet Synthesizer fallback if Npcap is missing<br>2. `.pcap` / `.pcapng` upload parser & protocol analyzer<br>3. **Export captured packets to `.pcap`** + **"Launch in Wireshark Desktop"** button (`C:\Program Files\Wireshark\Wireshark.exe`) | `wireshark-pcap-analyzer` |
| **7** | **Real-time Monitoring** | FastAPI WebSocket (`/ws/monitor`) pushing live ping RTTs, bandwidth throughput counters (`psutil.net_io_counters`), scan progress bars, and host up/down events every 2 seconds | `netpulse-backend-core` |
| **8** | **Cloud Database Storage** | Dual-mode SQLModel ORM: runs locally on **SQLite WAL** (`netpulse.db`) for zero-internet reliability, AND includes a live **Cloud Database Sync / Connection Manager** supporting **PostgreSQL (Supabase / Neon)** via `DATABASE_URL` or runtime configuration | `netpulse-backend-core` |

---

## 3. Multi-Scenario & Edge-Case Resilience Matrix

To guarantee the application works flawlessly in **every real-world scenario** (home Wi-Fi, university computer lab, mobile hotspot, offline machine, or restricted non-Admin Windows account), the system implements the following engineering safeguards:

| Scenario / Edge Case | What Typically Breaks in Student Projects | How NetPulse NOC Handles It Automatically |
| :--- | :--- | :--- |
| **1. No Admin Rights / No Npcap Installed on Windows** | `scapy.srp()` and raw `socket.IPPROTO_ICMP` crash with `PermissionError` or `WinPcap is not installed`. | **Automatic 3-Tier Fallback**: Discovery falls back to concurrent Layer 3 ICMP + Layer 4 TCP port probes + Windows `arp -a` cache table parsing. Packet sniffer falls back to live active socket flow synthesis (`psutil.net_connections`) and bundled `.pcap` analysis. |
| **2. Offline / Air-Gapped Classroom LAN (No Internet)** | Outbound socket probe to `8.8.8.8` fails; `mac-vendor-lookup` hangs trying to download IEEE OUI lists; CDN fonts or SMTP fail. | **100% Offline Ready**: Interface detector falls back to active hardware NIC enumeration; OUI vendor lookup uses an **embedded offline OUI dictionary**; Email Notifier includes a **Local Outbox Preview** mode; SQLite requires zero cloud internet. |
| **3. University / Hotspot AP Client Isolation (`10.x.x.x/8` or `/16`)** | Scanning a `/16` (65,534 hosts) freezes the app for 20 minutes; AP isolation blocks peer-to-peer pings. | **Smart Subnet Capping & Simulation Lab Mode**: Subnets larger than `/24` automatically target the active `/24` neighborhood slice (`254` hosts) with a UI selector. Also includes a **"Virtual Campus Lab Simulation / Cisco Packet Tracer Seed Mode"** that populates realistic routers, switches, servers, and workstations if AP isolation blocks peer discovery! |
| **4. Virtual & VPN Adapters (WSL2, Docker, VMware, VirtualBox, Radmin/Tailscale)** | App detects `172.24.x.1` (WSL) or `192.168.56.1` (VirtualBox) instead of the real Wi-Fi/Ethernet LAN. | **Smart NIC Scoring & Interface Switcher**: Automatically deprioritizes virtual/tunnel adapters (`vEthernet`, `WSL`, `Docker`, `VMware`, `VirtualBox`, `Loopback`, `169.254.x.x` APIPA) AND provides a **Live NIC Switcher Dropdown** in the Top Status Bar so the user can switch interfaces at any time. |
| **5. Windows Defender Firewall Blocking ICMP Echo** | Online Windows PCs appear "Offline" because Windows blocks inbound ICMP Echo Requests by default. | **Hybrid ARP + TCP Handshake Ping**: If a host responds to Layer 2 ARP or has an entry in `arp -a` or responds to a TCP `SYN` on ports `80/443/135/445` (even with `RST`), it is marked **ONLINE** and measured via **TCP Handshake RTT (`TCP-PING`)**. |
| **6. Sub-Millisecond Localhost / LAN Ping (`time<1ms`)** | Naive regex parsers expecting `time=12ms` fail on `time<1ms` and report `0` packets received or crash. | **Precision Sub-ms Parser**: Handles both `time=Xms` and `time<1ms` (normalizing `<1ms` to `0.5ms`), and guards against division-by-zero when `packets_received == 0`. |

---

## 4. Documentation Index in `implementation-plan/`

Read and execute the files in this folder in the following order:

1. [**`01-TECH-STACK-AND-ARCHITECTURE.md`**](./01-TECH-STACK-AND-ARCHITECTURE.md)  
   Complete specification of the Python + Next.js + Tkinter stack, unified SQLModel database schemas, REST API & WebSocket contracts, and edge-case architecture.
2. [**`02-UI-THEME-AND-TEMPLATE-GUIDE.md`**](./02-UI-THEME-AND-TEMPLATE-GUIDE.md)  
   Open-source UI template specification (`shadcn-admin` + `Tremor` NOC Dark Theme), usability enhancements, screen-by-screen blueprints, and the Native Tkinter Companion GUI layout.
3. [**`03-STEP-BY-STEP-IMPLEMENTATION-CHECKLIST.md`**](./03-STEP-BY-STEP-IMPLEMENTATION-CHECKLIST.md)  
   The master actionable checklist (`- [ ]`) broken down into **9 sequential phases** from project initialization to final verification and submission packaging.
4. [**`04-AGENTIC-SKILLS-WORKFLOW.md`**](./04-AGENTIC-SKILLS-WORKFLOW.md)  
   Guide to the custom Antigravity Agentic Skills located in [`.agents/skills/`](../.agents/skills/) and how to invoke each skill/subagent for each phase of development.
5. [**`05-REQUIREMENTS-GAP-ANALYSIS-AND-FIX-CHECKLIST.md`**](./05-REQUIREMENTS-GAP-ANALYSIS-AND-FIX-CHECKLIST.md)  
   Comprehensive audit comparing the 6-page CCS 234 Final Project requirements & grading rubric against the current codebase, with an actionable step-by-step fix checklist.
6. [**`06-DESKTOP-TAURI-NEXTJS-FLASK-SQLITE.md`**](./06-DESKTOP-TAURI-NEXTJS-FLASK-SQLITE.md)  
   Complete packaging guide for Desktop distribution using Tauri v2, Next.js 16 static export, frozen Flask WSGI sidecar (Waitress/PyInstaller), and local SQLite WAL storage.
7. [**`07-MOBILE-APK-TAURI2-CHAQUOPY-SQLITE.md`**](./07-MOBILE-APK-TAURI2-CHAQUOPY-SQLITE.md)  
   Complete packaging guide for Mobile Android APK distribution using Tauri 2, Next.js 16 static export, embedded CPython runtime via Chaquopy, unprivileged Android networking engine, and private sandbox SQLite.
8. [**`08-FEATURE-VERIFICATION-AND-AUDIT-REPORT.md`**](./08-FEATURE-VERIFICATION-AND-AUDIT-REPORT.md)  
   Comprehensive live verification audit report covering all 5 core features, all 8 innovation bonus features, 15 REST API endpoints, Next.js 16 prerendered routes, and native Tkinter GUI self-test.
