"""NetPulse SOC/NOC Desktop Backend (Flask WSGI + Waitress).

Standalone frozen sidecar server providing high-performance local network diagnostics,
QoS monitoring, Wireshark packet analysis, and persistent SQLite WAL storage.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import json
import logging
import os
from pathlib import Path
import sys
import time
from typing import Any

# Configure structured logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("netpulse_flask")


# Resolve AppData storage path for persistent SQLite
def get_storage_dir() -> Path:
    """Return user AppData directory for NetPulse persistent files, with portable fallback."""
    candidate_paths: list[Path] = []
    custom_dir = os.environ.get("NETPULSE_STORAGE_DIR")
    if custom_dir:
        candidate_paths.append(Path(custom_dir))

    if sys.platform == "win32":
        appdata = os.environ.get("APPDATA")
        if appdata:
            candidate_paths.append(Path(appdata) / "NetPulse")
        localappdata = os.environ.get("LOCALAPPDATA")
        if localappdata:
            candidate_paths.append(Path(localappdata) / "NetPulse")
    elif sys.platform == "darwin":
        candidate_paths.append(Path.home() / "Library" / "Application Support" / "NetPulse")
    else:
        candidate_paths.append(Path.home() / ".local" / "share" / "NetPulse")

    # If frozen via PyInstaller, prefer directory adjacent to executable, never ephemeral _MEI temp
    if getattr(sys, "frozen", False):
        candidate_paths.append(Path(sys.executable).resolve().parent / "data")
    else:
        candidate_paths.append(Path(__file__).resolve().parent / "data")
        candidate_paths.append(Path(__file__).resolve().parent)

    for p in candidate_paths:
        try:
            p.mkdir(parents=True, exist_ok=True)
            test_file = p / ".write_test"
            test_file.touch(exist_ok=True)
            test_file.unlink(missing_ok=True)
            return p
        except Exception:
            continue

    home_fallback = Path.home() / ".netpulse"
    home_fallback.mkdir(parents=True, exist_ok=True)
    return home_fallback


STORAGE_DIR = get_storage_dir()
DB_PATH = STORAGE_DIR / "netpulse.db"
os.environ["DATABASE_URL"] = f"sqlite:///{DB_PATH.as_posix()}"

from flask import Flask, Response, jsonify, request, send_file
from flask_cors import CORS
from sqlmodel import Session, select
from waitress import serve

# Import database & services from core NetPulse app
from app.config import CAPTURES_DIR, REPORTS_DIR, settings
from app.database import (
    get_database_status,
    get_engine,
    get_session,
    init_db,
    switch_database_mode,
)
from app.models.device import DiscoveredDevice, ScanSession
from app.models.packet import PcapCaptureSession
from app.models.security import DiagnosticReport, EmailAlertLog, SecurityAlert
from app.models.telemetry import HostQoSStats, PortScanResult
from app.services.email_notifier import dispatch_alert_email
from app.services.interface_detector import get_network_interfaces
from app.services.network_scanner import run_subnet_discovery
from app.services.packet_analyzer import (
    capture_packets,
    compute_protocol_breakdown,
    dissect_scapy_packet,
    ensure_demo_pcap,
    launch_in_wireshark_desktop,
    load_pcap_session,
)
from app.services.ping_engine import ping_multiple_hosts
from app.services.port_scanner import scan_host_ports
from app.services.report_generator import export_report_csv, generate_diagnostic_report
from app.services.security_advisor import evaluate_network_security

# Initialize Flask Application
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Ensure Database Tables Exist
init_db()


def _get_db() -> Session:
    """Helper to acquire a database session."""
    return next(get_session())


def _run_async(coro: Any) -> Any:
    """Safely execute an async coroutine inside a synchronous WSGI request."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            new_loop = asyncio.new_event_loop()
            try:
                return new_loop.run_until_complete(coro)
            finally:
                new_loop.close()
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


# ==============================================================================
# Health & System Endpoints
# ==============================================================================


