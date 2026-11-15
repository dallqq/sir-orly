"""Canonical SQLModel tables for Network Discovery (Feature 1)."""
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ScanSession(SQLModel, table=True):
    """Records metadata for each network discovery sweep."""

    __tablename__ = "scan_sessions"

    id: Optional[int] = Field(default=None, primary_key=True)
    started_at: datetime = Field(default_factory=utc_now)
    completed_at: datetime = Field(default_factory=utc_now)
    interface_name: str = Field(default="Default")
    local_ip: str = Field(default="127.0.0.1")
    subnet_cidr: str = Field(default="127.0.0.0/24")
    scan_mode: str = Field(default="HYBRID")  # "HYBRID" | "ARP" | "ICMP" | "SIMULATION"
    total_hosts_scanned: int = Field(default=0)
    active_hosts_found: int = Field(default=0)


class DiscoveredDevice(SQLModel, table=True):
    """Represents a discovered host on the subnet (Feature 1)."""

    __tablename__ = "discovered_devices"

    id: Optional[int] = Field(default=None, primary_key=True)
    ip_address: str = Field(index=True, unique=True)
    mac_address: str = Field(default="00:00:00:00:00:00")
    hostname: str = Field(default="Unknown Host")
    vendor: str = Field(default="Unknown Vendor")
    os_guess: str = Field(default="Unknown OS")
    interface_name: str = Field(default="Default")
    subnet_cidr: str = Field(default="192.168.1.0/24")
    is_online: bool = Field(default=True)
    is_gateway: bool = Field(default=False)
    is_local_host: bool = Field(default=False)
    discovery_method: str = Field(default="ICMP_L3")  # "ARP_L2" | "ICMP_L3" | "TCP_L4" | "ARP_CACHE" | "SIMULATED"
    last_rtt_ms: Optional[float] = Field(default=None)
    open_ports_summary: str = Field(default="")
    first_seen: datetime = Field(default_factory=utc_now)
    last_seen: datetime = Field(default_factory=utc_now)

