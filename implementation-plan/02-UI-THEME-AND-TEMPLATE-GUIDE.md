# 02 — UI Library, Open-Source Template & NOC Theme Specification

## 1. Open-Source UI Template & Component Libraries Used

To achieve a **10/10 score on User Interface & Design** and **5/5 on Innovation**, NetPulse NOC combines three proven open-source UI foundations tailored for **Network Operations Center (NOC) & Security Operations Center (SOC)** telemetry:

| Layer | Open-Source Template / Library | Repository / Source | How We Follow & Adapt It |
| :--- | :--- | :--- | :--- |
| **1. Admin & Shell Architecture** | **`shadcn-admin`** (by Sat Naing) | `https://github.com/satnaing/shadcn-admin` | Provides the collapsible sidebar layout (`SidebarProvider`), top command bar (`Ctrl+K`), breadcrumb navigation, status header badges, and responsive 4-KPI summary grid + split telemetry panels. |
| **2. Telemetry & Observability Blocks** | **Tremor (`Tremor Raw`) & `shadcn/ui` Charts** | `https://github.com/tremorlabs/tremor` & `https://ui.shadcn.com/charts` | Provides dark-mode observability primitives: real-time sparklines, multi-series latency area charts, status tracker bars (uptime blocks), and donut charts for OSI protocol distribution. |
| **3. Topology & Packet Inspection** | **React Flow (`@xyflow/react`)** + **Wireshark 3-Pane Layout Pattern** | `https://github.com/xyflow/xyflow` | Interactive dark-grid canvas showing the Gateway Router connected to discovered LAN hosts with animated dashed edges colored by RTT health, plus a Wireshark-inspired 3-pane packet inspector (Packet List -> OSI Layer Dissection -> Hex/ASCII Dump). |

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

### 2.2 Typography System

- **UI & Headings (`--font-geist-sans`)**: Clean geometric sans-serif for navigation, labels, security recommendations, and report prose.
- **Technical & Telemetry Data (`--font-geist-mono` with `font-variant-numeric: tabular-nums`)**: Strictly applied to:
  - IPv4 / IPv6 Addresses & CIDR notations (`192.168.1.0/24`)
  - MAC Addresses (`00:1A:2B:3C:4D:5E`)
  - Latency Metrics (`12.48 ms`), Jitter (`±1.2 ms`), and Packet Loss (`0.0%`)
  - Port Numbers & Banners (`80/tcp OPEN - nginx/1.24.0`)
  - Wireshark Packet Timestamps & Hex/ASCII Byte Dumps

---

## 3. Global App Shell Layout (Following `shadcn-admin`)

```text
+--------------------------------------------------------------------------------------------------+
| [NetPulse NOC]  | NIC: Wi-Fi (192.168.1.105/24) | GW: 192.168.1.1 | [● WS LIVE 1s] | [Quick Scan] |
+-----------------+--------------------------------------------------------------------------------+
| NAVIGATION      |  BREADCRUMB: NetPulse NOC  /  Network Discovery & Topology                     |
|                 |  ----------------------------------------------------------------------------  |
| [◉] Overview    |  +-------------------+ +-------------------+ +-------------------+ +---------+ |
| [◎] Discovery   |  | LOCAL IP / SUBNET | | ACTIVE HOSTS      | | AVG LAN LATENCY   | | SECURITY| |
| [⚡] Ping & Stat |  | 192.168.1.105     | | 14 Devices Online | | 4.82 ms (0% Loss) | | 92/100  | |
| [🔓] Port Scan  |  | Range: .1.0/24    | | +2 since last scan| | Max: 18.4 ms      | | 2 Alerts| |
| [🦈] Wireshark  |  +-------------------+ +-------------------+ +-------------------+ +---------+ |
| [🛡️] Security   |                                                                                |
| [📄] Reports    |  +---------------------------------------------+ +---------------------------+ |
|                 |  | MAIN INTERACTIVE WORKSPACE                  | | CONTEXTUAL INSPECTOR      | |
| --------------- |  | (e.g., Live Latency Area Chart /            | | (e.g., Selected Host      | |
| SYSTEM STATUS   |  |  React Flow Subnet Topology Graph /         | |  Ping Stream, Open Ports, | |
| ● Python Engine |  |  Sortable TanStack Device DataTable /       | |  OSI Layer Breakdown,     | |
| ● SQLite DB     |  |  Wireshark 3-Pane Packet Inspector)         | |  or Security Fixes)       | |
| ● Npcap Ready   |  +---------------------------------------------+ +---------------------------+ |
+-----------------+--------------------------------------------------------------------------------+
```

