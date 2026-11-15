---
name: security-advisor-and-reports
description: >-
  Use this skill when implementing Feature 4 (Network Report Generator),
  Feature 5 (Security Recommendations: weak connectivity alerts, unreachable
  hosts, firewall recommendations, password security reminders), Bonus PDF
  Report Export (ReportLab), and Bonus Email Notification Alerts (Phase 5).
---

# Security Advisor, PDF Report Generator & Email Alerts Skill (`Phase 5 — Features 4, 5 & Bonus`)

## Overview
Implements **Feature 4 (Network Report Generator)**, **Feature 5 (Security Recommendations)**, **Bonus PDF Export**, and **Bonus Email Notifications**.

## Implementation Rules
1. **Feature 5 — Security Recommendation Engine (`backend/app/services/security_advisor.py`)**:
   - Must always evaluate and produce recommendations covering all 4 PDF-mandated categories:
     1. **Weak Connectivity Alerts (`CONNECTIVITY`)**:
        - Check `HostQoSStats` for any host with `avg_latency_ms > 80.0`, `jitter_ms > 25.0`, or `0 < packet_loss_pct < 100`.
        - Provide specific remediation (check Wi-Fi signal attenuation, 2.4GHz vs 5GHz interference, physical RJ45 cabling, or router QoS bufferbloat).
     2. **Unreachable Hosts (`AVAILABILITY`)**:
        - Check `DiscoveredDevice` (`is_online == False`) and `HostQoSStats` (`packet_loss_pct >= 100.0`).
        - Provide specific troubleshooting (verify power state, NIC link status, ARP cache staleness, or Windows Firewall inbound ICMP Echo Request block).
     3. **Basic Firewall Recommendations (`FIREWALL`)**:
        - Check `PortScanResult` for risky open ports (`21/FTP`, `23/Telnet`, `135/RPC`, `139/NetBIOS`, `445/SMB`, `3389/RDP`, `5900/VNC`, `3306/MySQL`, `6379/Redis`).
        - Output concrete Windows Firewall (`netsh advfirewall`) and Linux (`ufw`) lockdown commands. Always include a baseline inbound firewall hardening recommendation even if no ports are open.
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
3. **Bonus — Email Notification Service (`backend/app/services/email_notifier.py`)**:
   - Use `aiosmtplib` to send formatted HTML alert emails when triggered manually or automatically upon host failure / critical security finding.
   - Include a safe local simulation log mode when SMTP credentials are not provided so tests and classroom demos work without external internet dependencies.

## Verification Steps
1. Run `pytest backend/tests/test_security_advisor.py` to confirm all 4 recommendation categories generate structured alerts.
2. Run `pytest backend/tests/test_report_generator.py` to confirm generated PDF starts with `%PDF-1.` and contains non-zero bytes.

