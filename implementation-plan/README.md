# NetPulse SOC/NOC: Network Monitoring & Performance Analysis System
## Master Implementation Plan & CCS 234 Requirements Traceability

> **Course:** CCS 234 — Communications and Networking (West Visayas State University - CICT)  
> **Project Title:** Network Monitoring and Performance Analysis System (*Codename: NetPulse NOC*)  
> **Scope of this Plan:** Full-Stack Application Architecture, Tech Stack, UI/UX Template System, Agentic Development Skills, and Step-by-Step Implementation Checklist (Presentation, Documentation, and Video excluded per instructions).

---

## 1. Executive Summary

**NetPulse NOC** is an industry-standard, full-stack **Network Monitoring, Traffic Analysis, and Security Diagnostic Platform** engineered specifically to fulfill and exceed every functional, technical, and bonus requirement of the **CCS 234 Final Project**.

Rather than building a rudimentary CLI script or a dated Tkinter window, this architecture pairs:
1. **A Pure Python Network Systems Backend (`FastAPI` + `Socket` + `Scapy` + `Psutil` + `SQLModel`)**: Directly satisfies the syllabus requirement for **Python Network Programming**, **Socket Programming**, **OSI & TCP/IP Protocol Analysis**, and **Wireshark (`.pcap`) Traffic Analysis**.
2. **A Modern Real-Time NOC/SOC Web Dashboard (`Next.js` + `TypeScript` + `Tailwind CSS` + `shadcn/ui` + `Tremor` + `React Flow`)**: Built on top of the open-source **`shadcn-admin`** dashboard architecture and styled after **Cloudflare Radar / Grafana Dark NOC Telemetry** interfaces, connected to the Python backend via **REST APIs and bidirectional WebSockets**.

---

## 2. PDF Requirements & Rubric Traceability Matrix

Every feature in this implementation plan maps directly to the grading rubric (**30 pts Functionality**, **20 pts Technical Implementation**, **10 pts UI & Design**, **10 pts Testing & Evaluation**, **5 pts Innovation & Creativity**).

### 2.1 Core Features (Required)

| Requirement ID | PDF Specification | Technical Implementation in NetPulse NOC | Course Concept Demonstrated | Agentic Skill Mapped |
| :--- | :--- | :--- | :--- | :--- |
| **Feature 1: Network Discovery** | • Detect local IP address<br>• Display network range<br>• List active devices | • Auto-detect active NIC IPv4, Subnet Mask, Default Gateway, and MAC via `psutil` & `socket`<br>• Compute CIDR network range (`ipaddress.IPv4Network`)<br>• Multi-threaded Layer 2 ARP Broadcast (`scapy.ARP`) + Layer 3 ICMP Sweep fallback<br>• Resolve Hostnames (`socket.gethostbyaddr`), MAC Vendor OUI lookup, and Device OS heuristics | • OSI Layer 2 (Data Link / ARP) & Layer 3 (Network / IPv4)<br>• IP Addressing, Subnetting & CIDR Routing | `network-discovery-and-arp` |
| **Feature 2: Connectivity Testing** | • Ping selected devices<br>• Display response time<br>• Show packet loss percentage | • Configurable ICMP Echo Request/Reply engine (`icmplib` / raw `socket`) + TCP SYN/Connect fallback ping (for ICMP-blocked hosts)<br>• Live per-sequence RTT (ms), TTL inspection, and real-time packet loss % calculation streamed via WebSockets | • ICMP Protocol (Type 8 / Type 0)<br>• TTL & Hop Routing behavior<br>• Socket timeouts & error handling | `connectivity-and-stats-engine` |
| **Feature 3: Network Statistics** | Display:<br>• Hostname<br>• IP Address<br>• Average Latency<br>• Maximum Latency<br>• Packet Loss | • Persistent & real-time telemetry aggregation per host and across the subnet<br>• Calculates **Min RTT**, **Avg RTT**, **Max RTT**, **Jitter (ms std-dev)**, and **Packet Loss %**<br>• Interactive sorting, filtering, and historical sparklines | • Network Performance Monitoring<br>• QoS Metrics (Latency, Jitter, Packet Loss) | `connectivity-and-stats-engine` |
| **Feature 4: Network Report Generator** | Generate a report containing:<br>• Date and time<br>• Devices detected<br>• Ping results<br>• Network performance summary | • One-click generation of structured diagnostic reports<br>• Includes session metadata (ISO timestamp, interface, CIDR), discovered device inventory, per-host ping & latency tables, and executive network health score<br>• Exportable as **Professional PDF**, **CSV**, and **JSON** | • Network Diagnostics & SLA Auditing<br>• Automated Technical Reporting | `security-advisor-and-reports` |
| **Feature 5: Security Recommendations** | Examples:<br>• Weak connectivity alerts<br>• Unreachable hosts<br>• Basic firewall recommendations<br>• Password security reminders | • Deterministic Rule Engine evaluating scan results, latency anomalies, and open ports<br>• Flags high packet loss/jitter (Weak Connectivity), sudden offline nodes (Unreachable Hosts), exposed risky ports like `21/FTP`, `23/Telnet`, `80/HTTP`, `445/SMB`, `3389/RDP` (Firewall Rules), and cleartext/default-credential risks (Password Reminders) with severity badges (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) | • Network Security Concepts<br>• Attack Surface & Port Exposure Analysis<br>• Hardening & Firewall Policies | `security-advisor-and-reports` |

