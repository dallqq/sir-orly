---
name: netpulse-backend-core
description: >-
  Use this skill when scaffolding or modifying the Python FastAPI backend core,
  SQLModel database schemas (SQLite/PostgreSQL), or the real-time WebSocket
  telemetry broadcast hub for the NetPulse NOC system (Phase 1).
---

# NetPulse Backend Core Skill (`Phase 1`)

## Overview
This skill governs the foundational Python backend located in `backend/`. It sets up the FastAPI server, hybrid SQLite/Cloud PostgreSQL database (`SQLModel`), and the real-time WebSocket manager (`/ws/monitor`).

## Implementation Rules
1. **Directory Structure**: All backend code resides in `backend/app/`.
2. **Database Dual-Mode (`database.py`)**:
   - Default `DATABASE_URL` in `config.py` must be `sqlite:///./netpulse.db`.
   - When using SQLite, pass `connect_args={"check_same_thread": False}` and enable `PRAGMA journal_mode=WAL;`.
   - Support seamless switching to PostgreSQL/Supabase via the `DATABASE_URL` environment variable to satisfy the **Cloud Database Storage** bonus requirement.
3. **Core SQLModel Entities (`backend/app/models/`)**:
   - `DiscoveredDevice`: `id`, `ip_address` (indexed), `mac_address`, `hostname`, `vendor`, `interface_name`, `subnet_cidr`, `is_online`, `is_gateway`, `discovery_method`, `last_rtt_ms`, `first_seen`, `last_seen`.
   - `HostQoSStats`: `id`, `ip_address` (indexed), `hostname`, `packets_sent`, `packets_received`, `packet_loss_pct`, `min_latency_ms`, `avg_latency_ms`, `max_latency_ms`, `jitter_ms`, `ttl`, `updated_at`.
   - `PortScanResult`: `id`, `ip_address`, `port`, `protocol`, `state`, `service_name`, `banner`, `osi_layer`, `risk_level`, `scanned_at`.
   - `SecurityAlert`: `id`, `category` (`CONNECTIVITY` | `AVAILABILITY` | `FIREWALL` | `AUTHENTICATION`), `severity` (`CRITICAL` | `HIGH` | `MEDIUM` | `LOW`), `target_ip`, `title`, `description`, `recommendation`, `created_at`.
   - `DiagnosticReport`: `id`, `created_at`, `interface_name`, `local_ip`, `subnet_cidr`, `total_devices`, `online_devices`, `avg_subnet_latency_ms`, `max_subnet_latency_ms`, `overall_packet_loss_pct`, `health_score`, `summary_json`, `pdf_path`.
4. **WebSocket Manager (`services/ws_manager.py`)**:
   - Maintain a set of active `WebSocket` connections.
   - Expose `async def broadcast(event_type: str, payload: dict)` that wraps messages as `{"type": event_type, "timestamp": iso_now, "data": payload}` and removes disconnected clients cleanly.
   - Include a background task that broadcasts local NIC bandwidth (`psutil.net_io_counters()`) and active host ping updates every 2 seconds when real-time monitoring is active.

## Verification Steps
1. Run `backend/.venv/Scripts/python -c "import app.main; print('OK')"` from `backend/`.
2. Start server and verify `GET http://localhost:8000/api/v1/health` returns `{"status": "healthy"}`.

