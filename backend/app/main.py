"""FastAPI Entry Point, CORS, System Endpoints & Unified WebSocket Hub (/ws/monitor)."""
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Optional
from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlmodel import Session
from app.config import settings
from app.database import get_database_status, get_engine, get_session, init_db, switch_database_mode
from app.routers import connectivity, discovery, packets, reports, security
from app.services.interface_detector import get_network_interfaces
from app.services.ws_manager import ws_manager


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Initialize SQLite/PostgreSQL tables and launch 2s telemetry task."""
    init_db()
    await ws_manager.start_background_monitor()
    yield
    await ws_manager.stop_background_monitor()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "CCS 234 Final Project — Full-Stack Network Monitoring, Performance Analysis, "
        "Wireshark Traffic Inspection, and Security Advisory Engine."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(discovery.router, prefix=settings.api_prefix)
app.include_router(connectivity.router, prefix=settings.api_prefix)
app.include_router(packets.router, prefix=settings.api_prefix)
app.include_router(security.router, prefix=settings.api_prefix)
app.include_router(reports.router, prefix=settings.api_prefix)


class DatabaseModeRequest(BaseModel):
    mode: str = "SQLITE_LOCAL"  # "SQLITE_LOCAL" | "CLOUD_POSTGRESQL"
    cloud_database_url: Optional[str] = None


class MonitoringToggleRequest(BaseModel):
    enabled: bool = True


def _check_npcap_installed() -> bool:
    npcap_dir = Path(r"C:\Windows\System32\Npcap")
    return npcap_dir.exists()


@app.get("/api/v1/health")
def health_check() -> dict[str, Any]:
    """Return backend health, active database mode, Npcap availability, and active NIC."""
    nic_data = get_network_interfaces()
    npcap_ok = _check_npcap_installed()
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
        "database": get_database_status(),
        "packet_engine": {
            "npcap_installed": npcap_ok,
            "mode": "Npcap Layer 2 Promiscuous + Scapy" if npcap_ok else "Scapy + Active Socket Synthesizer Fallback (L3/L4)",
            "wireshark_desktop_available": Path(r"C:\Program Files\Wireshark\Wireshark.exe").exists(),
        },
        "realtime_monitoring": {
            "enabled": settings.realtime_monitoring_enabled,
            "interval_seconds": settings.telemetry_interval_s,
            "active_ws_clients": len(ws_manager.active_connections),
        },
        "network_status": {
            "internet_reachable": nic_data.get("internet_reachable", False),
            "connection_state": nic_data.get("connection_state", "LAN_ONLY"),
            "outbound_ip": nic_data.get("outbound_ip"),
            "hostname": nic_data.get("hostname", "localhost"),
        },
        "active_interface": nic_data["active_interface"],
    }


@app.post("/api/v1/system/database-mode")
def update_database_mode(payload: DatabaseModeRequest) -> dict[str, Any]:
    """Switch or test connection between Local SQLite WAL and Cloud PostgreSQL (Bonus Feature 8)."""
    return switch_database_mode(mode=payload.mode, cloud_url=payload.cloud_database_url)


@app.post("/api/v1/system/monitoring-toggle")
def toggle_realtime_monitoring(payload: MonitoringToggleRequest) -> dict[str, Any]:
    """Enable or pause the 2-second real-time WebSocket telemetry stream."""
    settings.realtime_monitoring_enabled = payload.enabled
    return {
        "enabled": settings.realtime_monitoring_enabled,
        "interval_seconds": settings.telemetry_interval_s,
    }


@app.post("/api/v1/system/seed-lab")
async def seed_campus_lab_data(session: Session = Depends(get_session)) -> dict[str, Any]:
    """One-click seed of realistic Campus Lab topology, QoS stats, open ports, and security alerts."""
    from app.services.network_scanner import run_subnet_discovery
    from app.services.security_advisor import evaluate_network_security

    scan_res = await run_subnet_discovery(session=session, scan_mode="simulation")
    sec_res = evaluate_network_security(session=session)
    from app.services.packet_analyzer import ensure_demo_pcap
    ensure_demo_pcap(session=session)
    return {
        "status": "seeded",
        "scan_summary": scan_res["scan_session"],
        "devices_count": len(scan_res["devices"]),
        "security_score": sec_res["security_score"],
        "security_grade": sec_res["security_grade"],
    }


@app.websocket("/ws/monitor")
async def websocket_monitor_endpoint(websocket: WebSocket) -> None:
    """Unified real-time telemetry WebSocket stream."""
    await ws_manager.connect(websocket)
    try:
        # Send immediate initial bandwidth snapshot upon connection
        await websocket.send_json(
            {
                "type": "connected",
                "data": {
                    "bandwidth": ws_manager.get_bandwidth_snapshot(),
                    "monitoring_enabled": settings.realtime_monitoring_enabled,
                },
            }
        )
        while True:
            msg = await websocket.receive_text()
            if msg.strip().lower() == "ping":
                await websocket.send_json({"type": "pong", "data": {}})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:  # noqa: BLE001
        ws_manager.disconnect(websocket)