### 2.2 Bonus & Innovation Features (All Included for Maximum Points)

| Bonus Feature | Implementation Strategy | Agentic Skill Mapped |
| :--- | :--- | :--- |
| **Modern GUI + Optional Desktop Mode** | Next.js 16 + `shadcn/ui` NOC Dashboard (replaces basic Tkinter with an enterprise web GUI; optionally launchable in a standalone desktop window via `pywebview` or browser kiosk script) | `noc-dashboard-ui` |
| **Dashboard Charts** | Real-time RTT Latency Area Charts, Packet Loss Radial Gauges, Protocol Breakdown Donut Charts, and Interactive Subnet Topology Map (`Recharts` + `@xyflow/react`) | `noc-dashboard-ui` |
| **Export to PDF** | Server-side/Client-side styled Diagnostic PDF Report generator (`ReportLab` / `react-pdf` / print-optimized NOC report template) | `security-advisor-and-reports` |
| **Email Notification** | Configurable SMTP / App-Password & Webhook Alert service (`aiosmtplib`) that dispatches instant email alerts when a monitored host goes unreachable or triggers a critical security rule | `security-advisor-and-reports` |
| **Port Scanner** | Async Python `socket` TCP Connect & UDP probe scanner (`asyncio` semaphore pool) scanning common/custom port ranges (`20–1024`, top 100 ports) with Banner Grabbing & OSI Layer 4 protocol mapping | `connectivity-and-stats-engine` |
| **Wireshark Packet Integration** | 1. Live packet capture sniffer (`scapy.sniff`) with BPF filter support (`tcp`, `udp`, `icmp`, `arp`, `port 80`)<br>2. `.pcap` / `.pcapng` upload parser & protocol analyzer<br>3. **Export captured packets to `.pcap`** so the file can be opened directly in **Wireshark** during live defense! | `wireshark-pcap-analyzer` |
| **Real-Time Monitoring** | FastAPI WebSocket (`/ws/monitor`) pushing live ping RTTs, bandwidth throughput counters (`psutil.net_io_counters`), and host up/down events every 1–5 seconds | `netpulse-backend-core` |
| **Database Storage (Local + Cloud Ready)** | Dual-mode SQLModel ORM: works out-of-the-box with local **SQLite** (`netpulse.db`) for zero-internet classroom demos, and switches seamlessly to **Supabase / Neon PostgreSQL** via `DATABASE_URL` env var for cloud storage | `netpulse-backend-core` |

---

## 3. Documentation Index in `implementation-plan/`

Read and execute the files in this folder in the following order:

1. [**`01-TECH-STACK-AND-ARCHITECTURE.md`**](./01-TECH-STACK-AND-ARCHITECTURE.md)  
   Complete justification and specification of the Python + Next.js hybrid stack, packages, system architecture diagrams, database schema, and API/WebSocket contracts.
2. [**`02-UI-THEME-AND-TEMPLATE-GUIDE.md`**](./02-UI-THEME-AND-TEMPLATE-GUIDE.md)  
   Open-source UI template specification (`shadcn-admin` + `Tremor` NOC Dark Theme), color tokens, typography, layout structure, and screen-by-screen component specifications.
3. [**`03-STEP-BY-STEP-IMPLEMENTATION-CHECKLIST.md`**](./03-STEP-BY-STEP-IMPLEMENTATION-CHECKLIST.md)  
   The master actionable checklist (`- [ ]`) broken down into **9 sequential phases** from project initialization to final verification.
4. [**`04-AGENTIC-SKILLS-WORKFLOW.md`**](./04-AGENTIC-SKILLS-WORKFLOW.md)  
   Guide to the custom Antigravity Agentic Skills located in [`.agents/skills/`](../.agents/skills/) and how to invoke each skill/subagent for each phase of development.

