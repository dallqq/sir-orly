"""Canonical SQLModel tables for Security Advisor, Diagnostic Reports & Email Alerts (Features 4, 5 & Bonus)."""
from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class SecurityAlert(SQLModel, table=True):
    """Feature 5 Security & Performance Recommendation record."""

    __tablename__ = "security_alerts"

    id: Optional[int] = Field(default=None, primary_key=True)
    category: str = Field(index=True)  # "CONNECTIVITY" | "AVAILABILITY" | "FIREWALL" | "AUTHENTICATION"
    severity: str = Field(default="MEDIUM")  # "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
    target_ip: str = Field(default="Subnet-Wide")
    hostname: str = Field(default="All Hosts")
    title: str
    description: str
    recommendation: str
    remediation_command: str = Field(default="")
    is_resolved: bool = Field(default=False)
    created_at: datetime = Field(default_factory=utc_now)


class DiagnosticReport(SQLModel, table=True):
    """Feature 4 & Bonus PDF Report snapshot."""

    __tablename__ = "diagnostic_reports"

    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=utc_now)
    title: str = Field(default="NetPulse Network Diagnostic & Security Report")
    interface_name: str = Field(default="Default")
    local_ip: str = Field(default="127.0.0.1")
    subnet_cidr: str = Field(default="192.168.1.0/24")
    gateway_ip: str = Field(default="192.168.1.1")
    total_devices: int = Field(default=0)
    online_devices: int = Field(default=0)
    avg_subnet_latency_ms: float = Field(default=0.0)
    max_subnet_latency_ms: float = Field(default=0.0)
    overall_packet_loss_pct: float = Field(default=0.0)
    health_score: int = Field(default=100)
    security_grade: str = Field(default="A")
    summary_text: str = Field(default="")
    report_payload_json: str = Field(default="{}")
    pdf_path: str = Field(default="")


class EmailAlertLog(SQLModel, table=True):
    """Bonus Feature 4: Email Notification & Local Outbox Preview log."""

    __tablename__ = "email_alert_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    recipient_email: str
    subject: str
    body_preview: str
    alert_category: str = Field(default="SECURITY_AND_CONNECTIVITY")
    delivery_mode: str = Field(default="LOCAL_OUTBOX_SIMULATED")  # "SMTP_SENT" | "LOCAL_OUTBOX_SIMULATED" | "FAILED"
    created_at: datetime = Field(default_factory=utc_now)

