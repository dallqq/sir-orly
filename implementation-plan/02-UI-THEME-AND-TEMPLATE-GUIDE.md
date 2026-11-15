# 02 — UI Library, Open-Source Template, Usability & Dual-GUI Specification

## 1. Open-Source UI Template & Component Libraries Used

To achieve a **10/10 score on User Interface & Design** and **5/5 on Innovation & Creativity**, NetPulse NOC combines three proven open-source web UI foundations with a **Native Python Tkinter Companion GUI**:

| Layer | Open-Source Template / Library | Repository / Source | How We Follow & Adapt It |
| :--- | :--- | :--- | :--- |
| **1. Admin & Shell Architecture** | **`shadcn-admin`** (by Sat Naing) | `https://github.com/satnaing/shadcn-admin` | Provides the collapsible sidebar layout (`SidebarProvider`), top command bar, status header badges, NIC switcher, and responsive 4-KPI summary grid + split telemetry panels. |
| **2. Telemetry & Observability Blocks** | **Tremor (`Tremor Raw`) & `shadcn/ui` Charts** | `https://github.com/tremorlabs/tremor` & `https://ui.shadcn.com/charts` | Provides dark-mode observability primitives: real-time sparklines, multi-series latency area charts, status tracker bars (uptime blocks), and donut charts for OSI protocol distribution. |
| **3. Topology & Packet Inspection** | **React Flow (`@xyflow/react`)** + **Wireshark 3-Pane Layout Pattern** | `https://github.com/xyflow/xyflow` | Interactive dark-grid canvas showing the Gateway Router connected to discovered LAN hosts with animated dashed edges colored by RTT health, plus a Wireshark-inspired 3-pane packet inspector (Packet List -> OSI Layer Dissection -> Hex/ASCII Dump). |
| **4. Native Python Desktop GUI (`Bonus Feature 1`)** | **Python `tkinter` & `tkinter.ttk` (Cyber-NOC Theme)** | Python Standard Library | Directly fulfills the PDF bonus *"GUI using Tkinter"*! Provides a native dark-themed Python desktop window (`backend/tkinter_gui.py`) with tabs for Discovery, Ping & Stats, Port Scanner, Report Export, and a one-click launcher for the Web NOC Dashboard. |

---

## 2. Theme Identity: "Cyber-NOC Obsidian" (Dark Telemetry Theme)

Network engineers and SOC analysts operate in high-contrast, dark-mode environments where status colors (`ONLINE`, `DEGRADED`, `OFFLINE`, `CRITICAL`) carry immediate semantic meaning and all technical identifiers (IPv4, MAC, CIDR, Ports, RTT, Packet Hex) use **tabular monospace typography** (`tabular-nums`).

### 2.1 Color Palette & CSS Tokens (`src/app/globals.css`)

| Semantic Token | Hex / Tailwind Reference | Usage in NetPulse NOC |
| :--- | :--- | :--- |
| **Canvas Background (`--background`)** | `#090D16` (`slate-950` deep) | Main application background behind cards |
| **Surface / Card (`--card`)** | `#0F172A` (`slate-900/90` + `1px` border `#1E293B`) | Telemetry cards, data tables, topology container |
| **Elevated Panel (`--popover`)** | `#1E293B` (`slate-800`) | Hover tooltips, command palette, packet detail drawer |
| **Primary Brand / Active (`--primary`)** | `#06B6D4` (`cyan-500`) | Active scan sweeps, radar pulses, primary action buttons, TCP traffic |
| **Status: Optimal / Online** | `#10B981` (`emerald-500`) | Host reachable, RTT `< 50ms`, 0% packet loss, secure posture |
| **Status: Degraded / Warning** | `#F59E0B` (`amber-500`) | High latency (`50ms–150ms`), minor packet loss (`1%–10%`), medium security advisory |
| **Status: Critical / Offline** | `#EF4444` (`rose-500`) | Host unreachable, packet loss `> 10%`, critical open ports (`23/Telnet`, `21/FTP`) |
| **Protocol Accent: Layer 2 (ARP)** | `#A855F7` (`purple-500`) | ARP broadcast/reply badges & Wireshark packet rows |
| **Protocol Accent: Layer 3 (ICMP)** | `#3B82F6` (`blue-500`) | ICMP Echo Request/Reply ping traces |
| **Protocol Accent: Layer 4 (TCP/UDP)** | `#06B6D4` / `#14B8A6` (`cyan-500` / `teal-500`) | TCP/UDP port scan results & packet stream rows |

