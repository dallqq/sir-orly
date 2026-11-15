"""Tests for Feature 1a: Smart NIC Scorer, Local IP, Subnet Mask & CIDR Calculation."""
from app.services.interface_detector import (
    compute_subnet_ranges,
    get_network_interfaces,
    score_interface,
)


def test_score_interface_prioritizes_wifi_over_virtual_adapters() -> None:
    wifi_score = score_interface("Wi-Fi", "192.168.1.105", True, "192.168.1.105")
    wsl_score = score_interface("vEthernet (WSL)", "172.24.16.1", True, "192.168.1.105")
    vbox_score = score_interface("VirtualBox Host-Only Network", "192.168.56.1", True, "192.168.1.105")
    apipa_score = score_interface("Ethernet 2", "169.254.10.20", True, None)
    loopback_score = score_interface("Loopback Pseudo-Interface 1", "127.0.0.1", True, None)

    assert wifi_score > wsl_score
    assert wifi_score > vbox_score
    assert wifi_score > apipa_score
    assert wifi_score > loopback_score


def test_compute_subnet_ranges_standard_24_and_large_16_cap() -> None:
    sub24 = compute_subnet_ranges("192.168.1.105", "255.255.255.0")
    assert sub24["true_cidr"] == "192.168.1.0/24"
    assert sub24["scan_cidr"] == "192.168.1.0/24"
    assert sub24["usable_hosts"] == 254
    assert sub24["is_large_subnet_capped"] is False

    # Large campus /16 network should safely slice scan_cidr to /24
    sub16 = compute_subnet_ranges("10.20.30.45", "255.255.0.0")
    assert sub16["true_cidr"] == "10.20.0.0/16"
    assert sub16["scan_cidr"] == "10.20.30.0/24"
    assert sub16["usable_hosts"] == 254
    assert sub16["is_large_subnet_capped"] is True


def test_get_network_interfaces_returns_active_nic() -> None:
    data = get_network_interfaces()
    assert "active_interface" in data
    assert "interfaces" in data
    active = data["active_interface"]
    assert active["local_ip"]
    assert "/" in active["subnet_cidr"]