@app.route("/api/v1/health", methods=["GET"])
def health():
    """Return backend health, active database mode, Npcap availability, and active NIC."""
    nic_data = get_network_interfaces()
    npcap_ok = Path(r"C:\Windows\System32\Npcap").exists()
    wireshark_ok = Path(r"C:\Program Files\Wireshark\Wireshark.exe").exists()

    return jsonify({
        "status": "healthy",
        "service": "NetPulse Desktop Core (Waitress WSGI)",
        "version": settings.app_version,
        "database": {
            **get_database_status(),
            "local_path": str(DB_PATH),
        },
        "packet_engine": {
            "npcap_installed": npcap_ok,
            "mode": "Npcap Layer 2 Promiscuous + Scapy" if npcap_ok else "Scapy + Active Socket Synthesizer Fallback (L3/L4)",
            "wireshark_desktop_available": wireshark_ok,
        },
        "realtime_monitoring": {
            "enabled": settings.realtime_monitoring_enabled,
            "interval_seconds": settings.telemetry_interval_s,
            "active_ws_clients": 0,
        },
        "network_status": {
            "internet_reachable": nic_data.get("internet_reachable", False),
            "connection_state": nic_data.get("connection_state", "LAN_ONLY"),
            "outbound_ip": nic_data.get("outbound_ip"),
            "hostname": nic_data.get("hostname", "localhost"),
        },
        "active_interface": nic_data["active_interface"],
    })


@app.route("/api/v1/system/database-mode", methods=["POST"])
def update_database_mode():
    data = request.get_json() or {}
    mode = data.get("mode", "SQLITE_LOCAL")
    cloud_url = data.get("cloud_database_url")
    return jsonify(switch_database_mode(mode=mode, cloud_url=cloud_url))


@app.route("/api/v1/system/monitoring-toggle", methods=["POST"])
def toggle_monitoring():
    data = request.get_json() or {}
    settings.realtime_monitoring_enabled = data.get("enabled", True)
    return jsonify({
        "enabled": settings.realtime_monitoring_enabled,
        "interval_seconds": settings.telemetry_interval_s,
    })


@app.route("/api/v1/system/seed-lab", methods=["POST"])
def seed_campus_lab():
    with _get_db() as session:
        scan_res = _run_async(run_subnet_discovery(session=session, scan_mode="simulation"))
        sec_res = evaluate_network_security(session=session)
        ensure_demo_pcap(session=session)
        return jsonify({
            "status": "seeded",
            "scan_summary": scan_res["scan_session"],
            "devices_count": len(scan_res["devices"]),
            "security_score": sec_res["security_score"],
            "security_grade": sec_res["security_grade"],
        })


@app.route("/api/v1/system/shutdown", methods=["POST"])
def shutdown():
    """Endpoint for graceful sidecar termination from Tauri lifecycle supervisor."""
    logger.info("Shutdown request received from Tauri desktop host.")
    # Exit shortly to allow the HTTP response to be flushed
    def _delayed_exit():
        time.sleep(0.15)
        os._exit(0)

    import threading
    threading.Thread(target=_delayed_exit, daemon=True).start()
    return jsonify({"status": "shutting_down", "message": "NetPulse sidecar terminating."})


# ==============================================================================
# Feature 1: Network Discovery
# ==============================================================================


@app.route("/api/v1/discovery/interfaces", methods=["GET"])
@app.route("/api/v1/discovery/interface", methods=["GET"])
def list_interfaces():
    pref = request.args.get("interface_name")
    return jsonify(get_network_interfaces(preferred_interface=pref))


@app.route("/api/v1/discovery/scan", methods=["POST"])
def scan_network():
    data = request.get_json() or {}
    cidr = data.get("cidr") or data.get("subnet_cidr")
    interface_name = data.get("interface_name")
    scan_mode = data.get("scan_mode", "auto")

    with _get_db() as session:
        res = _run_async(run_subnet_discovery(
            session=session,
            cidr=cidr,
            interface_name=interface_name,
            scan_mode=scan_mode,
        ))
        res["count"] = len(res.get("devices", []))
        return jsonify(res)


