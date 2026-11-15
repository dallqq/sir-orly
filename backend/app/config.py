"""Application configuration settings for NetPulse NOC."""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
CAPTURES_DIR = BASE_DIR / "captures"
REPORTS_DIR = BASE_DIR / "reports"

CAPTURES_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


class Settings(BaseSettings):
    """Centralized settings with sensible offline-first defaults."""

    app_name: str = "NetPulse NOC — Network Monitoring & Performance Analysis System"
    app_version: str = "1.0.0"
    api_prefix: str = "/api/v1"

    # Database Configuration (Local SQLite WAL default + Optional Cloud PostgreSQL)
    database_url: str = f"sqlite:///{(BASE_DIR / 'netpulse.db').as_posix()}"
    cloud_database_url: str = ""
    active_db_mode: str = "SQLITE_LOCAL"  # "SQLITE_LOCAL" or "CLOUD_POSTGRESQL"

    # Network Discovery & Ping Defaults
    default_ping_count: int = 4
    default_ping_timeout_ms: int = 1500
    default_packet_size: int = 32
    port_scan_concurrency: int = 100
    port_scan_timeout_s: float = 0.75

    # Real-Time Monitoring Interval
    telemetry_interval_s: float = 2.0
    realtime_monitoring_enabled: bool = True

    # Optional SMTP Settings for Bonus Feature 4 (Email Notification)
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_sender: str = "netpulse-noc@wvsu.edu.ph"
    smtp_default_recipient: str = "admin@wvsu.edu.ph"
    smtp_use_tls: bool = True

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

