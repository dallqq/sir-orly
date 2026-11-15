"""Feature 5: 4-Category Security & Connectivity Recommendation Rule Engine."""
from datetime import datetime, timezone
from typing import Any
from sqlmodel import Session, select
from app.models.device import DiscoveredDevice
from app.models.security import SecurityAlert
from app.models.telemetry import HostQoSStats, PortScanResult

HIGH_RISK_PORTS: dict[int, tuple[str, str, str, str]] = {
    21: (
        "CRITICAL",
        "Insecure Cleartext FTP Service Exposed (Port 21)",
        "FTP transmits login credentials and files in unencrypted plaintext over TCP port 21, making it vulnerable to ARP spoofing and Wireshark packet sniffing.",
        "Disable legacy FTP and migrate to SFTP (SSH File Transfer Protocol over Port 22) or FTPS.",
    ),
    23: (
        "CRITICAL",
        "Critical Cleartext Telnet Service Active (Port 23)",
        "Telnet exposes administrative shell sessions and passwords in plaintext on TCP port 23.",
        "Disable Telnet daemon immediately and enforce SSHv2 with key-based authentication.",
    ),
    135: (
        "HIGH",
        "Microsoft DCE/RPC Endpoint Mapper Exposed (Port 135)",
        "TCP Port 135 is reachable on the subnet, increasing exposure to lateral movement and remote RPC enumeration.",
        "Restrict inbound TCP 135 to trusted domain controllers or block via Windows Defender Firewall.",
    ),
    139: (
        "HIGH",
        "Legacy NetBIOS Session Service Open (Port 139)",
        "NetBIOS over TCP/IP (Port 139) enables legacy SMB enumeration and hostname disclosure.",
        "Disable NetBIOS over TCP/IP in adapter IPv4 WINS properties and block TCP 139.",
    ),
    445: (
        "HIGH",
        "SMB File Sharing Exposed on LAN (Port 445)",
        "Server Message Block (TCP 445) is reachable. Unhardened SMB endpoints are prime targets for lateral movement and ransomware.",
        "Ensure SMBv1 is disabled, enforce SMB signing, and restrict TCP 445 to authorized subnet segments.",
    ),
    3306: (
        "HIGH",
        "MySQL Database Port Exposed to Network (Port 3306)",
        "Database listener TCP 3306 is bound to a network interface rather than localhost.",
        "Bind MySQL to 127.0.0.1 in my.cnf or restrict TCP 3306 via host firewall rules.",
    ),
    3389: (
        "HIGH",
        "Remote Desktop Protocol (RDP) Exposed (Port 3389)",
        "RDP (TCP 3389) is open on the network and susceptible to credential brute-forcing.",
        "Enable Network Level Authentication (NLA), require MFA/VPN, and restrict TCP 3389 via firewall.",
    ),
    5900: (
        "CRITICAL",
        "Unencrypted VNC Remote Framebuffer Open (Port 5900)",
        "VNC on TCP 5900 allows remote screen access with weak session encryption.",
        "Tunnel VNC over SSH or block inbound TCP 5900 on the host firewall.",
    ),
    6379: (
        "CRITICAL",
        "Redis In-Memory Store Exposed (Port 6379)",
        "Redis listener TCP 6379 is reachable on the LAN and often runs without authentication by default.",
        "Enable `protected-mode yes`, set `requirepass`, and bind Redis to 127.0.0.1.",
    ),
    80: (
        "MEDIUM",
        "Unencrypted HTTP Web Service Active (Port 80)",
        "HTTP traffic on TCP 80 lacks TLS encryption, allowing session headers and credentials to be inspected in transit.",
        "Redirect HTTP (Port 80) to HTTPS (Port 443) with TLS 1.3 certificates.",
    ),
}


def compute_grade(score: int) -> str:
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    if score >= 60:
        return "D"
    return "F"


