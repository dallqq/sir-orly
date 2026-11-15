"""Features 2 & 3: 3-Tier Multi-Protocol Ping Engine & QoS Statistics Aggregator."""
import asyncio
from datetime import datetime, timezone
import re
import socket
import time
from typing import Any
from sqlmodel import Session, select
from app.models.device import DiscoveredDevice
from app.models.telemetry import HostQoSStats, PingSample
from app.services.ws_manager import ws_manager

TCP_PING_PORTS = (80, 443, 445, 135, 22, 8000, 3000)


async def _single_tcp_ping(ip_str: str, timeout_s: float) -> tuple[float | None, int | None]:
    """Tier 3: Measure TCP SYN -> SYN-ACK / RST handshake RTT when ICMP is blocked."""
    for port in TCP_PING_PORTS:
        t0 = time.perf_counter()
        try:
            conn = asyncio.open_connection(ip_str, port)
            _, writer = await asyncio.wait_for(conn, timeout=min(timeout_s, 0.45))
            rtt = round((time.perf_counter() - t0) * 1000.0, 2)
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:  # noqa: BLE001
                pass
            return max(0.3, rtt), 64
        except ConnectionRefusedError:
            rtt = round((time.perf_counter() - t0) * 1000.0, 2)
            return max(0.3, rtt), 64
        except Exception:  # noqa: BLE001
            continue
    return None, None


