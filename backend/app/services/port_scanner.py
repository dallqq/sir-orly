"""Bonus Feature 5: Async TCP/UDP Socket Port Scanner & Service Banner Grabber."""
import asyncio
from datetime import datetime, timezone
from typing import Any
from sqlmodel import Session, select
from app.models.device import DiscoveredDevice
from app.models.telemetry import PortScanResult

# Port -> (Service Name, OSI Layer Mapping, Risk Severity)
PORT_CATALOG: dict[int, tuple[str, str, str]] = {
    20: ("FTP-Data", "Layer 4 (TCP) / Layer 7 (FTP)", "HIGH"),
    21: ("FTP", "Layer 4 (TCP) / Layer 7 (FTP Cleartext)", "CRITICAL"),
    22: ("SSH", "Layer 4 (TCP) / Layer 7 (SSH Encrypted)", "LOW"),
    23: ("Telnet", "Layer 4 (TCP) / Layer 7 (Telnet Cleartext)", "CRITICAL"),
    25: ("SMTP", "Layer 4 (TCP) / Layer 7 (SMTP Mail)", "MEDIUM"),
    53: ("DNS", "Layer 4 (TCP/UDP) / Layer 7 (DNS)", "LOW"),
    80: ("HTTP", "Layer 4 (TCP) / Layer 7 (HTTP Unencrypted)", "MEDIUM"),
    110: ("POP3", "Layer 4 (TCP) / Layer 7 (POP3 Cleartext)", "HIGH"),
    135: ("MS-RPC", "Layer 4 (TCP) / Layer 5/7 (DCE/RPC)", "HIGH"),
    139: ("NetBIOS-SSN", "Layer 4 (TCP) / Layer 5 (NetBIOS Session)", "HIGH"),
    143: ("IMAP", "Layer 4 (TCP) / Layer 7 (IMAP)", "MEDIUM"),
    443: ("HTTPS", "Layer 4 (TCP) / Layer 6/7 (TLS/HTTPS)", "LOW"),
    445: ("Microsoft-DS (SMB)", "Layer 4 (TCP) / Layer 7 (SMB File Share)", "HIGH"),
    993: ("IMAPS", "Layer 4 (TCP) / Layer 6/7 (TLS/IMAPS)", "LOW"),
    995: ("POP3S", "Layer 4 (TCP) / Layer 6/7 (TLS/POP3S)", "LOW"),
    1433: ("MS-SQL", "Layer 4 (TCP) / Layer 7 (TDS Database)", "HIGH"),
    3000: ("Next.js-Web-UI", "Layer 4 (TCP) / Layer 7 (HTTP NOC Dashboard)", "LOW"),
    3306: ("MySQL", "Layer 4 (TCP) / Layer 7 (MySQL Database)", "HIGH"),
    3389: ("RDP", "Layer 4 (TCP) / Layer 7 (Remote Desktop)", "HIGH"),
    5432: ("PostgreSQL", "Layer 4 (TCP) / Layer 7 (PostgreSQL DB)", "MEDIUM"),
    5900: ("VNC", "Layer 4 (TCP) / Layer 7 (RFB Remote GUI)", "CRITICAL"),
    6379: ("Redis", "Layer 4 (TCP) / Layer 7 (RESP Cache)", "CRITICAL"),
    8000: ("FastAPI-Engine", "Layer 4 (TCP) / Layer 7 (HTTP REST/WS API)", "LOW"),
    8080: ("HTTP-Proxy/Admin", "Layer 4 (TCP) / Layer 7 (HTTP Alt)", "MEDIUM"),
    8443: ("HTTPS-Admin", "Layer 4 (TCP) / Layer 6/7 (TLS Web Admin)", "LOW"),
}

QUICK_PORTS: list[int] = sorted(PORT_CATALOG.keys())


async def _scan_single_tcp_port(
    ip_str: str,
    port: int,
    timeout_s: float,
    sem: asyncio.Semaphore,
) -> dict[str, Any] | None:
    """Connect to `(ip_str, port)` via async TCP socket and attempt safe service banner grab."""
    async with sem:
        try:
            conn = asyncio.open_connection(ip_str, port)
            reader, writer = await asyncio.wait_for(conn, timeout=timeout_s)
        except Exception:  # noqa: BLE001
            return None

        banner = ""
        try:
            if port in (80, 3000, 8000, 8080):
                writer.write(b"HEAD / HTTP/1.0\r\nHost: localhost\r\n\r\n")
                await writer.drain()
            raw = await asyncio.wait_for(reader.read(256), timeout=0.35)
            if raw:
                text = raw.decode("utf-8", errors="ignore").strip()
                first_lines = [line.strip() for line in text.splitlines() if line.strip()]
                server_hdr = next((ln for ln in first_lines if ln.lower().startswith("server:")), None)
                banner = server_hdr or (first_lines[0][:90] if first_lines else "")
        except Exception:  # noqa: BLE001
            pass
        finally:
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:  # noqa: BLE001
                pass

        service_name, osi_layer, risk = PORT_CATALOG.get(
            port,
            (f"tcp-{port}", "Layer 4 (Transport) / Layer 7 (Application)", "LOW"),
        )
        if not banner:
            banner = f"{service_name} listener active on TCP/{port}"

        return {
            "ip_address": ip_str,
            "port": port,
            "protocol": "TCP",
            "state": "OPEN",
            "service_name": service_name,
            "banner": banner,
            "osi_layer": osi_layer,
            "risk_level": risk,
        }


