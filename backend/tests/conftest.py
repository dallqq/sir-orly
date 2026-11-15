"""Pytest fixtures and test configuration for NetPulse NOC backend."""
from pathlib import Path
import sys
import pytest
from sqlmodel import Session, SQLModel, create_engine

BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.models import device, packet, security, telemetry  # noqa: E402, F401


@pytest.fixture()
def db_session(tmp_path: Path):
    """Provide a clean temporary SQLite session per test."""
    db_file = tmp_path / "test_netpulse.db"
    eng = create_engine(f"sqlite:///{db_file.as_posix()}", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(eng)
    with Session(eng) as session:
        yield session