### 2.2 Offline-Safe Typography System

> [!IMPORTANT]
> **Zero-Internet Font Resilience:**  
> Do not rely solely on runtime Google Fonts downloads that fail when running in an offline university classroom! Configure an offline-safe CSS font stack (`'Geist', 'Inter', 'Segoe UI', system-ui, sans-serif` for UI, and `'Geist Mono', 'JetBrains Mono', 'Cascadia Mono', 'Consolas', monospace` with `font-variant-numeric: tabular-nums` for technical telemetry).

---

## 3. Usability & Classroom Defense Workflow Enhancements

To ensure effortless usability during live grading and video recording:

1. **Cross-Page Contextual Action Pipeline (Zero Re-Typing IPs)**:
   - Every row in the **Network Discovery** table includes quick-action buttons:
     - **`[⚡ Ping Host]`** -> Navigates to `/connectivity?target=192.168.1.X&autostart=ping` and starts pinging immediately.
     - **`[🔓 Scan Ports]`** -> Navigates to `/connectivity?target=192.168.1.X&tab=ports&autostart=scan` and starts scanning ports immediately.
     - **`[🦈 Capture Traffic]`** -> Navigates to `/packets?filter=host 192.168.1.X` with the BPF filter pre-populated.
2. **Active NIC Switcher & Simulation Mode Toggle in Top Bar**:
   - The top header bar allows switching between detected physical interfaces (`Wi-Fi`, `Ethernet`, `Loopback`) OR enabling **"Campus Lab Simulation Mode"** (which seeds realistic multi-subnet devices, routers, open ports, and traffic if the classroom Wi-Fi enforces client isolation).
3. **Interactive Guided Empty States**:
   - When the app opens on a fresh database before the first scan, every screen displays a prominent **"Run Initial Subnet Discovery"** or **"Load Sample Campus Lab Topology"** CTA card rather than blank tables or empty `0` charts.
4. **Live Environment Capability Badges (Sidebar Footer)**:
   - Clearly displays real-time system status:
     - `● Python Engine: Connected (8000)`
     - `● Database: SQLite WAL / Cloud PG`
     - `● Packet Engine: Npcap L2 / Socket L3 Fallback`
     - `● Real-Time Monitor: ON / OFF Toggle`

---

## 4. Global App Shell Layout (Following `shadcn-admin`)

