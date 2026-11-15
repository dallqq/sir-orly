---
name: netpulse-backend-core
description: >-
  Use this skill when scaffolding or modifying the Python FastAPI backend core,
  SQLModel database schemas (SQLite/PostgreSQL), the real-time WebSocket
  telemetry broadcast hub, or the Native Tkinter Companion GUI for NetPulse NOC (Phase 1 & 5).
---

# NetPulse Backend Core Skill (`Phase 1`)

## Overview
This skill governs the foundational Python backend located in `backend/`. It sets up the FastAPI server, hybrid SQLite WAL / Cloud PostgreSQL database (`SQLModel`), the unified real-time WebSocket manager (`/ws/monitor`), and the Native Python `Tkinter` Companion GUI (`backend/tkinter_gui.py`).

## Implementation Rules
1. **Directory Structure**: All backend API code resides in `backend/app/`.
2. **Database Dual-Mode (`database.py` — Bonus Feature 8: Cloud Database Storage)**:
   - Default `DATABASE_URL` in `config.py` must be `sqlite:///./netpulse.db`, with optional `CLOUD_DATABASE_URL` for PostgreSQL/Supabase.
   - When using SQLite, pass `connect_args={"check_same_thread": False}` and enable `PRAGMA journal_mode=WAL;`.
   - Expose `GET /api/v1/health` and `POST /api/v1/system/database-mode` so the user can view or test switching between Local SQLite and Cloud PostgreSQL (Supabase / Neon) directly from the UI.
3. **Canonical SQLModel Entities (`backend/app/models/`)**:
   - `ScanSession` & `DiscoveredDevice` (`models/device.py`): `id`, `ip_address` (indexed, unique), `mac_address`, `hostname`, `vendor`, `os_guess`, `interface_name`, `subnet_cidr`, `is_online`, `is_gateway`, `is_local_host`, `discovery_method`, `last_rtt_ms`, `open_ports_summary`, `first_seen`, `last_seen`.
   - `PingSample`, `HostQoSStats`, & `PortScanResult` (`models/telemetry.py`):
     - `HostQoSStats`: `id`, `ip_address` (indexed, unique), `hostname`, `packets_sent`, `packets_received`, `packet_loss_pct`, `min_latency_ms`, `avg_latency_ms`, `max_latency_ms`, `jitter_ms`, `last_ttl`, `ping_method`, `updated_at`.
     - `PortScanResult`: `id`, `ip_address`, `port`, `protocol`, `state`, `service_name`, `banner`, `osi_layer`, `risk_level`, `scanned_at`.
   - `PcapCaptureSession` (`models/packet.py`): `id`, `filename`, `file_path`, `interface_name`, `bpf_filter`, `packet_count`, `capture_source`, `protocol_breakdown_json`, `created_at`.
   - `SecurityAlert`, `DiagnosticReport`, & `EmailAlertLog` (`models/security.py`).
4. **Single Unified WebSocket Manager (`services/ws_manager.py` — Bonus Feature 7: Real-Time Monitoring)**:
   - Mount on `/ws/monitor` in `app/main.py`.
   - Maintain a set of active `WebSocket` connections.
   - Expose `async def broadcast(event_type: str, payload: dict)` that wraps messages as `{"type": event_type, "timestamp": iso_now, "data": payload}` and removes disconnected clients cleanly.
   - Include a background task that broadcasts local NIC bandwidth (`psutil.net_io_counters()`) and active host ping updates every 2 seconds (`event_type="telemetry_tick"`).

## Verification Steps
1. Run `backend/.venv/Scripts/python -c "import app.main; print('OK')"` from `backend/`.
2. Start server and verify `GET http://localhost:8000/api/v1/health` returns `{"status": "healthy"}`.