def resolve_port_list(preset: str = "quick", custom_ports: str | list[int] | None = None) -> list[int]:
    """Parse preset or custom port specification into a deduplicated sorted list of ports."""
    if isinstance(custom_ports, list) and custom_ports:
        return sorted({int(p) for p in custom_ports if 1 <= int(p) <= 65535})[:512]

    if isinstance(custom_ports, str) and custom_ports.strip():
        ports: set[int] = set()
        for part in custom_ports.split(","):
            part = part.strip()
            if not part:
                continue
            if "-" in part:
                a, b = part.split("-", 1)
                start_p, end_p = int(a.strip()), int(b.strip())
                for p in range(min(start_p, end_p), max(start_p, end_p) + 1):
                    if 1 <= p <= 65535:
                        ports.add(p)
            else:
                p = int(part)
                if 1 <= p <= 65535:
                    ports.add(p)
        if ports:
            return sorted(ports)[:512]

    mode = preset.strip().lower()
    if mode == "standard":
        base = set(range(20, 1025))
        base.update(QUICK_PORTS)
        return sorted(base)[:256]
    return QUICK_PORTS


async def scan_host_ports(
    session: Session,
    target_ip: str,
    preset: str = "quick",
    ports: str | list[int] | None = None,
    timeout_s: float = 0.65,
) -> dict[str, Any]:
    """Scan TCP ports on `target_ip`, grab banners, update DB, and return structured results."""
    clean_ip = target_ip.strip()
    target_ports = resolve_port_list(preset=preset, custom_ports=ports)
    sem = asyncio.Semaphore(100)

    tasks = [_scan_single_tcp_port(clean_ip, p, timeout_s, sem) for p in target_ports]
    raw_results = await asyncio.gather(*tasks, return_exceptions=True)

    open_findings: list[dict[str, Any]] = [
        r for r in raw_results if isinstance(r, dict) and r.get("state") == "OPEN"
    ]

    # If target is a simulated Campus Lab device and no physical host responded, return its simulated open ports
    dev = session.exec(select(DiscoveredDevice).where(DiscoveredDevice.ip_address == clean_ip)).first()
    if not open_findings and dev and dev.discovery_method == "SIMULATED" and dev.open_ports_summary:
        for p_str in dev.open_ports_summary.split(","):
            if not p_str.strip().isdigit():
                continue
            p_int = int(p_str.strip())
            if p_int in target_ports or preset == "quick":
                svc, osi, risk = PORT_CATALOG.get(
                    p_int,
                    (f"tcp-{p_int}", "Layer 4 (Transport) / Layer 7 (Application)", "LOW"),
                )
                open_findings.append(
                    {
                        "ip_address": clean_ip,
                        "port": p_int,
                        "protocol": "TCP",
                        "state": "OPEN",
                        "service_name": svc,
                        "banner": f"{svc} Daemon ready on {dev.hostname} (Simulated Lab Host)",
                        "osi_layer": osi,
                        "risk_level": risk,
                    }
                )

    now = datetime.now(timezone.utc)
    # Remove old port scan rows for this IP and persist fresh findings
    old_rows = session.exec(select(PortScanResult).where(PortScanResult.ip_address == clean_ip)).all()
    for row in old_rows:
        session.delete(row)

    saved_rows: list[PortScanResult] = []
    for item in sorted(open_findings, key=lambda x: x["port"]):
        row = PortScanResult(**item, scanned_at=now)
        session.add(row)
        saved_rows.append(row)

    if dev:
        dev.open_ports_summary = ", ".join(str(x["port"]) for x in sorted(open_findings, key=lambda x: x["port"]))
        session.add(dev)

    session.commit()
    for r in saved_rows:
        session.refresh(r)

    return {
        "target_ip": clean_ip,
        "hostname": dev.hostname if dev else clean_ip,
        "ports_scanned": len(target_ports),
        "open_ports_count": len(saved_rows),
        "scanned_at": now.isoformat(),
        "results": [r.model_dump() for r in saved_rows],
    }