---

## 4. Screen-by-Screen UI Blueprint

### Screen 1: NOC Overview Dashboard (`/`)
- **Top Status Strip**: Active Network Interface selector dropdown (`Wi-Fi`, `Ethernet`, `Loopback`), detected Local IP, Subnet Mask, Default Gateway, and CIDR badge (`Feature 1`).
- **4 KPI Metric Cards (Tremor style)**:
  1. **Local Subnet & Interface**: Displays Local IP, MAC Address, and CIDR Range (`192.168.1.0/24`).
  2. **Discovered Devices**: Count of Online vs. Offline hosts with a status tracker bar (`Feature 1`).
  3. **Network Performance (QoS)**: Live Average Latency (`ms`), Max Latency (`ms`), Jitter, and Packet Loss % (`Feature 3`).
  4. **Security Posture Score**: Dynamic score (`0–100`) with active high/medium alert counts (`Feature 5`).
- **Center Charts Row**:
  - **Left (2/3 width)**: Real-Time Multi-Host Latency & Jitter Area Chart (`Recharts` streaming over WebSocket).
  - **Right (1/3 width)**: Network Bandwidth Throughput (`TX / RX kbps` via `psutil`) & OSI Protocol Breakdown Donut Chart.
- **Bottom Row**: Recent Security Recommendations Feed (`Feature 5`) + Quick-Action Bar (`Run Subnet Scan`, `Export PDF Report`).

### Screen 2: Network Discovery & Interactive Topology (`/discovery`) — *Feature 1*
- **Scan Control Toolbar**: Auto-filled CIDR input (`192.168.1.0/24`), Scan Mode selector (`ARP Broadcast + ICMP`, `ICMP Quick Sweep`, `Deep Discovery + Reverse DNS`), and animated progress bar.
- **View Switcher Tabs**:
  - **Tab A — Device Inventory Table (`TanStack Table`)**: Columns for Status Dot, IP Address (`font-mono`), Hostname, MAC Address, Vendor (OUI), Discovery Method (`ARP L2` / `ICMP L3`), Last RTT (`ms`), and Quick Actions (`Ping`, `Scan Ports`, `Inspect`).
  - **Tab B — Interactive Subnet Topology Map (`@xyflow/react`)**: Star/tree topology centering the Local Host and Default Gateway connected to all discovered nodes. Edges animate and change color (`Emerald` `<20ms`, `Amber` `20-100ms`, `Red` `Loss/Timeout`).

### Screen 3: Connectivity Testing, QoS Statistics & Port Scanner (`/connectivity`) — *Features 2, 3 & Bonus*
- **Split-View Workspace**:
  - **Left Panel — Multi-Host Ping & QoS Statistics Table (`Features 2 & 3`)**:
    - Select one, multiple, or all discovered hosts.
    - Configure packet count (`4`, `10`, `50`, or `Continuous Real-Time Stream`), packet size (`32B`–`1400B`), and protocol (`ICMP Echo` or `TCP SYN/Connect Ping`).
    - **Required Statistics Columns**: `Hostname`, `IP Address`, `Min Latency`, `Average Latency`, `Maximum Latency`, `Jitter (ms)`, `Packet Loss (%)`, and `Live Sparkline`.
  - **Right Panel — Live Ping Terminal & Async Port Scanner (`Bonus`)**:
    - Live scrolling ICMP/TCP sequence feed (`Reply from 192.168.1.1: bytes=32 time=2.14ms TTL=64`).
    - **Socket Port Scanner Tab**: Target IP + Port Preset (`Common Top 25`, `Standard 1–1024`, `Custom Range`). Displays open TCP/UDP ports, service name (`HTTP`, `SSH`, `SMB`, `DNS`), grabbed service banner, and mapped **OSI Layer 4 / Layer 7** tags.

