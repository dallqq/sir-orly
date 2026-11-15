"""Canonical SQLModel tables and schemas for Wireshark Packet Analysis (Course Topic 7 & Bonus)."""
from datetime import datetime, timezone
from typing import Any, Optional
from pydantic import BaseModel
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class PcapCaptureSession(SQLModel, table=True):
    """Metadata record for a saved or uploaded Wireshark .pcap session."""

    __tablename__ = "pcap_capture_sessions"

    id: Optional[int] = Field(default=None, primary_key=True)
    filename: str
    file_path: str
    interface_name: str = Field(default="Auto")
    bpf_filter: str = Field(default="all")
    packet_count: int = Field(default=0)
    capture_source: str = Field(default="LIVE_SCAPY")  # "LIVE_SCAPY" | "LIVE_SOCKET_FALLBACK" | "UPLOADED_PCAP" | "DEMO_PCAP"
    protocol_breakdown_json: str = Field(default="{}")
    created_at: datetime = Field(default_factory=utc_now)


class OsiLayersSchema(BaseModel):
    """OSI Layer 2, 3, 4, and 7 dissection tree for a packet."""

    layer_2_datalink: dict[str, Any]
    layer_3_network: dict[str, Any]
    layer_4_transport: dict[str, Any]
    layer_7_application: dict[str, Any]


class PacketDissectionSchema(BaseModel):
    """Full Wireshark-style packet representation."""

    index: int
    timestamp: str
    length: int
    protocol: str
    src_ip: str
    dst_ip: str
    src_mac: str = "00:00:00:00:00:00"
    dst_mac: str = "00:00:00:00:00:00"
    src_port: Optional[int] = None
    dst_port: Optional[int] = None
    info: str
    osi_layers: OsiLayersSchema
    hex_dump: str

