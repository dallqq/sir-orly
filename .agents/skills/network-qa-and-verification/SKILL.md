---
name: network-qa-and-verification
description: >-
  Use this skill when writing or running automated backend pytest suites,
  Tkinter GUI self-tests, frontend TypeScript/Next.js build checks, end-to-end
  integration tests, and auditing the completed application against the CCS 234 grading rubric (Phase 8).
---

# Network QA & Rubric Verification Skill (`Phase 8`)

## Overview
Validates that every backend networking module, API endpoint, WebSocket stream, PDF export, Native Tkinter GUI, and Next.js UI page passes automated tests and satisfies 100% of the CCS 234 Final Project grading criteria.

## Verification Checklist & Commands
1. **Backend Automated Pytest Suite (`backend/tests/`)**:
   - Run `backend\.venv\Scripts\pytest backend/tests -v`
   - Must test and pass:
     - `test_interface_detector.py`: Local IP, virtual NIC filtering, Subnet Mask, and CIDR range calculation (`Feature 1`).
     - `test_network_scanner.py`: Host discovery, ARP cache parser, offline MAC OUI vendor lookup, and Campus Simulation mode (`Feature 1`).
     - `test_ping_engine.py`: 3-tier Ping connectivity test against `127.0.0.1` and unreachable host handling, verifying RTT (`min`, `avg`, `max`, `jitter`) and `packet_loss_pct` (`Features 2 & 3`).
     - `test_port_scanner.py`: Ephemeral local TCP server socket scan and banner grab (`Bonus`).
     - `test_packet_analyzer.py`: Scapy `.pcap` creation, reading, active socket synthesizer fallback, and OSI Layer 2–7 dissection (`Topic 7 & Bonus`).
     - `test_security_advisor.py`: Triggers for Weak Connectivity, Unreachable Hosts, Firewall Rules, Password Security, and Email Outbox (`Feature 5 & Bonus`).
     - `test_report_generator.py`: Full diagnostic report creation and valid `%PDF-1.` byte output (`Feature 4 & Bonus`).
2. **Native Tkinter Companion GUI Verification**:
   - Run `backend\.venv\Scripts\python backend/tkinter_gui.py --self-test` and verify exit code `0`.
3. **Frontend Static & Production Build Verification**:
   - Run `npm run build` in root workspace and confirm zero TypeScript or Next.js build errors.
4. **One-Click Startup & Submission Readiness**:
   - Verify `start-netpulse.ps1` and root `README.txt` exist and cleanly document/launch the FastAPI backend (`http://localhost:8000`), Next.js Web NOC (`http://localhost:3000`), and Native Tkinter GUI (`backend/tkinter_gui.py`).
