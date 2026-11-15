"""Canonical SQLModel tables for Connectivity Testing, QoS Statistics & Port Scanning (Features 2, 3 & Bonus)."""
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class PingSample(SQLModel, table=True):
    """Individual ping sequence record (Feature 2)."""

    __tablename__ = "ping_samples"

    id: Optional[int] = Field(default=None, primary_key=True)
    ip_address: str = Field(index=True)
    seq: int = Field(default=1)
    rtt_ms: Optional[float] = Field(default=None)
    ttl: Optional[int] = Field(default=None)
    status: str = Field(default="SUCCESS")  # "SUCCESS" | "TIMEOUT" | "ERROR"
    protocol: str = Field(default="ICMP")  # "ICMP" | "TCP"
    timestamp: datetime = Field(default_factory=utc_now)


class HostQoSStats(SQLModel, table=True):
    """Feature 3 Aggregate Network Statistics per host."""

    __tablename__ = "host_qos_stats"

    id: Optional[int] = Field(default=None, primary_key=True)
    ip_address: str = Field(index=True, unique=True)
    hostname: str = Field(default="Unknown Host")
    packets_sent: int = Field(default=0)
    packets_received: int = Field(default=0)
    packet_loss_pct: float = Field(default=0.0)
    min_latency_ms: float = Field(default=0.0)
    avg_latency_ms: float = Field(default=0.0)
    max_latency_ms: float = Field(default=0.0)
    jitter_ms: float = Field(default=0.0)
    last_ttl: Optional[int] = Field(default=None)
    ping_method: str = Field(default="ICMP")  # "ICMP" | "OS_PING" | "TCP_PING"
    updated_at: datetime = Field(default_factory=utc_now)


class PortScanResult(SQLModel, table=True):
    """Bonus Feature: Socket TCP/UDP Port Scan and Service Banner result."""

    __tablename__ = "port_scan_results"

    id: Optional[int] = Field(default=None, primary_key=True)
    ip_address: str = Field(index=True)
    port: int = Field(index=True)
    protocol: str = Field(default="TCP")  # "TCP" | "UDP"
    state: str = Field(default="OPEN")  # "OPEN" | "CLOSED" | "FILTERED"
    service_name: str = Field(default="unknown")
    banner: str = Field(default="")
    osi_layer: str = Field(default="Layer 4 (Transport) / Layer 7 (Application)")
    risk_level: str = Field(default="LOW")  # "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
    scanned_at: datetime = Field(default_factory=utc_now)

