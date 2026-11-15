"""Tests for Course Topic 7 & Bonus Feature 6: Wireshark .pcap Analyzer & OSI Dissector."""
from pathlib import Path
from sqlmodel import Session
from app.services.packet_analyzer import (
    build_sample_lan_packets,
    capture_packets,
    dissect_scapy_packet,
    ensure_demo_pcap,
    load_pcap_session,
)


def test_osi_dissection_and_hex_dump() -> None:
    pkts = build_sample_lan_packets()
    assert len(pkts) >= 10
    dissected = [dissect_scapy_packet(p, i + 1, float(pkts[0].time)) for i, p in enumerate(pkts)]
    protocols = {d.protocol for d in dissected}
    assert "ARP" in protocols
    assert "ICMP" in protocols
    assert "DNS" in protocols
    assert "TCP" in protocols
    assert "HTTP" in protocols
    assert "0000" in dissected[0].hex_dump


def test_demo_pcap_and_capture_session(db_session: Session) -> None:
    demo = ensure_demo_pcap(db_session)
    assert Path(demo.file_path).exists()
    loaded = load_pcap_session(db_session, demo.id)  # type: ignore[arg-type]
    assert len(loaded["packets"]) >= 10

    cap = capture_packets(db_session, interface_name="Auto", bpf_filter="tcp", limit=10, timeout=1.0)
    assert cap["session"]["packet_count"] >= 1
    assert Path(cap["session"]["file_path"]).exists()

