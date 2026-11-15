"""Tests for Features 2 & 3: 3-Tier Ping Engine & QoS Statistics Calculation."""
import pytest
from sqlmodel import Session
from app.services.ping_engine import calculate_qos_metrics, ping_host


def test_calculate_qos_metrics_normal_and_total_loss() -> None:
    # 0% packet loss with 4 RTT samples
    m_ok = calculate_qos_metrics([2.0, 4.0, 6.0, 4.0], sent=4)
    assert m_ok["min_latency_ms"] == 2.0
    assert m_ok["avg_latency_ms"] == 4.0
    assert m_ok["max_latency_ms"] == 6.0
    assert m_ok["jitter_ms"] == 2.0
    assert m_ok["packet_loss_pct"] == 0.0

    # 100% packet loss (zero division guard)
    m_loss = calculate_qos_metrics([], sent=4)
    assert m_loss["min_latency_ms"] == 0.0
    assert m_loss["avg_latency_ms"] == 0.0
    assert m_loss["max_latency_ms"] == 0.0
    assert m_loss["jitter_ms"] == 0.0
    assert m_loss["packet_loss_pct"] == 100.0


@pytest.mark.asyncio
async def test_ping_localhost_and_unreachable_ip(db_session: Session) -> None:
    # Localhost should succeed with 0% loss
    local_res = await ping_host(session=db_session, target_ip="127.0.0.1", count=2, timeout_ms=800)
    assert local_res["ip_address"] == "127.0.0.1"
    assert local_res["packets_sent"] == 2
    assert local_res["packets_received"] >= 1
    assert local_res["packet_loss_pct"] < 100.0

    # TEST-NET-1 unreachable address (192.0.2.254) with short timeout should handle timeouts cleanly
    unreach_res = await ping_host(session=db_session, target_ip="192.0.2.254", count=1, timeout_ms=250, protocol="icmp")
    assert unreach_res["ip_address"] == "192.0.2.254"
    assert unreach_res["packets_sent"] == 1
    assert 0.0 <= unreach_res["packet_loss_pct"] <= 100.0