@app.route("/api/v1/discovery/devices", methods=["GET"])
def get_devices():
    with _get_db() as session:
        devices = session.exec(select(DiscoveredDevice).order_by(DiscoveredDevice.id)).all()
        last_scan = session.exec(select(ScanSession).order_by(ScanSession.id.desc())).first()
        nic_info = get_network_interfaces()["active_interface"]

        return jsonify({
            "active_interface": nic_info,
            "last_scan": last_scan.model_dump(mode="json") if last_scan else None,
            "total_devices": len(devices),
            "online_devices": sum(1 for d in devices if d.is_online),
            "devices": [d.model_dump(mode="json") for d in devices],
        })


# ==============================================================================
# Features 2 & 3: Ping Connectivity, QoS Statistics & Port Scanning
# ==============================================================================


@app.route("/api/v1/connectivity/ping", methods=["POST"])
def ping_targets():
    data = request.get_json() or {}
    targets = data.get("targets") or data.get("target_ip", "127.0.0.1")
    count = int(data.get("count", 4))
    packet_size = int(data.get("packet_size", 32))
    timeout_ms = int(data.get("timeout_ms", 1200))
    protocol = data.get("protocol", "auto")

    if isinstance(targets, str):
        target_list = [t.strip() for t in targets.split(",") if t.strip()]
    else:
        target_list = [t.strip() for t in targets if t.strip()]

    if not target_list:
        return jsonify({"detail": "At least one target IP is required"}), 400

    with _get_db() as session:
        results = _run_async(ping_multiple_hosts(
            session=session,
            targets=target_list,
            count=count,
            packet_size=packet_size,
            timeout_ms=timeout_ms,
            protocol=protocol,
        ))
        return jsonify({
            "tested_hosts": len(results),
            "results": results,
        })


@app.route("/api/v1/connectivity/stats", methods=["GET"])
def get_qos_stats():
    with _get_db() as session:
        stats = session.exec(select(HostQoSStats).order_by(HostQoSStats.ip_address)).all()
        rtts = [s.avg_latency_ms for s in stats if s.avg_latency_ms > 0]
        max_rtts = [s.max_latency_ms for s in stats if s.max_latency_ms > 0]
        losses = [s.packet_loss_pct for s in stats]

        return jsonify({
            "total_hosts": len(stats),
            "subnet_avg_latency_ms": round(sum(rtts) / len(rtts), 2) if rtts else 0.0,
            "subnet_max_latency_ms": round(max(max_rtts), 2) if max_rtts else 0.0,
            "subnet_avg_packet_loss_pct": round(sum(losses) / len(losses), 2) if losses else 0.0,
            "stats": [s.model_dump(mode="json") for s in stats],
        })


@app.route("/api/v1/connectivity/port-scan", methods=["POST"])
@app.route("/api/v1/connectivity/ports/scan", methods=["POST"])
def scan_ports():
    data = request.get_json() or {}
    target_ip = data.get("target_ip", "127.0.0.1")
    preset = data.get("preset", "quick")
    ports = data.get("ports")
    timeout_s = float(data.get("timeout_s", 0.65))

    with _get_db() as session:
        res = _run_async(scan_host_ports(
            session=session,
            target_ip=target_ip,
            preset=preset,
            ports=ports,
            timeout_s=timeout_s,
        ))
        return jsonify(res)


@app.route("/api/v1/connectivity/ports/<ip>", methods=["GET"])
def get_persisted_ports(ip: str):
    with _get_db() as session:
        if ip.lower() == "all":
            rows = session.exec(select(PortScanResult).order_by(PortScanResult.ip_address, PortScanResult.port)).all()
        else:
            rows = session.exec(select(PortScanResult).where(PortScanResult.ip_address == ip).order_by(PortScanResult.port)).all()

        return jsonify({
            "ip_address": ip,
            "open_ports_count": len(rows),
            "findings": [r.model_dump(mode="json") for r in rows],
        })


# ==============================================================================
# Feature 5 & Bonus: Security Recommendations & Email Alerts
# ==============================================================================


@app.route("/api/v1/security/evaluate", methods=["POST"])
@app.route("/api/v1/security/recommendations", methods=["GET"])
def get_security_recommendations():
    with _get_db() as session:
        res = evaluate_network_security(session)
        return jsonify(res)


