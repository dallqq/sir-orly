"""Course Topic 7 & Bonus Feature 6 Router: Wireshark Packet Capture, Dissection & .pcap I/O."""
from datetime import datetime, timezone
import json
from pathlib import Path
import time
from typing import Any
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlmodel import Session, select
from app.config import CAPTURES_DIR
from app.database import get_session
from app.models.packet import PcapCaptureSession
from app.services.packet_analyzer import (
    capture_packets,
    compute_protocol_breakdown,
    dissect_scapy_packet,
    ensure_demo_pcap,
    launch_in_wireshark_desktop,
    load_pcap_session,
)

router = APIRouter(prefix="/packets", tags=["Topic 7 & Bonus: Wireshark Packet Analyzer"])


class CaptureRequest(BaseModel):
    interface_name: str = "Auto"
    bpf_filter: str = "all"
    count: int = 30
    timeout: float = 3.0


@router.post("/capture")
def start_packet_capture(
    payload: CaptureRequest,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    """Capture live packets via Scapy or Active Socket Synthesizer fallback and save `.pcap`."""
    try:
        return capture_packets(
            session=session,
            interface_name=payload.interface_name,
            bpf_filter=payload.bpf_filter,
            limit=payload.count,
            timeout=payload.timeout,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/upload")
async def upload_pcap_file(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    """Upload a Wireshark `.pcap` or `.pcapng` file and dissect all OSI Layer 2–7 packets."""
    from scapy.utils import rdpcap  # type: ignore[import-untyped]

    safe_name = Path(file.filename or "uploaded_capture.pcap").name
    if not safe_name.lower().endswith((".pcap", ".pcapng", ".cap")):
        safe_name = f"{safe_name}.pcap"

    ts_prefix = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    dest_name = f"upload_{ts_prefix}_{safe_name}"
    dest_path = CAPTURES_DIR / dest_name

    content = await file.read()
    dest_path.write_bytes(content)

    try:
        pkts = list(rdpcap(str(dest_path)))
    except Exception as exc:  # noqa: BLE001
        dest_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=f"Invalid .pcap file format: {exc}") from exc

    base_t = float(getattr(pkts[0], "time", time.time())) if pkts else time.time()
    dissected = [dissect_scapy_packet(p, idx + 1, base_t) for idx, p in enumerate(pkts[:250])]
    breakdown = compute_protocol_breakdown(dissected)

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

    return {
        "session": cap_session.model_dump(mode="json"),
        "protocol_breakdown": breakdown,
        "packets": [d.model_dump(mode="json") for d in dissected],
    }


@router.get("/sessions")
def list_capture_sessions(session: Session = Depends(get_session)) -> dict[str, Any]:
    """List all saved packet capture sessions (always ensuring bundled demo_lan_traffic.pcap exists)."""
    ensure_demo_pcap(session)
    rows = session.exec(select(PcapCaptureSession).order_by(PcapCaptureSession.id.desc())).all()  # type: ignore[arg-type]
    return {
        "total": len(rows),
        "sessions": [r.model_dump(mode="json") for r in rows],
    }


@router.get("/sessions/{session_id}")
def get_capture_session_detail(
    session_id: int,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    """Return full packet list, OSI Layer 2–7 dissection tree, and hex dump for a session."""
    try:
        return load_pcap_session(session, session_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/sessions/{session_id}/download")
def download_pcap_session(
    session_id: int,
    session: Session = Depends(get_session),
) -> FileResponse:
    """Download the raw `.pcap` file for direct inspection in Wireshark."""
    cap = session.get(PcapCaptureSession, session_id)
    if not cap:
        raise HTTPException(status_code=404, detail="Capture session not found")
    path = Path(cap.file_path)
    if not path.exists():
        demo = ensure_demo_pcap(session)
        path = Path(demo.file_path)
    return FileResponse(
        path=str(path),
        media_type="application/vnd.tcpdump.pcap",
        filename=cap.filename,
    )


@router.post("/sessions/{session_id}/open-wireshark")
def open_session_in_wireshark(
    session_id: int,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    """Launch desktop Wireshark.exe directly with the selected `.pcap` capture file."""
    cap = session.get(PcapCaptureSession, session_id)
    if not cap:
        raise HTTPException(status_code=404, detail="Capture session not found")
    return launch_in_wireshark_desktop(cap.file_path)