```text
+------------------------------------------------------------------------------------------------------+
| [NetPulse NOC] | NIC: [Wi-Fi 192.168.1.105/24 ▾] | GW: 192.168.1.1 | [● WS LIVE] | [⚡ Quick Scan]   |
+----------------+-------------------------------------------------------------------------------------+
| NAVIGATION     |  BREADCRUMB: NetPulse NOC  /  Network Discovery & Topology                          |
|                |  ---------------------------------------------------------------------------------  |
| [◉] Overview   |  +-------------------+ +-------------------+ +-------------------+ +--------------+ |
| [◎] Discovery  |  | LOCAL IP / SUBNET | | ACTIVE HOSTS      | | AVG LAN LATENCY   | | SECURITY     | |
| [⚡] Ping/Ports |  | 192.168.1.105     | | 14 Devices Online | | 4.82 ms (0% Loss) | | 92/100 (A)   | |
| [🦈] Wireshark |  | Range: .1.0/24    | | +2 since last scan| | Max: 18.4 ms      | | 2 Advisories | |
| [🛡️] Security  |  +-------------------+ +-------------------+ +-------------------+ +--------------+ |
| [📄] Reports   |                                                                                     |
|                |  +----------------------------------------------+ +-------------------------------+ |
| -------------- |  | MAIN INTERACTIVE WORKSPACE                   | | CONTEXTUAL INSPECTOR          | |
| SYSTEM STATUS  |  | (e.g., Live Latency Area Chart /             | | (e.g., Selected Host          | |
| ● API Online   |  |  React Flow Subnet Topology Graph /          | |  Ping Stream, Open Ports,     | |
| ● SQLite / PG  |  |  Sortable TanStack Device DataTable /        | |  OSI Layer Breakdown,         | |
| ● Npcap / L3   |  |  Wireshark 3-Pane Packet Inspector)          | |  or Security Fixes)           | |
+----------------+-------------------------------------------------------------------------------------+
```

---

## 5. Screen-by-Screen UI Blueprint

### Screen 1: NOC Overview Dashboard (`/`)
- **Top Status Strip**: Active Network Interface selector dropdown (`Wi-Fi`, `Ethernet`, `Loopback`), detected Local IP, Subnet Mask, Default Gateway, CIDR badge (`Feature 1`), Real-Time Monitoring toggle, and `Seed Demo Lab` button.
- **4 KPI Metric Cards (Tremor style)**:
  1. **Local Subnet & Interface (`Feature 1`)**: Displays Local IP, MAC Address, and CIDR Range (`192.168.1.0/24`).
  2. **Discovered Devices (`Feature 1`)**: Count of Online vs. Offline hosts with a visual status tracker bar.
  3. **Network Performance (`Feature 3`)**: Live Average Latency (`ms`), Max Latency (`ms`), Jitter, and Packet Loss %.
  4. **Security Posture Score (`Feature 5`)**: Dynamic score (`0–100`, Grade `A–F`) with active alert counts.
- **Center Charts Row (`Bonus: Dashboard Charts & Real-Time Monitoring`)**:
  - **Left (2/3 width)**: Real-Time Multi-Host Latency & Jitter Area Chart (`Recharts` streaming over WebSocket).
  - **Right (1/3 width)**: Live NIC Bandwidth Throughput (`TX / RX kbps` via `psutil`) & OSI Protocol Breakdown Donut Chart.
- **Bottom Row**: Discovered Hosts Quick Table + Top Security Recommendations Feed + Quick-Action Bar (`Run Subnet Scan`, `Generate PDF Report`).

### Screen 2: Network Discovery & Interactive Topology (`/discovery`) — *Feature 1*
- **Network Interface & Range Banner**: Prominently displays **Detected Local IP Address**, **Subnet Mask**, **Network Range (CIDR)**, **Default Gateway**, and **MAC Address** (directly satisfying all 3 bullets of Feature 1).
- **Scan Control Toolbar**: CIDR input (auto-filled from active NIC), Scan Mode selector (`Hybrid Auto (ARP + ICMP + TCP)`, `Layer 2 ARP Broadcast`, `Layer 3 ICMP Sweep`, `Campus Lab Simulation`), and animated progress bar.
- **View Switcher Tabs**:
  - **Tab A — Active Devices Inventory Table (`TanStack Table`)**: Columns for Status Dot, IP Address (`font-mono`), Hostname, MAC Address, Vendor (OUI), OS Guess, Discovery Method (`ARP_L2` / `ICMP_L3` / `TCP_L4`), Last RTT (`ms`), and One-Click Actions (`Ping`, `Scan Ports`, `Sniff`).
  - **Tab B — Interactive Subnet Topology Map (`@xyflow/react`)**: Star/tree topology centering the Local Host and Default Gateway connected to all discovered nodes. Edges animate and change color (`Emerald` `<30ms`, `Amber` `30-100ms`, `Red` `Loss/Timeout`). Clicking any node opens its quick inspector drawer.