def evaluate_network_security(session: Session) -> dict[str, Any]:
    """Run deterministic rules across all 4 required PDF categories and persist `SecurityAlert` rows."""
    devices = session.exec(select(DiscoveredDevice)).all()
    qos_list = session.exec(select(HostQoSStats)).all()
    open_ports = session.exec(select(PortScanResult).where(PortScanResult.state == "OPEN")).all()

    qos_by_ip = {q.ip_address: q for q in qos_list}
    dev_by_ip = {d.ip_address: d for d in devices}

    # Clear existing unresolved alerts to regenerate fresh deterministic evaluation
    existing_alerts = session.exec(select(SecurityAlert)).all()
    for row in existing_alerts:
        session.delete(row)

    new_alerts: list[SecurityAlert] = []
    now = datetime.now(timezone.utc)
    score = 100

    # =========================================================================
    # CATEGORY 1: CONNECTIVITY ("Weak connectivity alerts")
    # =========================================================================
    connectivity_findings = 0
    for q in qos_list:
        if q.packet_loss_pct >= 100.0:
            continue  # Handled under Unreachable Hosts (AVAILABILITY)
        if q.packet_loss_pct > 0.0 or q.avg_latency_ms > 80.0 or q.jitter_ms > 25.0:
            connectivity_findings += 1
            sev = "HIGH" if (q.packet_loss_pct >= 10.0 or q.avg_latency_ms > 150.0) else "MEDIUM"
            score -= 8 if sev == "HIGH" else 4
            new_alerts.append(
                SecurityAlert(
                    category="CONNECTIVITY",
                    severity=sev,
                    target_ip=q.ip_address,
                    hostname=q.hostname,
                    title=f"Weak Connectivity & QoS Degradation on {q.hostname} ({q.ip_address})",
                    description=(
                        f"Host exhibits Avg Latency={q.avg_latency_ms}ms, Max Latency={q.max_latency_ms}ms, "
                        f"Jitter={q.jitter_ms}ms, and Packet Loss={q.packet_loss_pct}%."
                    ),
                    recommendation=(
                        "Inspect Wi-Fi RSSI signal attenuation, switch from congested 2.4GHz to 5GHz/6GHz channels, "
                        "verify Category-6 Ethernet physical patch cables, and enable SQM/QoS queue management on the gateway."
                    ),
                    remediation_command=f"ping -n 25 {q.ip_address}",
                    is_resolved=False,
                    created_at=now,
                )
            )

    if connectivity_findings == 0:
        new_alerts.append(
            SecurityAlert(
                category="CONNECTIVITY",
                severity="LOW",
                target_ip="Subnet-Wide",
                hostname="All Active LAN Links",
                title="Connectivity Baseline Optimal — Proactive QoS Monitoring Advisory",
                description=(
                    "All tested active hosts currently maintain low RTT latency (<80ms), low jitter (<25ms), "
                    "and 0% partial packet loss."
                ),
                recommendation=(
                    "Maintain continuous 2-second WebSocket telemetry monitoring and configure 802.1p / DSCP QoS "
                    "prioritization on the router to prevent bufferbloat during peak campus traffic."
                ),
                remediation_command="netsh int tcp show global",
                is_resolved=False,
                created_at=now,
            )
        )

    # =========================================================================
    # CATEGORY 2: AVAILABILITY ("Unreachable hosts")
    # =========================================================================
    unreachable_ips: set[str] = set()
    for d in devices:
        q = qos_by_ip.get(d.ip_address)
        if not d.is_online or (q and q.packet_loss_pct >= 100.0):
            unreachable_ips.add(d.ip_address)
            score -= 7
            new_alerts.append(
                SecurityAlert(
                    category="AVAILABILITY",
                    severity="HIGH",
                    target_ip=d.ip_address,
                    hostname=d.hostname,
                    title=f"Unreachable Host Detected: {d.hostname} ({d.ip_address})",
                    description=(
                        f"Device {d.ip_address} (MAC {d.mac_address}, {d.vendor}) failed connectivity probes "
                        "(100% packet loss / OFFLINE status)."
                    ),
                    recommendation=(
                        "Verify physical power and NIC link LEDs, flush stale ARP cache entries (`arp -d`), "
                        "or check if Windows Defender Firewall is dropping inbound ICMPv4 Echo Requests."
                    ),
                    remediation_command=f"arp -a {d.ip_address} && ping -n 4 {d.ip_address}",
                    is_resolved=False,
                    created_at=now,
                )
            )

    for q in qos_list:
        if q.packet_loss_pct >= 100.0 and q.ip_address not in unreachable_ips:
            unreachable_ips.add(q.ip_address)
            score -= 7
            new_alerts.append(
                SecurityAlert(
                    category="AVAILABILITY",
                    severity="HIGH",
                    target_ip=q.ip_address,
                    hostname=q.hostname,
                    title=f"Unreachable Target Host: {q.hostname} ({q.ip_address})",
                    description=f"Ping test to {q.ip_address} resulted in 100% packet loss ({q.packets_sent} sent, 0 received).",
                    recommendation=(
                        "Verify subnet routing table (`route print`), check VLAN segmentation or AP client isolation, "
                        "and run a Layer 4 TCP Port Scan to check if the host is blocking ICMP only."
                    ),
                    remediation_command=f"tracert -d -h 10 {q.ip_address}",
                    is_resolved=False,
                    created_at=now,
                )
            )

    if not unreachable_ips:
        new_alerts.append(
            SecurityAlert(
                category="AVAILABILITY",
                severity="LOW",
                target_ip="Subnet-Wide",
                hostname="All Discovered Hosts",
                title="Host Availability Check — Zero Unreachable Nodes",
                description="100% of discovered subnet devices responded to Layer 2 ARP, Layer 3 ICMP, or Layer 4 TCP probes.",
                recommendation=(
                    "Enable automated periodic subnet sweeps and SMTP Email Alert notifications so administrators "
                    "are alerted immediately if a critical gateway or server goes offline."
                ),
                remediation_command="arp -a",
                is_resolved=False,
                created_at=now,
            )
        )

    # =========================================================================
    # CATEGORY 3: FIREWALL ("Basic firewall recommendations")
    # =========================================================================
    firewall_findings = 0
    for p in open_ports:
        if p.port in HIGH_RISK_PORTS:
            firewall_findings += 1
            sev, title_prefix, desc, rec = HIGH_RISK_PORTS[p.port]
            score -= 12 if sev == "CRITICAL" else (7 if sev == "HIGH" else 3)
            host_obj = dev_by_ip.get(p.ip_address)
            h_name = host_obj.hostname if host_obj else p.ip_address
            new_alerts.append(
                SecurityAlert(
                    category="FIREWALL",
                    severity=sev,
                    target_ip=p.ip_address,
                    hostname=h_name,
                    title=f"{title_prefix} on {h_name}",
                    description=f"{desc} (Banner: '{p.banner}')",
                    recommendation=rec,
                    remediation_command=(
                        f'netsh advfirewall firewall add rule name="Block_TCP_{p.port}" '
                        f"dir=in action=block protocol=TCP localport={p.port}  # Or Linux: sudo ufw deny {p.port}/tcp"
                    ),
                    is_resolved=False,
                    created_at=now,
                )
            )

    # Always include a baseline host firewall hardening recommendation
    new_alerts.append(
        SecurityAlert(
            category="FIREWALL",
            severity="MEDIUM" if firewall_findings > 0 else "LOW",
            target_ip="Subnet-Wide",
            hostname="All Subnet Endpoints",
            title="Baseline Host Firewall Policy & Least-Privilege Port Hardening",
            description=(
                f"Evaluated {len(open_ports)} open TCP service port(s) across the subnet "
                f"({firewall_findings} high/medium exposure port(s) flagged)."
            ),
            recommendation=(
                "Enforce a default-deny inbound firewall profile on Windows Defender Firewall (`Public`/`Domain` profiles) "
                "and Linux `ufw`/`nftables`. Restrict management ports (22/SSH, 3389/RDP, 445/SMB) to authorized NOC admin IPs."
            ),
            remediation_command="netsh advfirewall set allprofiles state on && netsh advfirewall set allprofiles firewallpolicy blockinbound,allowoutbound",
            is_resolved=False,
            created_at=now,
        )
    )

    # =========================================================================
    # CATEGORY 4: AUTHENTICATION ("Password security reminders")
    # =========================================================================
    gateways = [d for d in devices if d.is_gateway]
    gw_ip = gateways[0].ip_address if gateways else "192.168.1.1"
    gw_host = gateways[0].hostname if gateways else "Default-Gateway-Router"

    new_alerts.append(
        SecurityAlert(
            category="AUTHENTICATION",
            severity="MEDIUM",
            target_ip=gw_ip,
            hostname=gw_host,
            title=f"Gateway Router & WLAN Password Security Reminder ({gw_ip})",
            description=(
                f"Default Gateway ({gw_host} at {gw_ip}) controls subnet routing, DNS, and wireless access control. "
                "Default factory admin credentials (`admin/admin`) and weak WPA2-PSK passphrases are the #1 LAN compromise vector."
            ),
            recommendation=(
                "1. Rotate the router web admin password to a >=16-character passphrase.\n"
                "2. Disable WPS (Wi-Fi Protected Setup) and enforce WPA3-SAE or WPA2-AES encryption.\n"
                "3. Disable WAN-side administrative HTTP/Telnet access."
            ),
            remediation_command=f"https://{gw_ip}/  # Verify HTTPS-only admin login & rotate default credentials",
            is_resolved=False,
            created_at=now,
        )
    )

    remote_admin_ports = [p for p in open_ports if p.port in (21, 22, 23, 80, 443, 3389, 5900, 8080, 8443)]
    if remote_admin_ports:
        sample_p = remote_admin_ports[0]
        new_alerts.append(
            SecurityAlert(
                category="AUTHENTICATION",
                severity="MEDIUM",
                target_ip=sample_p.ip_address,
                hostname=dev_by_ip[sample_p.ip_address].hostname if sample_p.ip_address in dev_by_ip else sample_p.ip_address,
                title=f"Service Credential Hygiene & MFA Enforcement ({len(remote_admin_ports)} Admin Services)",
                description=(
                    f"Detected {len(remote_admin_ports)} open remote access / web admin service(s) "
                    f"(including {sample_p.service_name} on {sample_p.ip_address}:{sample_p.port})."
                ),
                recommendation=(
                    "Enforce account lockout policies after 5 failed attempts, replace password-based SSH with Ed25519 keys, "
                    "audit local Administrator accounts, and require Multi-Factor Authentication (MFA)."
                ),
                remediation_command="net accounts /lockoutthreshold:5 /minpwlen:14 /maxpwage:90",
                is_resolved=False,
                created_at=now,
            )
        )

    final_score = max(18, min(100, score))
    grade = compute_grade(final_score)

    for alert in new_alerts:
        session.add(alert)
    session.commit()
    for alert in new_alerts:
        session.refresh(alert)

    by_category: dict[str, int] = {
        "CONNECTIVITY": 0,
        "AVAILABILITY": 0,
        "FIREWALL": 0,
        "AUTHENTICATION": 0,
    }
    by_severity: dict[str, int] = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for a in new_alerts:
        by_category[a.category] = by_category.get(a.category, 0) + 1
        by_severity[a.severity] = by_severity.get(a.severity, 0) + 1

    return {
        "security_score": final_score,
        "security_grade": grade,
        "evaluated_at": now.isoformat(),
        "total_alerts": len(new_alerts),
        "category_counts": by_category,
        "severity_counts": by_severity,
        "recommendations": [a.model_dump() for a in new_alerts],
    }

