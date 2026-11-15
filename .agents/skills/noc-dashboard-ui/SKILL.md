---
name: noc-dashboard-ui
description: >-
  Use this skill when building or styling the Next.js 16 Frontend NOC/SOC
  Dashboard (Phases 6 & 7) following the shadcn-admin layout, Tremor/Recharts
  telemetry charts, React Flow subnet topology graph, and Wireshark 3-pane
  packet inspector in the Cyber-NOC Obsidian dark theme.
---

# NOC Dashboard UI Skill (`Phases 6 & 7 — Frontend`)

## Overview
Builds the industry-standard **Next.js 16.4 App Router** frontend following the **`shadcn-admin`** layout architecture and **Tremor / Cloudflare Radar** dark telemetry design system.

## Implementation Rules
1. **Next.js Version & Rules Compliance**:
   - Check `node_modules/next/dist/docs/` as required by `AGENTS.md` before using any Next.js-specific server/routing APIs.
   - All interactive telemetry dashboards use `"use client"` components backed by `@tanstack/react-query`, `zustand`, and the unified `/ws/monitor` WebSocket hook.
2. **Theme & Offline-Safe Typography (`src/app/globals.css`)**:
   - Enforce dark-mode NOC styling by default: deep slate background (`#090D16`), elevated slate cards (`#0F172A` with `#1E293B` border), cyan primary (`#06B6D4`), emerald online (`#10B981`), amber warning (`#F59E0B`), and rose critical (`#EF4444`).
   - Use an offline-safe font stack (`'Geist', 'Inter', 'Segoe UI', system-ui, sans-serif` and `'Geist Mono', 'JetBrains Mono', 'Cascadia Mono', 'Consolas', monospace`) with `font-mono tabular-nums` applied to all IP addresses, MAC addresses, CIDR ranges, port numbers, RTT latencies, packet loss percentages, and hex dumps.
3. **Usability & Cross-Page Quick Actions**:
   - Every host row in `/discovery` and `/` must include 1-click buttons to **Ping Host** (`/connectivity?target=IP&autostart=ping`), **Scan Ports** (`/connectivity?target=IP&tab=ports&autostart=scan`), and **Capture Traffic** (`/packets?filter=host IP`).
   - Top status bar must include an **Active NIC Switcher Dropdown**, a **Quick Subnet Scan** button, and a **Campus Lab Simulation Mode** button for AP-isolated networks.
4. **Required Pages & Feature Mapping**:
   - `/` (`src/app/page.tsx`): NOC Overview Dashboard — 4 KPI cards, Real-time Latency Area Chart (`Recharts`), Bandwidth Throughput Chart, Active Devices quick view, and Security Posture widget.
   - `/discovery` (`src/app/discovery/page.tsx`): **Feature 1** — Displays Local IP, Interface, Subnet Mask, Gateway, and CIDR Range prominently at top; includes Scan Controls (`Auto`, `ARP`, `ICMP`, `Simulation`), Sortable Device Inventory Table, and Interactive Subnet Topology Map (`@xyflow/react`).
   - `/connectivity` (`src/app/connectivity/page.tsx`): **Features 2 & 3 + Bonus Port Scanner** — Multi-host Ping Tester, Live Ping Sequence Console, **Network Statistics Table** (`Hostname`, `IP Address`, `Average Latency`, `Maximum Latency`, `Min Latency`, `Jitter`, `Packet Loss %`), Latency Bar Chart, and Async Socket Port Scanner tab.
   - `/packets` (`src/app/packets/page.tsx`): **Wireshark Integration** — Live packet capture controls with BPF filters, `.pcap` upload, **`Download .pcap for Wireshark`**, **`Launch in Wireshark Desktop`**, Protocol breakdown chart, and Wireshark 3-pane inspector (Packet Table + OSI Layer 2/3/4/7 Tree + Hex/ASCII view).
   - `/security` (`src/app/security/page.tsx`): **Feature 5 + Bonus Email & Cloud DB** — Security Score gauge, categorized recommendations (`Weak Connectivity`, `Unreachable Hosts`, `Firewall Recommendations`, `Password Security Reminders`), SMTP Email Alert dispatcher + **Local Outbox Preview Table**, and **Cloud Database Storage (`SQLite` / `PostgreSQL`)** status panel.
   - `/reports` (`src/app/reports/page.tsx`): **Feature 4 + Bonus PDF** — One-click Diagnostic Report generator, full on-screen formatted report preview (Date/Time, Devices Detected, Ping Results, Performance Summary, Security Recommendations), and **Export to PDF / CSV / JSON** buttons.

## Verification Steps
1. Run `npm run build` in the workspace root to verify zero TypeScript or Next.js build errors.
2. Verify all 6 routes render cleanly and connect to `http://localhost:8000/api/v1`.