@app.route("/api/v1/security/alerts/email", methods=["POST"])
def send_email_alert():
    data = request.get_json() or {}
    recipient = data.get("recipient_email", "").strip()
    if not recipient:
        return jsonify({"detail": "recipient_email is required"}), 400

    with _get_db() as session:
        res = _run_async(dispatch_alert_email(
            session=session,
            recipient_email=recipient,
            subject=data.get("subject"),
            custom_message=data.get("custom_message"),
            smtp_host=data.get("smtp_host"),
            smtp_port=data.get("smtp_port"),
            smtp_username=data.get("smtp_username"),
            smtp_password=data.get("smtp_password"),
        ))
        return jsonify(res)


@app.route("/api/v1/security/alerts/outbox", methods=["GET"])
def get_email_outbox():
    with _get_db() as session:
        logs = session.exec(select(EmailAlertLog).order_by(EmailAlertLog.id.desc())).all()
        return jsonify({
            "total": len(logs),
            "outbox": [log.model_dump(mode="json") for log in logs],
        })


# ==============================================================================
# Feature 4 & Bonus: Diagnostic Reports & Exports (PDF/CSV)
# ==============================================================================


@app.route("/api/v1/reports/generate", methods=["POST"])
def generate_report():
    data = request.get_json() or {}
    title = data.get("title")

    with _get_db() as session:
        rep = generate_diagnostic_report(session=session, title=title)
        return jsonify(rep)


@app.route("/api/v1/reports", methods=["GET"])
def list_reports():
    with _get_db() as session:
        rows = session.exec(select(DiagnosticReport).order_by(DiagnosticReport.id.desc())).all()
        return jsonify({
            "total": len(rows),
            "reports": [r.model_dump(mode="json") for r in rows],
        })


@app.route("/api/v1/reports/<int:report_id>", methods=["GET"])
def get_report_detail(report_id: int):
    with _get_db() as session:
        rep = session.get(DiagnosticReport, report_id)
        if not rep:
            return jsonify({"detail": "Diagnostic report not found"}), 404
        return jsonify({
            "report": rep.model_dump(mode="json"),
            "payload": json.loads(rep.report_payload_json or "{}"),
        })


@app.route("/api/v1/reports/<int:report_id>/pdf", methods=["GET"])
def download_report_pdf(report_id: int):
    with _get_db() as session:
        rep = session.get(DiagnosticReport, report_id)
        if not rep:
            return jsonify({"detail": "Diagnostic report not found"}), 404
        pdf_path = Path(rep.pdf_path)
        if not pdf_path.exists():
            from app.services.report_generator import _generate_pdf_file
            payload = json.loads(rep.report_payload_json or "{}")
            _generate_pdf_file(rep, payload, str(pdf_path))
        return send_file(
            str(pdf_path),
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"NetPulse_Diagnostic_Report_{report_id}.pdf",
        )


@app.route("/api/v1/reports/<int:report_id>/csv", methods=["GET"])
def download_report_csv(report_id: int):
    with _get_db() as session:
        rep = session.get(DiagnosticReport, report_id)
        if not rep:
            return jsonify({"detail": "Diagnostic report not found"}), 404
        csv_data = export_report_csv(rep)
        return Response(
            csv_data,
            mimetype="text/csv",
            headers={"Content-Disposition": f'attachment; filename="NetPulse_Report_{report_id}.csv"'},
        )


# ==============================================================================
# Topic 7 & Bonus: Wireshark Packet Analyzer & PCAP Sessions
# ==============================================================================


@app.route("/api/v1/packets/capture", methods=["POST"])
def start_capture():
    data = request.get_json() or {}
    iface = data.get("interface_name", "Auto")
    bpf = data.get("bpf_filter", "all")
    count = int(data.get("count", 30))
    timeout = float(data.get("timeout", 3.0))

    with _get_db() as session:
        try:
            res = capture_packets(
                session=session,
                interface_name=iface,
                bpf_filter=bpf,
                limit=count,
                timeout=timeout,
            )
            return jsonify(res)
        except ValueError as exc:
            return jsonify({"detail": str(exc)}), 400


