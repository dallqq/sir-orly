---
name: security-advisor-and-reports
description: >-
  Use this skill when implementing Feature 4 (Network Report Generator),
  Feature 5 (Security Recommendations: weak connectivity alerts, unreachable
  hosts, firewall recommendations, password security reminders), Bonus PDF
  Report Export (ReportLab), Bonus Email Notification Alerts, and Bonus Tkinter GUI (Phase 5).
---

# Security Advisor, PDF Report Generator, Email Alerts & Tkinter GUI Skill (`Phase 5 — Features 4, 5 & Bonus`)

## Overview
Implements **Feature 4 (Network Report Generator)**, **Feature 5 (Security Recommendations)**, **Bonus PDF Export (`ReportLab`)**, **Bonus Email Notifications (`aiosmtplib` + Local Outbox)**, and **Bonus Native Tkinter Companion GUI (`backend/tkinter_gui.py`)**.

## Implementation Rules
1. **Feature 5 — 4-Category Security Recommendation Engine (`backend/app/services/security_advisor.py`)**:
   - Must always evaluate and produce recommendations covering all 4 PDF-mandated categories:
     1. **Weak Connectivity Alerts (`CONNECTIVITY`)**:
        - Check `HostQoSStats` for any host with `avg_latency_ms > 80.0`, `jitter_ms > 25.0`, or `0 < packet_loss_pct < 100`.
        - Provide specific remediation (check Wi-Fi signal attenuation, 2.4GHz vs 5GHz interference, physical RJ45 cabling, or router QoS bufferbloat). If all hosts have `< 80ms` and `0%` loss, emit a `LOW` severity baseline QoS verification card so the category is always demonstrably active.
     2. **Unreachable Hosts (`AVAILABILITY`)**:
        - Check `DiscoveredDevice` (`is_online == False`) and `HostQoSStats` (`packet_loss_pct >= 100.0`).
        - Provide specific troubleshooting (verify power state, NIC link status, ARP cache staleness, or Windows Firewall inbound ICMP Echo Request block).
     3. **Basic Firewall Recommendations (`FIREWALL`)**:
        - Check `PortScanResult` for risky open ports (`21/FTP`, `23/Telnet`, `135/RPC`, `139/NetBIOS`, `445/SMB`, `3389/RDP`, `5900/VNC`, `3306/MySQL`, `6379/Redis`, `80/HTTP`).
        - Output concrete Windows Firewall (`netsh advfirewall firewall add rule ...`) and Linux (`ufw deny ...`) lockdown commands. Always include a baseline inbound firewall hardening recommendation even if no risky ports are open.
     4. **Password Security Reminders (`AUTHENTICATION`)**:
        - Generate targeted reminders for detected Default Gateways/Routers (`is_gateway == True`), web admin consoles (`80/443/8080`), SSH (`22`), and general LAN security (changing default admin credentials, enforcing WPA3/WPA2-AES, disabling WPS, rotating passwords).
2. **Feature 4 & Bonus — Diagnostic Report & PDF Generator (`backend/app/services/report_generator.py`)**:
   - Every report MUST include:
     - **Date and Time** (timestamp of report generation)
     - **Network Interface & Range** (Local IP, Subnet Mask, CIDR, Gateway)
     - **Devices Detected** (Full table of IP, Hostname, MAC, Vendor, Status)
     - **Ping Results & Network Statistics** (Per-host Hostname, IP, Avg Latency, Max Latency, Min Latency, Jitter, Packet Loss %)
     - **Network Performance Summary** (Executive summary paragraph + overall health score `0-100`)
     - **Security Recommendations** (Prioritized table of findings)
   - Use **`reportlab`** (`SimpleDocTemplate`, `Table`, `TableStyle`, `Paragraph`) to generate clean, multi-page PDF files saved to `backend/reports/NetPulse_Report_<id>.pdf` and served via `GET /api/v1/reports/{id}/pdf`.
3. **Bonus — Email Notification Service & Local Outbox (`backend/app/services/email_notifier.py`)**:
   - Use `aiosmtplib` to send formatted HTML alert emails when SMTP credentials are configured, AND always persist the email into `EmailAlertLog` (exposed via `GET /api/v1/security/alerts/outbox`) so the user and professor can view the exact rendered email alert inside the UI even on an offline classroom network.
4. **Bonus — Native Python Tkinter Companion GUI (`backend/tkinter_gui.py`)**:
   - Build a dark-themed `tkinter.ttk` desktop window (`#090D16` background, `#06B6D4` accents) with tabs for Network Discovery, Ping & Statistics, Port Scanner & Security, PDF Report generation, and a 1-click button to launch `http://localhost:3000`. Support `--self-test` CLI flag for automated testing.

## Verification Steps
1. Run `pytest backend/tests/test_security_advisor.py` and `test_report_generator.py`.
2. Run `backend\.venv\Scripts\python backend/tkinter_gui.py --self-test` to verify the Tkinter GUI initializes cleanly.
