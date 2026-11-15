"""Tests for Feature 4 & Bonus Feature 3: Diagnostic Report & ReportLab PDF Export."""
from pathlib import Path
import pytest
from sqlmodel import Session
from app.models.security import DiagnosticReport
from app.services.network_scanner import run_subnet_discovery
from app.services.report_generator import export_report_csv, generate_diagnostic_report


@pytest.mark.asyncio
async def test_generate_diagnostic_report_and_pdf_bytes(db_session: Session) -> None:
    await run_subnet_discovery(session=db_session, scan_mode="simulation")
    res = generate_diagnostic_report(session=db_session, title="Unit Test Diagnostic Report")

    rep_meta = res["report"]
    pdf_path = Path(rep_meta["pdf_path"])
    assert pdf_path.exists()
    raw_bytes = pdf_path.read_bytes()
    assert raw_bytes.startswith(b"%PDF-1.")

    rep_obj = db_session.get(DiagnosticReport, rep_meta["id"])
    assert rep_obj is not None
    csv_str = export_report_csv(rep_obj)
    assert "[SECTION 1: DEVICES DETECTED]" in csv_str
    assert "[SECTION 2: PING RESULTS & NETWORK STATISTICS]" in csv_str
    assert "[SECTION 3: SECURITY RECOMMENDATIONS]" in csv_str

