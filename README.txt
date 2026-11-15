================================================================================
NETPULSE NOC — NETWORK MONITORING AND PERFORMANCE ANALYSIS SYSTEM
Course: CCS 234 — Communications and Networking (WVSU - CICT)
================================================================================

1. SYSTEM OVERVIEW
------------------
NetPulse NOC is a full-stack Network Monitoring, Traffic Analysis, and Security
Diagnostic Platform combining:
  - Python 3.11+ FastAPI Networking Engine (`backend/app/`) using Scapy, Socket,
    icmplib, psutil, SQLModel (SQLite WAL + Cloud PostgreSQL), ReportLab PDF,
    and aiosmtplib.
  - Next.js 16 Real-Time Cyber-NOC Web Dashboard (`src/app/`) with Tailwind v4,
    Recharts telemetry charts, React Flow (@xyflow/react) subnet topology map,
    and a Wireshark 3-pane packet inspector.
  - Native Python Tkinter Companion GUI (`backend/tkinter_gui.py`) fulfilling
    the Tkinter GUI bonus requirement.

2. CORE & BONUS FEATURES IMPLEMENTED
------------------------------------
  [Core Feature 1] Network Discovery:
    - Smart NIC Scorer detecting Local IP, Subnet Mask, Default Gateway, MAC,
      and CIDR Network Range (with /24 safety slicing for large campus subnets).
    - 4-Tier Active Host Scanner: Layer 2 Scapy ARP Broadcast + Layer 3 ICMP +
      Layer 4 TCP Port Probe + OS `arp -a` Cache + Campus Lab Simulation Mode.
  [Core Feature 2] Connectivity Testing:
    - 3-Tier Ping Engine (`icmplib` + Native OS PVERY THOROUGLY AND GENERATE INDUSTRY STANDARD AND DETAILED IMPLEMENTATION PLAN WITH CHECKLIST WITH MARKDOWN IN A FOLDER IN THIS SOURCE CODE FOR STEP-BY-STEP PROCESS INCLUDING ALL OF THE TECHNOLOGY THAT WILL BE USED (MAKE SURE IT IS HIGH-STANDARD AND USABLE). IGNORE THE CURRENT NEXT.JS SETUP, LIST ALL OF THE RELEVANT AND PROPER TECH STACK TO BE USED - KEEP NEXT.JS IF YOU THINK ITS NECESSARY. IGNORE THE PRESENTATION, DOCUMENT, AND VIDEP, FOCUS ON THE APP. FOR THE UI, UTILIZE A LIBRARY OR OPEN SOURCE TEMPLATE THAT CAN BE FOLLOWED THAT FOLLOWS THE THEMEing + TCP Handshake Ping) with
      live WebSocket per-sequence RTT and Packet Loss % streaming.
  [Core Feature 3] Network Statistics:
    - Displays Hostname, IP Address, Minimum Latency, Average Latency,
      Maximum Latency, Jitter (ms), and Packet Loss (%).
  [Core Feature 4] Network Report Generator:
    - Generates comprehensive snapshots containing Date/Time, Devices Detected,
      Ping Results, Executive Performance Summary, and Security Recommendations.
  [Core Feature 5] Security Recommendations:
    - Deterministic 4-Category Rule Engine covering:
      (1) Weak Connectivity Alerts
      (2) Unreachable Hosts
      (3) Basic Firewall Recommendations (with Windows netsh & Linux ufw rules)
      (4) Password Security Reminders
  [All 8 Bonus Features Included]:
    1. Native Python Tkinter Companion GUI (`backend/tkinter_gui.py`)
    2. Real-Time Dashboard Telemetry Charts (`Recharts` + `@xyflow/react`)
    3. Export Diagnostic Report to Styled PDF (`ReportLab`), CSV, and JSON
    4. Email Notification Alerts (`aiosmtplib` + Local Outbox Preview)
    5. Async TCP Socket Port Scanner + Service Banner Grabbing
    6. Wireshark Packet Integration (Live Sniffer, .pcap Upload/Download & Desktop Launch)
    7. Real-Time WebSocket Monitoring (`/ws/monitor` 2-second stream)
    8. Hybrid Database Storage (Local SQLite WAL + Cloud PostgreSQL Switcher)

3. HOW TO RUN THE APPLICATION
-----------------------------
Option A — One-Click PowerShell Launcher (Recommended on Windows):
  .\start-netpulse.ps1
  (Or with Tkinter Companion GUI: .\start-netpulse.ps1 -IncludeTkinter)

Option B — Manual Terminal Startup:
  1. Start Python Backend (Port 8000):
     cd backend
     .\.venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  2. Start Next.js Web NOC Dashboard (Port 3000):
     npm run dev
     Open http://localhost:3000 in your browser.

  3. Run Native Python Tkinter Desktop GUI (Optional):
     .\backend\.venv\Scripts\python backend\tkinter_gui.py

4. RUNNING AUTOMATED VERIFICATION TESTS
---------------------------------------
  - Backend Pytest Suite:
    .\backend\.venv\Scripts\pytest backend\tests -v
  - Tkinter Self-Test:
    .\backend\.venv\Scripts\python backend\tkinter_gui.py --self-test
  - Frontend Production Build Check:
    npm run build
================================================================================