### Screen 3: Connectivity Testing, QoS Statistics & Port Scanner (`/connectivity`) — *Features 2, 3 & Bonus*
- **Top Mode Tabs / Split Workspace**:
  - **Panel 1 — Multi-Host Ping Tester (`Feature 2`)**:
    - Select any discovered host(s) or type a custom IP/hostname (e.g., `192.168.1.1`, `127.0.0.1`, `8.8.8.8`).
    - Configure packet count (`4`, `10`, `25`), packet size (`32B`–`1400B`), and protocol (`Auto ICMP/TCP`, `ICMP Echo`, `TCP Handshake Ping`).
    - Live scrolling Ping Terminal showing per-sequence response time (`Reply from 192.168.1.1: bytes=32 time=2.14ms TTL=64`) and live Packet Loss % badge.
  - **Panel 2 — Network Statistics Table (`Feature 3`)**:
    - Displays all required PDF columns: **`Hostname`**, **`IP Address`**, **`Average Latency (ms)`**, **`Maximum Latency (ms)`**, **`Packet Loss (%)`**, plus **`Minimum Latency (ms)`**, **`Jitter (ms)`**, and **`Method`**.
    - Includes visual latency comparison bar chart across tested hosts.
  - **Panel 3 — Async Socket Port Scanner (`Bonus Feature 5`)**:
    - Target IP selector + Port Preset (`Quick Top 25 Ports`, `Standard 1–1024`, `Custom Port Range`).
    - Displays open TCP/UDP ports, service name (`HTTP`, `SSH`, `SMB`, `DNS`, `Telnet`), grabbed service banner, mapped **OSI Layer 4 / Layer 7** badge, and **Risk Severity**.

### Screen 4: Wireshark Traffic & Packet Analyzer (`/packets`) — *Course Topic 7 & Bonus Feature 6*
- **Capture & File Toolbar**:
  - **Live Capture Controls**: Select interface, packet count limit (`25`, `50`, `100`, `250`), validated BPF Filter chips (`all`, `arp`, `icmp`, `tcp`, `udp`, `port 80 or port 443`, `port 53`), and `Start Capture` / `Load Demo PCAP`.
  - **Wireshark Interoperability**:
    - **`Download .pcap File (Open in Wireshark)`** button
    - **`Launch in Wireshark Desktop`** button (invokes local `Wireshark.exe` if installed)
    - **`Upload .pcap / .pcapng File`** button
- **Wireshark-Inspired 3-Pane Inspector**:
  1. **Top Pane (Packet List Table)**: `No.`, `Time`, `Source IP/MAC`, `Destination IP/MAC`, `Protocol Badge (ARP/ICMP/TCP/UDP/DNS/HTTP)`, `Length`, `Info Summary`. Color-coded like Wireshark's dark profile.
  2. **Bottom-Left Pane (OSI & TCP/IP Layer Dissection Tree)**: Collapsible accordion displaying:
     - `Layer 2 — Data Link (Ethernet II)`: Src MAC, Dst MAC, EtherType
     - `Layer 3 — Network (IPv4 / ARP / ICMP)`: Src IP, Dst IP, TTL, Protocol ID
     - `Layer 4 — Transport (TCP / UDP)`: Src Port, Dst Port, TCP Flags (`[SYN]`, `[SYN, ACK]`, `[PSH, ACK]`), Seq/Ack numbers
     - `Layer 7 — Application Payload`: Decoded DNS queries, HTTP headers, or payload preview
  3. **Bottom-Right Pane (Hexadecimal & ASCII Byte Viewer)**: Classic 16-byte offset hex dump alongside printable ASCII characters.

