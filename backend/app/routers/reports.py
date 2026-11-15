"""Feature 4 & Bonus Feature 3 Router: Network Diagnostic Report Builder & PDF/CSV/JSON Export."""
import json
from pathlib import Path
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
from sqlmodel import Session, select
from app.database import get_session
from app.models.security import DiagnosticReport
from app.services.report_generator import export_report_csv, generate_diagnostic_report

router = APIRouter(prefix="/reports", tags=["Feature 4 & Bonus: Diagnostic Reports & PDF Export"])


class GenerateReportRequest(BaseModel):
    title: Optional[str] = None


@router.post("/generate")
def create_diagnostic_report(
    payload: Optional[GenerateReportRequest] = None,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    """Generate a full Feature 4 Network Diagnostic Report and build its ReportLab PDF."""
    title = payload.title if payload else None
    return generate_diagnostic_report(session=session, title=title)


@router.get("")
def list_diagnostic_reports(session: Session = Depends(get_session)) -> dict[str, Any]:
    """List all generated diagnostic reports."""
    rows = session.exec(select(DiagnosticReport).order_by(DiagnosticReport.id.desc())).all()  # type: ignore[arg-type]
    return {
        "total": len(rows),
        "reports": [r.model_dump(mode="json") for r in rows],
    }


@router.get("/{report_id}")
def get_diagnostic_report_detail(
    report_id: int,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    """Return full structured JSON report payload for on-screen interactive preview."""
    rep = session.get(DiagnosticReport, report_id)
    if not rep:
        raise HTTPException(status_code=404, detail="Diagnostic report not found")
    return {
        "report": rep.model_dump(mode="json"),
        "payload": json.loads(rep.report_payload_json or "{}"),
    }


@router.get("/{report_id}/pdf")
def download_diagnostic_report_pdf(
    report_id: int,
    session: Session = Depends(get_session),
) -> FileResponse:
    """Download the multi-page styled ReportLab PDF file."""
    rep = session.get(DiagnosticReport, report_id)
    if not rep:
        raise HTTPException(status_code=404, detail="Diagnostic report not found")
    pdf_path = Path(rep.pdf_path)
    if not pdf_path.exists():
        # Rebuild PDF on the fly if missing
        from app.services.report_generator import _generate_pdf_file

        payload = json.loads(rep.report_payload_json or "{}")
        _generate_pdf_file(rep, payload, str(pdf_path))
    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=f"NetPulse_Diagnostic_Report_{report_id}.pdf",
    )


@router.get("/{report_id}/csv")
def download_diagnostic_report_csv(
    report_id: int,
    session: Session = Depends(get_session),
) -> Response:
    """Export the diagnostic report's devices, ping stats, and recommendations as CSV."""
    rep = session.get(DiagnosticReport, report_id)
    if not rep:
        raise HTTPException(status_code=404, detail="Diagnostic report not found")
    csv_data = export_report_csv(rep)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="NetPulse_Report_{report_id}.csv"'},
    )