async def _single_os_ping(ip_str: str, packet_size: int, timeout_ms: int) -> tuple[float | None, int | None]:
    """Tier 2: Native Windows/POSIX `ping` subprocess parser handling both `time=12ms` and `time<1ms`."""
    try:
        proc = await asyncio.create_subprocess_exec(
            "ping",
            "-n",
            "1",
            "-l",
            str(max(16, min(packet_size, 1400))),
            "-w",
            str(max(250, timeout_ms)),
            ip_str,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout_bytes, _ = await asyncio.wait_for(
            proc.communicate(),
            timeout=(timeout_ms / 1000.0) + 1.0,
        )
        output = stdout_bytes.decode("utf-8", errors="ignore")
        lower_out = output.lower()

        if "ttl=" not in lower_out and "time=" not in lower_out and "time<" not in lower_out:
            return None, None

        if "time<1ms" in lower_out or "time<1 ms" in lower_out:
            rtt = 0.5
        else:
            m_time = re.search(r"time[=<]\s*(\d+(?:\.\d+)?)\s*ms", output, re.IGNORECASE)
            if not m_time:
                return None, None
            rtt = round(float(m_time.group(1)), 2)

        m_ttl = re.search(r"ttl=(\d+)", output, re.IGNORECASE)
        ttl = int(m_ttl.group(1)) if m_ttl else 64
        return rtt, ttl
    except Exception:  # noqa: BLE001
        return None, None


async def _single_icmplib_ping(ip_str: str, packet_size: int, timeout_s: float) -> tuple[float | None, int | None]:
    """Tier 1: Attempt `icmplib.async_ping` unprivileged/privileged ICMP Echo."""
    try:
        from icmplib import async_ping  # type: ignore[import-untyped]

        res = await async_ping(
            ip_str,
            count=1,
            timeout=timeout_s,
            payload_size=max(16, min(packet_size, 1400)),
            privileged=False,
        )
        if res.is_alive:
            return round(max(0.2, float(res.avg_rtt)), 2), 64
    except Exception:  # noqa: BLE001
        pass
    return None, None


def calculate_qos_metrics(rtts: list[float], sent: int) -> dict[str, float]:
    """Calculate exact Feature 3 Network Statistics with zero-division protection."""
    received = len(rtts)
    safe_sent = max(1, sent)
    loss_pct = round(((safe_sent - received) / safe_sent) * 100.0, 1)

    if received == 0:
        return {
            "min_latency_ms": 0.0,
            "avg_latency_ms": 0.0,
            "max_latency_ms": 0.0,
            "jitter_ms": 0.0,
            "packet_loss_pct": 100.0,
        }

    min_rtt = round(min(rtts), 2)
    avg_rtt = round(sum(rtts) / received, 2)
    max_rtt = round(max(rtts), 2)

    if received > 1:
        diffs = [abs(rtts[i] - rtts[i - 1]) for i in range(1, received)]
        jitter = round(sum(diffs) / len(diffs), 2)
    else:
        jitter = 0.0

    return {
        "min_latency_ms": min_rtt,
        "avg_latency_ms": avg_rtt,
        "max_latency_ms": max_rtt,
        "jitter_ms": jitter,
        "packet_loss_pct": loss_pct,
    }


async def ping_host(
    session: Session,
    target_ip: str,
    count: int = 4,
    packet_size: int = 32,
    timeout_ms: int = 1200,
    protocol: str = "auto",
) -> dict[str, Any]:
    """Execute a multi-sequence ping test against a host and persist Feature 2 & 3 stats."""
    clean_ip = target_ip.strip()
    count = max(1, min(count, 50))
    timeout_s = max(0.3, timeout_ms / 1000.0)
    proto_mode = protocol.strip().lower()

    # Check if host exists in DiscoveredDevice for hostname resolution
    dev = session.exec(select(DiscoveredDevice).where(DiscoveredDevice.ip_address == clean_ip)).first()
    hostname = dev.hostname if dev else clean_ip
    if hostname == clean_ip:
        try:
            hostname = socket.gethostbyaddr(clean_ip)[0]
        except Exception:  # noqa: BLE001
            hostname = "localhost" if clean_ip == "127.0.0.1" else f"Host-{clean_ip.replace('.', '-')}"

    rtts: list[float] = []
    samples: list[dict[str, Any]] = []
    last_ttl: int | None = None
    method_used = "ICMP"

    for seq in range(1, count + 1):
        rtt: float | None = None
        ttl: int | None = None

        if proto_mode == "tcp":
            rtt, ttl = await _single_tcp_ping(clean_ip, timeout_s)
            method_used = "TCP_PING"
        else:
            # Tier 1: icmplib
            rtt, ttl = await _single_icmplib_ping(clean_ip, packet_size, timeout_s)
            if rtt is not None:
                method_used = "ICMP"
            else:
                # Tier 2: Native OS ping
                rtt, ttl = await _single_os_ping(clean_ip, packet_size, timeout_ms)
                if rtt is not None:
                    method_used = "OS_PING"
                elif proto_mode == "auto":
                    # Tier 3: Fallback to TCP Handshake Ping if ICMP is filtered
                    rtt, ttl = await _single_tcp_ping(clean_ip, timeout_s)
                    if rtt is not None:
                        method_used = "TCP_PING"

        # If target is a simulated Campus Lab device and not physically on local NIC, synthesize realistic reply
        if rtt is None and dev and dev.discovery_method == "SIMULATED" and dev.is_online:
            base = dev.last_rtt_ms or 4.5
            variation = ((seq % 3) - 1) * 0.45
            rtt = round(max(0.5, base + variation), 2)
            ttl = 64
            method_used = "SIMULATED_ICMP"

        status_str = "SUCCESS" if rtt is not None else "TIMEOUT"
        if rtt is not None:
            rtts.append(rtt)
            last_ttl = ttl

        now = datetime.now(timezone.utc)
        sample_row = PingSample(
            ip_address=clean_ip,
            seq=seq,
            rtt_ms=rtt,
            ttl=ttl,
            status=status_str,
            protocol="TCP" if "TCP" in method_used else "ICMP",
            timestamp=now,
        )
        session.add(sample_row)

        seq_payload = {
            "ip_address": clean_ip,
            "hostname": hostname,
            "seq": seq,
            "count": count,
            "bytes": packet_size,
            "rtt_ms": rtt,
            "ttl": ttl,
            "status": status_str,
            "protocol": method_used,
            "timestamp": now.isoformat(),
        }
        samples.append(seq_payload)
        await ws_manager.broadcast("ping_reply", seq_payload)

        if seq < count:
            await asyncio.sleep(0.12)

    metrics = calculate_qos_metrics(rtts, count)
    now = datetime.now(timezone.utc)

    qos = session.exec(select(HostQoSStats).where(HostQoSStats.ip_address == clean_ip)).first()
    if qos:
        qos.hostname = hostname
        qos.packets_sent += count
        qos.packets_received += len(rtts)
        qos.packet_loss_pct = metrics["packet_loss_pct"]
        qos.min_latency_ms = metrics["min_latency_ms"]
        qos.avg_latency_ms = metrics["avg_latency_ms"]
        qos.max_latency_ms = metrics["max_latency_ms"]
        qos.jitter_ms = metrics["jitter_ms"]
        qos.last_ttl = last_ttl
        qos.ping_method = method_used
        qos.updated_at = now
        session.add(qos)
    else:
        qos = HostQoSStats(
            ip_address=clean_ip,
            hostname=hostname,
            packets_sent=count,
            packets_received=len(rtts),
            packet_loss_pct=metrics["packet_loss_pct"],
            min_latency_ms=metrics["min_latency_ms"],
            avg_latency_ms=metrics["avg_latency_ms"],
            max_latency_ms=metrics["max_latency_ms"],
            jitter_ms=metrics["jitter_ms"],
            last_ttl=last_ttl,
            ping_method=method_used,
            updated_at=now,
        )
        session.add(qos)

    if dev:
        dev.is_online = len(rtts) > 0
        if len(rtts) > 0:
            dev.last_rtt_ms = metrics["avg_latency_ms"]
            dev.last_seen = now
        session.add(dev)

    session.commit()
    session.refresh(qos)

    return {
        "ip_address": clean_ip,
        "hostname": hostname,
        "packets_sent": count,
        "packets_received": len(rtts),
        "packet_loss_pct": metrics["packet_loss_pct"],
        "min_latency_ms": metrics["min_latency_ms"],
        "avg_latency_ms": metrics["avg_latency_ms"],
        "max_latency_ms": metrics["max_latency_ms"],
        "jitter_ms": metrics["jitter_ms"],
        "last_ttl": last_ttl,
        "ping_method": method_used,
        "samples": samples,
    }


async def ping_multiple_hosts(
    session: Session,
    targets: list[str],
    count: int = 4,
    packet_size: int = 32,
    timeout_ms: int = 1200,
    protocol: str = "auto",
) -> list[dict[str, Any]]:
    """Run ping tests across one or more target IPs sequentially/safely with DB persistence."""
    results: list[dict[str, Any]] = []
    for target in targets:
        if not target.strip():
            continue
        res = await ping_host(
            session=session,
            target_ip=target.strip(),
            count=count,
            packet_size=packet_size,
            timeout_ms=timeout_ms,
            protocol=protocol,
        )
        results.append(res)
    return results

