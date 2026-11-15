"""Bonus Feature 4: Async SMTP Email Notification Service & Local Outbox Mailbox."""
from datetime import datetime, timezone
from email.message import EmailMessage
from typing import Any
from sqlmodel import Session, select
from app.config import settings
from app.models.device import DiscoveredDevice
from app.models.security import EmailAlertLog, SecurityAlert
from app.models.telemetry import HostQoSStats


async def dispatch_alert_email(
    session: Session,
    recipient_email: str,
    subject: str | None = None,
    custom_message: str | None = None,
    smtp_host: str | None = None,
    smtp_port: int | None = None,
    smtp_username: str | None = None,
    smtp_password: str | None = None,
) -> dict[str, Any]:
    """Send an alert email via SMTP if credentials are provided, and always record in Local Outbox."""
    now = datetime.now(timezone.utc)
    devices = session.exec(select(DiscoveredDevice)).all()
    qos = session.exec(select(HostQoSStats)).all()
    alerts = session.exec(select(SecurityAlert)).all()

    online_count = sum(1 for d in devices if d.is_online)
    high_alerts = [a for a in alerts if a.severity in ("CRITICAL", "HIGH")]

    resolved_subject = subject or f"[NetPulse NOC Alert] {len(high_alerts)} Critical/High Findings | {online_count}/{len(devices)} Hosts Online"

    lines = [
        "NetPulse NOC — Automated Network & Security Telemetry Alert",
        f"Timestamp: {now.strftime('%Y-%m-%d %H:%M:%S UTC')}",
        f"Active Devices: {online_count} Online / {len(devices)} Total",
        f"Tested QoS Hosts: {len(qos)}",
        "",
    ]
    if custom_message:
        lines.extend([f"Operator Note: {custom_message}", ""])

    lines.append("Top Security & Connectivity Recommendations:")
    for idx, a in enumerate(alerts[:6], 1):
        lines.append(f"  {idx}. [{a.severity} / {a.category}] {a.title} ({a.target_ip})")
        lines.append(f"     Action: {a.recommendation}")

    body_text = "\n".join(lines)

    host = (smtp_host or settings.smtp_host).strip()
    port = int(smtp_port or settings.smtp_port)
    user = (smtp_username if smtp_username is not None else settings.smtp_username).strip()
    pwd = (smtp_password if smtp_password is not None else settings.smtp_password).strip()

    delivery_mode = "LOCAL_OUTBOX_SIMULATED"
    status_detail = "Recorded in Local Outbox Preview (Offline-Safe Demo Mode — configure SMTP credentials to relay externally)."

    if host and user and pwd:
        try:
            import aiosmtplib  # type: ignore[import-untyped]

            msg = EmailMessage()
            msg["From"] = user
            msg["To"] = recipient_email
            msg["Subject"] = resolved_subject
            msg.set_content(body_text)

            await aiosmtplib.send(
                msg,
                hostname=host,
                port=port,
                username=user,
                password=pwd,
                start_tls=True,
                timeout=8.0,
            )
            delivery_mode = "SMTP_SENT"
            status_detail = f"Dispatched via live SMTP server ({host}:{port}) and archived in Outbox."
        except Exception as exc:  # noqa: BLE001
            delivery_mode = "LOCAL_OUTBOX_SIMULATED"
            status_detail = f"SMTP relay unreachable ({exc}); safely captured in Local Outbox Preview."

    log_entry = EmailAlertLog(
        recipient_email=recipient_email,
        subject=resolved_subject,
        body_preview=body_text,
        alert_category="SECURITY_AND_CONNECTIVITY",
        delivery_mode=delivery_mode,
        created_at=now,
    )
    session.add(log_entry)
    session.commit()
    session.refresh(log_entry)

    return {
        "status": "ok",
        "delivery_mode": delivery_mode,
        "message": status_detail,
        "email_log": log_entry.model_dump(mode="json"),
    }

