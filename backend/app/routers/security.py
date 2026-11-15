"""Feature 5 & Bonus Feature 4 Router: Security Recommendations & Email Alert Notifications."""
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from app.database import get_session
from app.models.security import EmailAlertLog, SecurityAlert
from app.services.email_notifier import dispatch_alert_email
from app.services.security_advisor import evaluate_network_security

router = APIRouter(prefix="/security", tags=["Feature 5 & Bonus: Security Advisor & Email Alerts"])


class EmailAlertRequest(BaseModel):
    recipient_email: str = "admin@wvsu.edu.ph"
    subject: Optional[str] = None
    custom_message: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None


@router.post("/evaluate")
def run_security_evaluation(session: Session = Depends(get_session)) -> dict[str, Any]:
    """Evaluate all 4 required security categories across devices, QoS stats, and open ports."""
    return evaluate_network_security(session)


@router.get("/recommendations")
def get_security_recommendations(session: Session = Depends(get_session)) -> dict[str, Any]:
    """Return current security recommendations (auto-evaluating if table is empty)."""
    existing = session.exec(select(SecurityAlert)).all()
    if not existing:
        return evaluate_network_security(session)
    return evaluate_network_security(session)


@router.post("/alerts/email")
async def send_security_alert_email(
    payload: EmailAlertRequest,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    """Dispatch an alert email via SMTP or store in Local Outbox Preview."""
    if not payload.recipient_email.strip():
        raise HTTPException(status_code=400, detail="recipient_email is required.")
    return await dispatch_alert_email(
        session=session,
        recipient_email=payload.recipient_email.strip(),
        subject=payload.subject,
        custom_message=payload.custom_message,
        smtp_host=payload.smtp_host,
        smtp_port=payload.smtp_port,
        smtp_username=payload.smtp_username,
        smtp_password=payload.smtp_password,
    )


@router.get("/alerts/outbox")
def get_email_outbox(session: Session = Depends(get_session)) -> dict[str, Any]:
    """Return all dispatched and simulated email alerts in the Local Outbox."""
    logs = session.exec(select(EmailAlertLog).order_by(EmailAlertLog.id.desc())).all()  # type: ignore[arg-type]
    return {
        "total": len(logs),
        "outbox": [log.model_dump(mode="json") for log in logs],
    }

