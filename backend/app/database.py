"""Hybrid SQLModel Database Engine (Local SQLite WAL + Cloud PostgreSQL)."""
from collections.abc import Generator
from typing import Any
from sqlalchemy import event, text
from sqlmodel import Session, SQLModel, create_engine
from app.config import settings


def _build_sqlite_engine(url: str):
    eng = create_engine(
        url,
        echo=False,
        connect_args={"check_same_thread": False, "timeout": 15},
    )

    @event.listens_for(eng, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):  # noqa: ANN001, ARG001
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.execute("PRAGMA synchronous=NORMAL;")
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.close()

    return eng


engine = _build_sqlite_engine(settings.database_url)
_current_db_url: str = settings.database_url
_current_db_mode: str = "SQLITE_LOCAL"


def get_engine():
    """Return current active SQLAlchemy/SQLModel engine."""
    return engine


def init_db() -> None:
    """Create all canonical SQLModel tables if they do not exist."""
    from app.models import device, packet, security, telemetry  # noqa: F401

    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a database session."""
    with Session(engine) as session:
        yield session


def get_database_status() -> dict[str, Any]:
    """Return active database mode and health status (Bonus Feature 8)."""
    masked_url = _current_db_url
    if "@" in masked_url and "://" in masked_url:
        prefix, rest = masked_url.split("://", 1)
        if "@" in rest:
            _, host_part = rest.split("@", 1)
            masked_url = f"{prefix}://***:***@{host_part}"

    is_connected = False
    error_msg = None
    try:
        with Session(engine) as s:
            s.exec(text("SELECT 1"))
            is_connected = True
    except Exception as exc:  # noqa: BLE001
        error_msg = str(exc)

    return {
        "mode": _current_db_mode,
        "provider": "Cloud PostgreSQL (Supabase / Neon)"
        if _current_db_mode == "CLOUD_POSTGRESQL"
        else "Local SQLite WAL (netpulse.db)",
        "database_url_masked": masked_url,
        "connected": is_connected,
        "cloud_configured": bool(settings.cloud_database_url),
        "error": error_msg,
    }


def switch_database_mode(mode: str, cloud_url: str | None = None) -> dict[str, Any]:
    """Switch or test connection between Local SQLite WAL and Cloud PostgreSQL."""
    global engine, _current_db_url, _current_db_mode  # noqa: PLW0603

    target_mode = mode.upper().strip()
    if target_mode in ("CLOUD", "POSTGRES", "POSTGRESQL", "CLOUD_POSTGRESQL"):
        candidate_url = (cloud_url or settings.cloud_database_url).strip()
        if not candidate_url:
            return {
                **get_database_status(),
                "switched": False,
                "message": (
                    "No Cloud PostgreSQL URL provided. Staying on Local SQLite WAL mode. "
                    "Provide a postgresql:// connection string (Supabase / Neon) to switch."
                ),
            }
        if candidate_url.startswith("postgres://"):
            candidate_url = candidate_url.replace("postgres://", "postgresql://", 1)
        try:
            test_eng = create_engine(candidate_url, pool_pre_ping=True, connect_args={"connect_timeout": 5})
            with Session(test_eng) as s:
                s.exec(text("SELECT 1"))
            engine = test_eng
            _current_db_url = candidate_url
            _current_db_mode = "CLOUD_POSTGRESQL"
            settings.cloud_database_url = candidate_url
            init_db()
            return {
                **get_database_status(),
                "switched": True,
                "message": "Successfully connected and initialized tables on Cloud PostgreSQL.",
            }
        except Exception as exc:  # noqa: BLE001
            return {
                **get_database_status(),
                "switched": False,
                "message": f"Cloud PostgreSQL connection failed ({exc}). Retaining Local SQLite WAL.",
            }

    # Switch back to Local SQLite WAL
    engine = _build_sqlite_engine(settings.database_url)
    _current_db_url = settings.database_url
    _current_db_mode = "SQLITE_LOCAL"
    init_db()
    return {
        **get_database_status(),
        "switched": True,
        "message": "Active database set to Local SQLite WAL (netpulse.db).",
    }