@app.route("/api/v1/packets/upload", methods=["POST"])
def upload_pcap():
    if "file" not in request.files:
        return jsonify({"detail": "No file part in request"}), 400
    file = request.files["file"]
    if not file.filename:
        return jsonify({"detail": "No file selected"}), 400

    from scapy.utils import rdpcap

    safe_name = Path(file.filename).name
    if not safe_name.lower().endswith((".pcap", ".pcapng", ".cap")):
        safe_name = f"{safe_name}.pcap"

    ts_prefix = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    dest_name = f"upload_{ts_prefix}_{safe_name}"
    dest_path = CAPTURES_DIR / dest_name

    file.save(str(dest_path))

    try:
        pkts = list(rdpcap(str(dest_path)))
    except Exception as exc:
        dest_path.unlink(missing_ok=True)
        return jsonify({"detail": f"Invalid .pcap file format: {exc}"}), 400

    base_t = float(getattr(pkts[0], "time", time.time())) if pkts else time.time()
    dissected = [dissect_scapy_packet(p, idx + 1, base_t) for idx, p in enumerate(pkts[:250])]
    breakdown = compute_protocol_breakdown(dissected)

    with _get_db() as session:
        cap_session = PcapCaptureSession(
            filename=dest_name,
            file_path=str(dest_path),
            interface_name="Uploaded-File",
            bpf_filter="all",
            packet_count=len(dissected),
            capture_source="UPLOADED_PCAP",
            protocol_breakdown_json=json.dumps(breakdown),
        )
        session.add(cap_session)
        session.commit()
        session.refresh(cap_session)

        return jsonify({
            "session": cap_session.model_dump(mode="json"),
            "protocol_breakdown": breakdown,
            "packets": [d.model_dump(mode="json") for d in dissected],
        })


@app.route("/api/v1/packets/sessions", methods=["GET"])
def list_packet_sessions():
    with _get_db() as session:
        ensure_demo_pcap(session)
        rows = session.exec(select(PcapCaptureSession).order_by(PcapCaptureSession.id.desc())).all()
        return jsonify({
            "total": len(rows),
            "sessions": [r.model_dump(mode="json") for r in rows],
        })


@app.route("/api/v1/packets/sessions/<int:session_id>", methods=["GET"])
def get_packet_session(session_id: int):
    with _get_db() as session:
        try:
            return jsonify(load_pcap_session(session, session_id))
        except ValueError as exc:
            return jsonify({"detail": str(exc)}), 404


@app.route("/api/v1/packets/sessions/<int:session_id>/download", methods=["GET"])
def download_pcap(session_id: int):
    with _get_db() as session:
        cap = session.get(PcapCaptureSession, session_id)
        if not cap:
            return jsonify({"detail": "Capture session not found"}), 404
        path = Path(cap.file_path)
        if not path.exists():
            demo = ensure_demo_pcap(session)
            path = Path(demo.file_path)
        return send_file(
            str(path),
            mimetype="application/vnd.tcpdump.pcap",
            as_attachment=True,
            download_name=cap.filename,
        )


@app.route("/api/v1/packets/sessions/<int:session_id>/open-wireshark", methods=["POST"])
def open_in_wireshark(session_id: int):
    with _get_db() as session:
        cap = session.get(PcapCaptureSession, session_id)
        if not cap:
            return jsonify({"detail": "Capture session not found"}), 404
        return jsonify(launch_in_wireshark_desktop(cap.file_path))


# ==============================================================================
# Main Entry Point
# ==============================================================================


def main():
    port = int(os.environ.get("NETPULSE_PORT", 8000))
    logger.info(f"Starting NetPulse Flask sidecar on 127.0.0.1:{port} (Waitress WSGI)...")
    logger.info(f"Storage directory: {STORAGE_DIR} (Database: {DB_PATH})")
    try:
        serve(app, host="127.0.0.1", port=port, threads=8)
    except PermissionError as exc:
        logger.warning(f"Waitress socket binding encountered PermissionError ({exc}). Falling back to WSGI development server...")
        app.run(host="127.0.0.1", port=port, threaded=True)


if __name__ == "__main__":
    main()
