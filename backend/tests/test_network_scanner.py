"""Tests for Feature 1b: Offline OUI Vendor Lookup & Multi-Tier Subnet Discovery."""
import pytest
from sqlmodel import Session
from app.services.network_scanner import run_subnet_discovery
from app.services.oui_lookup import lookup_mac_vendor, normalize_mac


def test_oui_lookup_offline_and_randomized_mac() -> None:
    assert normalize_mac("00-1a-2b-3c-4d-5e") == "00:1A:2B:3C:4D:5E"
    assert lookup_mac_vendor("00:1A:2B:3C:4D:5E") == "Cisco Systems"
    assert lookup_mac_vendor("3C:22:FB:11:22:33") == "Apple, Inc."
    assert "Randomized" in lookup_mac_vendor("02:11:22:33:44:55")


@pytest.mark.asyncio
async def test_campus_lab_simulation_discovery(db_session: Session) -> None:
    res = await run_subnet_discovery(session=db_session, scan_mode="simulation")
    assert "devices" in res
    assert len(res["devices"]) >= 6
    ips = [d["ip_address"] for d in res["devices"]]
    vendors = [d["vendor"] for d in res["devices"]]
    assert any("Cisco" in v for v in vendors)
    assert len(ips) == len(set(ips))

