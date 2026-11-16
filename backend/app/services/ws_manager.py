"""Unified WebSocket Telemetry Hub & Real-Time Bandwidth/Ping Monitor (/ws/monitor)."""
import asyncio
from datetime import datetime, timezone
import time
from typing import Any
from fastapi import WebSocket
import psutil
from sqlmodel import Session, select
from app.config import settings
from app.database import get_engine
from app.models.device import DiscoveredDevice
from app.models.telemetry import HostQoSStats


class WebSocketManager:
    """Manages active WebSocket connections and broadcasts real-time NOC telemetry."""

    def __init__(self) -> None:
        self.active_connections: set[WebSocket] = set()
        self._monitor_task: asyncio.Task[None] | None = None
        self._running: bool = False
        self._last_net_io = psutil.net_io_counters()
        self._last_net_time = time.monotonic()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self.active_connections.discard(websocket)

    async def broadcast(self, event_type: str, payload: dict[str, Any]) -> None:
        """Broadcast a structured JSON event to all connected WebSocket clients."""
        if not self.active_connections:
            return
        message = {
            "type": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": payload,
        }
        stale: list[WebSocket] = []
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:  # noqa: BLE001
                stale.append(connection)
        for dead in stale:
            self.active_connections.discard(dead)

    def get_bandwidth_snapshot(self) -> dict[str, Any]:
        """Compute instantaneous TX/RX throughput in kbps using psutil.net_io_counters()."""
        now = time.monotonic()
        current_io = psutil.net_io_counters()
        elapsed = max(now - self._last_net_time, 0.25)

        bytes_sent_delta = max(0, current_io.bytes_sent - self._last_net_io.bytes_sent)
        bytes_recv_delta = max(0, current_io.bytes_recv - self._last_net_io.bytes_recv)

        tx_kbps = round((bytes_sent_delta * 8) / (elapsed * 1000.0), 2)
        rx_kbps = round((bytes_recv_delta * 8) / (elapsed * 1000.0), 2)

        self._last_net_io = current_io
        self._last_net_time = now

        return {
            "tx_kbps": tx_kbps,
            "rx_kbps": rx_kbps,
            "total_mb_sent": round(current_io.bytes_sent / (1024 * 1024), 2),
            "total_mb_recv": round(current_io.bytes_recv / (1024 * 1024), 2),
            "packets_sent": current_io.packets_sent,
            "packets_recv": current_io.packets_recv,
        }

    async def start_background_monitor(self) -> None:
        """Start the 2-second real-time monitoring loop if not already running."""
        if self._monitor_task and not self._monitor_task.done():
            return
        self._running = True
        self._monitor_task = asyncio.create_task(self._monitor_loop())

    async def stop_background_monitor(self) -> None:
        self._running = False
        if self._monitor_task and not self._monitor_task.done():
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass

    async def _monitor_loop(self) -> None:
        """Broadcasts live bandwidth & host latency snapshots every 2 seconds."""
        while self._running:
            try:
                await asyncio.sleep(settings.telemetry_interval_s)
                if not settings.realtime_monitoring_enabled or not self.active_connections:
                    continue

                bw = self.get_bandwidth_snapshot()
                host_metrics: list[dict[str, Any]] = []
                online_count = 0
                total_count = 0
                avg_rtt = 0.0
                avg_loss = 0.0

                try:
                    with Session(get_engine()) as session:
                        devices = session.exec(select(DiscoveredDevice)).all()
                        stats = session.exec(select(HostQoSStats)).all()
                        total_count = len(devices)
                        online_count = sum(1 for d in devices if d.is_online)

                        rtts = [s.avg_latency_ms for s in stats if s.avg_latency_ms > 0]
                        losses = [s.packet_loss_pct for s in stats]
                        avg_rtt = round(sum(rtts) / len(rtts), 2) if rtts else 0.0
                        avg_loss = round(sum(losses) / len(losses), 2) if losses else 0.0

                        for s in stats[:8]:
                            host_metrics.append(
                                {
                                    "ip_address": s.ip_address,
                                    "hostname": s.hostname,
                                    "avg_latency_ms": s.avg_latency_ms,
                                    "max_latency_ms": s.max_latency_ms,
                                    "jitter_ms": s.jitter_ms,
                                    "packet_loss_pct": s.packet_loss_pct,
                                }
                            )
                except Exception:  # noqa: BLE001
                    pass

                await self.broadcast(
                    "telemetry_tick",
                    {
                        "bandwidth": bw,
                        "summary": {
                            "total_devices": total_count,
                            "online_devices": online_count,
                            "avg_latency_ms": avg_rtt,
                            "packet_loss_pct": avg_loss,
                        },
                        "hosts": host_metrics,
                    },
                )
            except asyncio.CancelledError:
                break
            except Exception:  # noqa: BLE001
                await asyncio.sleep(2.0)


ws_manager = WebSocketManager()

