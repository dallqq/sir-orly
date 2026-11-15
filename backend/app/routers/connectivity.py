"""Features 2, 3 & Bonus Port Scanner Router: Ping Connectivity, QoS Statistics & Socket Port Scanning."""
from typing import Any, Optional, Union
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from app.database import get_session
from app.models.telemetry import HostQoSStats, PortScanResult
from app.services.ping_engine import ping_multiple_hosts
from app.services.port_scanner import scan_host_ports

router = APIRouter(prefix="/connectivity", tags=["Features 2, 3 & Bonus: Connectivity, Stats & Port Scanner"])


class PingRequest(BaseModel):
    targets: Union[list[str], str]
    count: int = 4
    packet_size: int = 32
    timeout_ms: int = 1200
    protocol: str = "auto"  # "auto" | "icmp" | "tcp"


class PortScanRequest(BaseModel):
    target_ip: str
    preset: str = "quick"  # "quick" | "standard" | "custom"
    ports: Optional[Union[str, list[int]]] = None
    timeout_s: float = 0.65


@router.post("/ping")
async def run_ping_test(
    payload: PingRequest,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    """Ping one or multiple devices, stream sequence replies via WS, and return QoS statistics."""
    if isinstance(payload.targets, str):
        target_list = [t.strip() for t in payload.targets.split(",") if t.strip()]
    else:
        target_list = [t.strip() for t in payload.targets if t.strip()]

    if not target_list:
        raise HTTPException(status_code=400, detail="At least one target IP or hostname is required.")

    results = await ping_multiple_hosts(
        session=session,
        targets=target_list,
        count=payload.count,
        packet_size=payload.packet_size,
        timeout_ms=payload.timeout_ms,
        protocol=payload.protocol,
    )
    return {
        "tested_hosts": len(results),
        "results": results,
    }


@router.get("/stats")
def get_network_statistics(session: Session = Depends(get_session)) -> dict[str, Any]:
    """Return Feature 3 Network Statistics Table (Hostname, IP, Avg/Max/Min Latency, Jitter, Packet Loss %)."""
    stats = session.exec(select(HostQoSStats).order_by(HostQoSStats.ip_address)).all()
    rtts = [s.avg_latency_ms for s in stats if s.avg_latency_ms > 0]
    max_rtts = [s.max_latency_ms for s in stats if s.max_latency_ms > 0]
    losses = [s.packet_loss_pct for s in stats]

    return {
        "total_hosts": len(stats),
        "subnet_avg_latency_ms": round(sum(rtts) / len(rtts), 2) if rtts else 0.0,
        "subnet_max_latency_ms": round(max(max_rtts), 2) if max_rtts else 0.0,
        "subnet_avg_packet_loss_pct": round(sum(losses) / len(losses), 2) if losses else 0.0,
        "stats": [s.model_dump(mode="json") for s in stats],
    }


@router.post("/ports/scan")
@router.post("/port-scan")
async def run_socket_port_scan(
    payload: PortScanRequest,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    """Execute async TCP socket port scan with service banner grabbing and OSI Layer 4/7 mapping."""
    if not payload.target_ip.strip():
        raise HTTPException(status_code=400, detail="target_ip is required.")
    return await scan_host_ports(
        session=session,
        target_ip=payload.target_ip,
        preset=payload.preset,
        ports=payload.ports,
        timeout_s=payload.timeout_s,
    )


@router.get("/ports/{ip}")
def get_host_ports(ip: str, session: Session = Depends(get_session)) -> dict[str, Any]:
    """Return persisted port scan findings for a specific IP address or all hosts if `ip == 'all'`."""
    if ip.lower() == "all":
        rows = session.exec(select(PortScanResult).order_by(PortScanResult.ip_address, PortScanResult.port)).all()
    else:
        rows = session.exec(
            select(PortScanResult).where(PortScanResult.ip_address == ip).order_by(PortScanResult.port)
        ).all()
    return {
        "target_ip": ip,
        "count": len(rows),
        "results": [r.model_dump(mode="json") for r in rows],
    }