### Screen 5: Security Advisor, Alert Center & Cloud DB Status (`/security`) — *Feature 5 & Bonus Email / Cloud DB*
- **Security Posture Header**: Overall Network Security Score (`0–100`), Letter Grade (`A` to `F`), category filter tabs, and `Re-Evaluate Network Security` button.
- **Categorized Recommendation Cards (Covering all 4 PDF Examples)**:
  1. **`Weak Connectivity Alerts`**: Triggered when any host exhibits packet loss `> 0%`, high latency, or high jitter (or shows healthy baseline advisory if all links are optimal).
  2. **`Unreachable Hosts`**: Triggered when discovered hosts or gateways fail ping checks (`100% loss` / `OFFLINE`).
  3. **`Basic Firewall Recommendations`**: Generated from open port scan findings (`21/FTP`, `23/Telnet`, `135/RPC`, `445/SMB`, `3389/RDP`) with copyable Windows `netsh advfirewall` and Linux `ufw` remediation commands + baseline host firewall rules.
  4. **`Password Security Reminders`**: Targeted advisories for gateway routers, web admin panels, and SSH/RDP endpoints regarding default credentials, WPA3/WPA2 encryption, and MFA.
- **Email Notification & Local Outbox Panel (`Bonus Feature 4`)**:
  - Configure SMTP settings (Host, Port, Sender, Recipient, App Password) and click **`Send Security & Connectivity Alert Email`**.
  - Includes a live **Email Outbox & Preview Table** showing every dispatched/simulated HTML email alert so the professor can verify the exact email content on-screen!
- **Database Storage Mode Panel (`Bonus Feature 8`)**:
  - Displays current database engine (`Local SQLite WAL` vs `Cloud PostgreSQL / Supabase`) with a connection tester and cloud sync status badge.

### Screen 6: Network Diagnostic Report Center (`/reports`) — *Feature 4 & Bonus PDF*
- **Report Builder & History**:
  - One-click **`Generate Full Diagnostic Report`** button.
  - **Live Interactive Report Preview**: Shows the exact structured report required by Feature 4:
    1. **Date and Time** of report generation + Network Interface & CIDR Range.
    2. **Network Performance Summary**: Executive summary paragraph, total active/offline devices, average & max subnet latency, overall packet loss %, and security health score.
    3. **Devices Detected Table**: Hostname, IP Address, MAC Address, Vendor, Discovery Method, Status.
    4. **Ping Results & Network Statistics Table**: Hostname, IP Address, Min Latency, Average Latency, Maximum Latency, Jitter, Packet Loss %.
    5. **Open Ports & Security Recommendations Summary**.
  - **Export Buttons**:
    - **`Download Official PDF Report`** (Generated via Python `ReportLab`)
    - **`Export CSV`** & **`Export JSON`**

---

## 6. Native Python Tkinter Companion GUI (`backend/tkinter_gui.py` — *Bonus Feature 1*)

To explicitly satisfy the first item in the PDF's Bonus Features list (*"GUI using Tkinter"*), `backend/tkinter_gui.py` provides a standalone dark-themed `tkinter.ttk` desktop window styled in the same **Cyber-NOC Obsidian** palette (`#090D16` background, `#06B6D4` cyan accents):
- **Header Bar**: Displays Local IP, Subnet CIDR, Gateway, and two quick-launch buttons: **`[🌐 Open Web NOC Dashboard (localhost:3000)]`** and **`[📄 Generate PDF Report]`**.
- **Tab 1 — Network Discovery**: `Scan Subnet` button + `ttk.Treeview` table listing IP, Hostname, MAC, Vendor, Method, and Status.
- **Tab 2 — Ping & Network Statistics**: Target IP entry + `Run Ping Test` button + live output log + `ttk.Treeview` showing `Hostname`, `IP`, `Avg Latency`, `Max Latency`, and `Packet Loss %`.
- **Tab 3 — Socket Port Scanner & Security**: Target IP port scanner + Security Recommendations list.
