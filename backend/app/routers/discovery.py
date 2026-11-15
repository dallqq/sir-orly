"""Feature 1 Router: Network Interfaces, Subnet Range & Active Device Discovery."""
from typing import Any, Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlmodel import Session, select
from app.database import get_session
from app.models.device import DiscoveredDevice, ScanSession
from app.services.interface_detector import get_network_interfaces
from app.services.network_scanner import run_subnet_discovery

router = APIRouter(prefix="/discovery", tags=["Feature 1: Network Discovery"])


class ScanRequest(BaseModel):
    cidr: Optional[str] = None
    interface_name: Optional[str] = None
    scan_mode: str = "auto"  # "auto" | "arp" | "icmp" | "simulation"


@router.get("/interfaces")
@router.get("/interface")
def list_network_interfaces(
    interface_name: Optional[str] = Query(default=None, description="Optional preferred NIC name"),
) -> dict[str, Any]:
    """Return all scored network interfaces and the active Local IP, Subnet Mask, Gateway & CIDR."""
    return get_network_interfaces(preferred_interface=interface_name)


@router.post("/scan")
async def trigger_subnet_scan(
    payload: ScanRequest,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    """Run multi-tier subnet discovery (ARP + ICMP + TCP + ARP cache or Campus Lab Simulation)."""
    return await run_subnet_discovery(
        session=session,
        cidr=payload.cidr,
        interface_name=payload.interface_name,
        scan_mode=payload.scan_mode,
    )


@router.get("/devices")
def get_discovered_devices(session: Session = Depends(get_session)) -> dict[str, Any]:
    """Return all discovered subnet devices and the latest scan session summary."""
    devices = session.exec(select(DiscoveredDevice).order_by(DiscoveredDevice.id)).all()
    last_scan = session.exec(select(ScanSession).order_by(ScanSession.id.desc())).first()  # type: ignore[arg-type]
    nic_info = get_network_interfaces()["active_interface"]

    return {
        "active_interface": nic_info,
        "last_scan": last_scan.model_dump(mode="json") if last_scan else None,
        "total_devices": len(devices),
        "online_devices": sum(1 for d in devices if d.is_online),
        "devices": [d.model_dump(mode="json") for d in devices],
    }