### Screen 4: Wireshark Traffic & Packet Analyzer (`/packets`) — *Course Topic 7 & Bonus*
- **Capture & File Toolbar**:
  - **Live Capture Controls**: Select interface, packet count limit (`50–500`), BPF Filter chips (`arp`, `icmp`, `tcp`, `udp`, `port 80 or port 443`, `dns`), and `Start Sniffing` / `Stop`.
  - **Wireshark Interoperability**: `Export to .pcap (Open in Wireshark)` button AND `Upload .pcap / .pcapng File` dropzone.
- **Wireshark-Inspired 3-Pane Inspector**:
  1. **Top Pane (Packet List Table)**: `No.`, `Time`, `Source IP/MAC`, `Destination IP/MAC`, `Protocol Badge (ARP/ICMP/TCP/UDP/DNS/HTTP)`, `Length`, `Info Summary`. Color-coded exactly like Wireshark's dark theme.
  2. **Bottom-Left Pane (OSI & TCP/IP Layer Dissection Tree)**: Collapsible accordion displaying:
     - `Layer 2 — Data Link (Ethernet II)`: Src MAC, Dst MAC, EtherType
     - `Layer 3 — Network (IPv4 / ARP / ICMP)`: Src IP, Dst IP, TTL, Header Checksum
     - `Layer 4 — Transport (TCP / UDP)`: Src Port, Dst Port, TCP Flags (`[SYN]`, `[SYN, ACK]`, `[PSH, ACK]`), Seq/Ack numbers
     - `Layer 7 — Application Payload`: Decoded DNS queries, HTTP headers, or raw payload preview
  3. **Bottom-Right Pane (Hexadecimal & ASCII Byte Viewer)**: Classic 16-byte offset hex dump alongside printable ASCII characters.

### Screen 5: Security Advisor & Alert Center (`/security`) — *Feature 5 & Bonus Email*
- **Security Posture Header**: Overall Network Security Grade (`A` to `F`), total risks detected, and one-click `Re-Evaluate Network Security` button.
- **Categorized Recommendation Cards (Covering all 4 PDF Examples + Port Audits)**:
  1. **Weak Connectivity & QoS Alerts**: Triggered when any host exhibits packet loss `> 5%` or average latency `> 100ms` / high jitter. Includes troubleshooting steps (channel interference, duplex mismatch, cable/AP check).
  2. **Unreachable Hosts & Availability Alerts**: Triggered when previously discovered hosts or critical gateways drop offline.
  3. **Firewall & Port Hardening Recommendations**: Generated automatically from Port Scanner findings (e.g., *Port 23 Telnet or Port 21 FTP detected open on 192.168.1.50 — Recommend blocking via host firewall and migrating to SSH/SFTP*).
  4. **Password & Authentication Security Reminders**: Contextual advisories for web admin panels (`80`/`443`/`8080`), SSH (`22`), RDP (`3389`), and router gateways (`192.168.1.1`) warning against default credentials, weak WPA2/WPA3 passphrases, and unencrypted login forms.
- **Email Alert Configuration Panel (`Bonus Feature`)**: Configure SMTP host, port, sender, recipient email, and toggle automatic email alerts for `Host Unreachable` or `Critical Security Finding`, with a `Send Test Alert Email` button.

### Screen 6: Network Diagnostic Report Center (`/reports`) — *Feature 4 & Bonus PDF*
- **Report Builder & History**:
  - Select scan session or generate a fresh full-network diagnostic snapshot.
  - **Live Interactive Report Preview**: Shows the exact structured report containing:
    1. **Report Header**: Date & Time generated, Analyst/Student info, Local Interface & CIDR Network Range.
    2. **Executive Network Performance Summary**: Total devices detected, online/offline ratio, subnet average latency, maximum latency, overall packet loss %, and health grade.
    3. **Discovered Devices Inventory Table**: Hostname, IP Address, MAC Address, Vendor, Status.
    4. **Connectivity & Ping Statistics Table**: Per-host Min/Avg/Max Latency (ms), Jitter, Packet Loss %.
    5. **Security Recommendations & Remediation Plan**: Prioritized findings and firewall/password action items.
  - **Export Buttons**:
    - **`Download Official PDF Report`** (Generated via Python `ReportLab` with clean tables, headers, and summary badges)
    - **`Export CSV`** & **`Export JSON`**

