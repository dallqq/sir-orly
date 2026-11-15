---
name: network-qa-and-verification
description: >-
  Use this skill when writing or running automated backend pytest suites,
  frontend TypeScript/Next.js build checks, end-to-end integration tests, and
  auditing the completed application against the CCS 234 grading rubric (Phase 8).
---

# Network QA & Rubric Verification Skill (`Phase 8`)

## Overview
Validates that every backend networking module, API endpoint, WebSocket stream, PDF export, and Next.js UI page passes automated tests and satisfies 100% of the CCS 234 Final Project grading criteria.

## Verification Checklist & Commands
1. **Backend Automated Pytest Suite (`backend/tests/`)**:
   - Run `backend\.venv\Scripts\pytest backend/tests -v`
   - Must test and pass:
     - `test_interface_detector.py`: Local IP, Subnet Mask, and CIDR range calculation (`Feature 1`).
     - `test_network_scanner.py`: Host discovery, ARP cache parser, and MAC OUI vendor lookup (`Feature 1`).
     - `test_ping_engine.py`: Ping connectivity test against `127.0.0.1`, verifying RTT (`min`, `avg`, `max`, `jitter`) and `packet_loss_pct` (`Features 2 & 3`).
     - `test_port_scanner.py`: Ephemeral local TCP server socket scan and banner grab (`Bonus`).
     - `test_packet_analyzer.py`: Scapy `.pcap` creation, reading, and OSI Layer 2–7 dissection (`Topic 7 & Bonus`).
     - `test_security_advisor.py`: Triggers for Weak Connectivity, Unreachable Hosts, Firewall Rules, and Password Security (`Feature 5`).
     - `test_report_generator.py`: Full diagnostic report creation and valid `%PDF` byte output (`Feature 4 & Bonus`).
2. **Frontend Static & Production Build Verification**:
   - Run `npm run lint` and `npm run build` in root workspace.
3. **One-Click Startup Script Verification**:
   - Verify `start-netpulse.ps1` cleanly launches both the FastAPI backend (`http://localhost:8000`) and Next.js frontend (`http://localhost:3000`).

