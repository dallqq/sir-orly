"""Tests for Feature 5 & Bonus Feature 4: 4-Category Security Rule Engine & Email Outbox."""
import pytest
from sqlmodel import Session
from app.services.email_notifier import dispatch_alert_email
from app.services.network_scanner import run_subnet_discovery
from app.services.security_advisor import evaluate_network_security


@pytest.mark.asyncio
async def test_security_advisor_covers_all_four_pdf_categories_and_email_outbox(db_session: Session) -> None:
    await run_subnet_discovery(session=db_session, scan_mode="simulation")
    eval_res = evaluate_network_security(session=db_session)

    assert 0 <= eval_res["security_score"] <= 100
    assert eval_res["security_grade"] in ("A", "B", "C", "D", "F")
    cats = eval_res["category_counts"]
    assert cats["CONNECTIVITY"] >= 1
    assert cats["AVAILABILITY"] >= 1
    assert cats["FIREWALL"] >= 1
    assert cats["AUTHENTICATION"] >= 1

    mail_res = await dispatch_alert_email(
        session=db_session,
        recipient_email="instructor@wvsu.edu.ph",
        subject="Automated Test Alert",
    )
    assert mail_res["status"] == "ok"
    assert mail_res["email_log"]["recipient_email"] == "instructor@wvsu.edu.ph"

