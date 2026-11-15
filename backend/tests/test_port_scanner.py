"""Tests for Bonus Feature 5: Async Socket Port Scanner & Service Banner Grabbing."""
import asyncio
import pytest
from sqlmodel import Session
from app.services.port_scanner import scan_host_ports


@pytest.mark.asyncio
async def test_port_scanner_detects_local_ephemeral_tcp_server(db_session: Session) -> None:
    async def handle_client(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:  # noqa: ARG001
        writer.write(b"SSH-2.0-NetPulse_Test_Server\r\n")
        await writer.drain()
        writer.close()
        await writer.wait_closed()

    server = await asyncio.start_server(handle_client, "127.0.0.1", 0)
    port = server.sockets[0].getsockname()[1]

    try:
        res = await scan_host_ports(
            session=db_session,
            target_ip="127.0.0.1",
            preset="custom",
            ports=[port],
            timeout_s=0.6,
        )
        assert res["open_ports_count"] == 1
        finding = res["results"][0]
        assert finding["port"] == port
        assert finding["state"] == "OPEN"
        assert "NetPulse_Test_Server" in finding["banner"]
    finally:
        server.close()
        await server.wait_closed()

