"""Course Topic 7 & Bonus Feature 6: Wireshark Packet Analyzer, Scapy Sniffer, Socket Fallback & .pcap Engine."""
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import shutil
import subprocess
import time
from typing import Any
import psutil
from sqlmodel import Session, select
from app.config import CAPTURES_DIR
from app.models.packet import OsiLayersSchema, PacketDissectionSchema, PcapCaptureSession

ALLOWED_BPF_PATTERN = re.compile(r"^[a-zA-Z0-9\s\.\:\-\/\(\)\=\!\<\>\_]*$")


def validate_bpf_filter(bpf_filter: str | None) -> str:
    """Validate and normalize BPF filter string."""
    if not bpf_filter or bpf_filter.strip().lower() in ("all", "*", "any", ""):
        return ""
    cleaned = bpf_filter.strip()
    if not ALLOWED_BPF_PATTERN.match(cleaned) or len(cleaned) > 120:
        raise ValueError(f"Invalid BPF filter syntax: {cleaned}")
    return cleaned


def format_hex_dump(raw_bytes: bytes) -> str:
    """Format packet bytes into classic Wireshark 16-byte offset Hex + ASCII dump."""
    lines: list[str] = []
    for offset in range(0, len(raw_bytes), 16):
        chunk = raw_bytes[offset : offset + 16]
        hex_part = " ".join(f"{b:02x}" for b in chunk)
        ascii_part = "".join(chr(b) if 32 <= b <= 126 else "." for b in chunk)
        lines.append(f"{offset:04x}  {hex_part:<47}  {ascii_part}")
    return "\n".join(lines)


def dissect_scapy_packet(pkt: Any, index: int, base_time: float | None = None) -> PacketDissectionSchema:
    """Dissect a Scapy packet across OSI Layers 2, 3, 4, and 7."""
    from scapy.all import ARP, DNS, ICMP, IP, TCP, UDP, Ether, Raw  # type: ignore[import-untyped]

    pkt_time = float(getattr(pkt, "time", time.time()))
    rel_ts = f"{max(0.0, pkt_time - (base_time or pkt_time)):.6f}s"
    raw_bytes = bytes(pkt)
    length = len(raw_bytes)

    src_mac = "00:00:00:00:00:00"
    dst_mac = "ff:ff:ff:ff:ff:ff"
    ether_type = "0x0800 (IPv4)"
    if pkt.haslayer(Ether):
        eth = pkt[Ether]
        src_mac = str(getattr(eth, "src", src_mac)).upper()
        dst_mac = str(getattr(eth, "dst", dst_mac)).upper()
        etype = getattr(eth, "type", 0x0800)
        ether_type = f"0x{etype:04x}"

    layer_2 = {
        "layer": "Layer 2 — Data Link (Ethernet II)",
        "src_mac": src_mac,
        "dst_mac": dst_mac,
        "ether_type": ether_type,
        "frame_length_bytes": length,
    }

    protocol = "OTHER"
    src_ip = src_mac
    dst_ip = dst_mac
    src_port: int | None = None
    dst_port: int | None = None
    info = pkt.summary()

    layer_3: dict[str, Any] = {"layer": "Layer 3 — Network", "protocol": "None"}
    layer_4: dict[str, Any] = {"layer": "Layer 4 — Transport", "protocol": "None"}
    layer_7: dict[str, Any] = {"layer": "Layer 7 — Application", "protocol": "None", "payload_preview": ""}

    if pkt.haslayer(ARP):
        arp = pkt[ARP]
        protocol = "ARP"
        src_ip = str(getattr(arp, "psrc", "0.0.0.0"))
        dst_ip = str(getattr(arp, "pdst", "0.0.0.0"))
        op = int(getattr(arp, "op", 1))
        op_str = "Request (who-has)" if op == 1 else "Reply (is-at)"
        info = f"Who has {dst_ip}? Tell {src_ip}" if op == 1 else f"{src_ip} is at {src_mac}"
        layer_3 = {
            "layer": "Layer 2.5 / Layer 3 — Address Resolution Protocol (ARP)",
            "operation": op_str,
            "sender_ip": src_ip,
            "sender_mac": src_mac,
            "target_ip": dst_ip,
            "target_mac": dst_mac,
        }
    elif pkt.haslayer(IP):
        ip = pkt[IP]
        src_ip = str(ip.src)
        dst_ip = str(ip.dst)
        ttl = int(getattr(ip, "ttl", 64))
        layer_3 = {
            "layer": "Layer 3 — Network (IPv4)",
            "version": 4,
            "src_ip": src_ip,
            "dst_ip": dst_ip,
            "ttl": ttl,
            "header_checksum": hex(getattr(ip, "chksum", 0) or 0),
            "total_length": int(getattr(ip, "len", length) or length),
        }

        if pkt.haslayer(ICMP):
            icmp = pkt[ICMP]
            protocol = "ICMP"
            ic_type = int(getattr(icmp, "type", 8))
            type_label = "Echo (ping) request" if ic_type == 8 else ("Echo (ping) reply" if ic_type == 0 else f"Type {ic_type}")
            seq = int(getattr(icmp, "seq", 1) or 1)
            info = f"ICMP {type_label}, id={hex(getattr(icmp, 'id', 1) or 1)}, seq={seq}, ttl={ttl}"
            layer_4 = {
                "layer": "Layer 3/4 — Control Message (ICMP)",
                "type": type_label,
                "code": int(getattr(icmp, "code", 0)),
                "sequence": seq,
            }
        elif pkt.haslayer(TCP):
            tcp = pkt[TCP]
            protocol = "TCP"
            src_port = int(tcp.sport)
            dst_port = int(tcp.dport)
            flags_str = str(tcp.flags)
            seq_num = int(getattr(tcp, "seq", 0))
            ack_num = int(getattr(tcp, "ack", 0))
            win_size = int(getattr(tcp, "window", 64240))
            info = f"{src_port} -> {dst_port} [{flags_str}] Seq={seq_num} Ack={ack_num} Win={win_size} Len={len(bytes(tcp.payload))}"
            layer_4 = {
                "layer": "Layer 4 — Transport (TCP)",
                "src_port": src_port,
                "dst_port": dst_port,
                "tcp_flags": flags_str,
                "seq_number": seq_num,
                "ack_number": ack_num,
                "window_size": win_size,
            }
            if pkt.haslayer(Raw):
                payload_text = bytes(pkt[Raw].load).decode("utf-8", errors="ignore")
                if "HTTP/" in payload_text or payload_text.startswith(("GET ", "POST ", "HEAD ")):
                    protocol = "HTTP"
                    first_line = payload_text.splitlines()[0] if payload_text.splitlines() else "HTTP Payload"
                    info = f"HTTP {first_line}"
                    layer_7 = {
                        "layer": "Layer 7 — Application (HTTP)",
                        "protocol": "HTTP/1.1",
                        "request_or_status": first_line,
                        "payload_preview": payload_text[:240],
                    }
                else:
                    layer_7 = {
                        "layer": "Layer 7 — Application Payload",
                        "protocol": "TLS / Encrypted" if (src_port == 443 or dst_port == 443) else "TCP Stream",
                        "payload_preview": payload_text[:180],
                    }
            elif src_port == 443 or dst_port == 443:
                protocol = "TLS"
                layer_7 = {
                    "layer": "Layer 6/7 — TLS Encrypted Session",
                    "protocol": "TLSv1.3 / HTTPS",
                    "payload_preview": "Encrypted Application Data / Handshake",
                }
        elif pkt.haslayer(UDP):
            udp = pkt[UDP]
            protocol = "UDP"
            src_port = int(udp.sport)
            dst_port = int(udp.dport)
            info = f"{src_port} -> {dst_port} Len={len(bytes(udp.payload))}"
            layer_4 = {
                "layer": "Layer 4 — Transport (UDP)",
                "src_port": src_port,
                "dst_port": dst_port,
                "length": int(getattr(udp, "len", 8) or 8),
            }
            if pkt.haslayer(DNS):
                protocol = "DNS"
                dns = pkt[DNS]
                qr = int(getattr(dns, "qr", 0))
                qname = "wvsu.edu.ph."
                if getattr(dns, "qd", None) and hasattr(dns.qd, "qname"):
                    qname = dns.qd.qname.decode("utf-8", errors="ignore")
                info = f"Standard query {'response ' if qr else ''}A {qname}"
                layer_7 = {
                    "layer": "Layer 7 — Domain Name System (DNS)",
                    "protocol": "DNS",
                    "message_type": "Response" if qr else "Query",
                    "query_name": qname,
                }

    return PacketDissectionSchema(
        index=index,
        timestamp=rel_ts,
        length=length,
        protocol=protocol,
        src_ip=src_ip,
        dst_ip=dst_ip,
        src_mac=src_mac,
        dst_mac=dst_mac,
        src_port=src_port,
        dst_port=dst_port,
        info=info,
        osi_layers=OsiLayersSchema(
            layer_2_datalink=layer_2,
            layer_3_network=layer_3,
            layer_4_transport=layer_4,
            layer_7_application=layer_7,
        ),
        hex_dump=format_hex_dump(raw_bytes),
    )


def build_sample_lan_packets(local_ip: str = "192.168.1.105", gateway_ip: str = "192.168.1.1") -> list[Any]:
    """Construct genuine Scapy Ethernet/ARP/IP/ICMP/UDP/DNS/TCP/HTTP frames for `.pcap` export & analysis."""
    from scapy.all import ARP, DNS, DNSQR, DNSRR, ICMP, IP, TCP, UDP, Ether, Raw  # type: ignore[import-untyped]

    base_t = time.time()
    pkts = [
        Ether(src="00:1e:67:aa:bb:cc", dst="ff:ff:ff:ff:ff:ff")
        / ARP(op=1, psrc=local_ip, hwsrc="00:1e:67:aa:bb:cc", pdst=gateway_ip),
        Ether(src="00:1a:2b:3c:4d:01", dst="00:1e:67:aa:bb:cc")
        / ARP(op=2, psrc=gateway_ip, hwsrc="00:1a:2b:3c:4d:01", pdst=local_ip, hwdst="00:1e:67:aa:bb:cc"),
        Ether(src="00:1e:67:aa:bb:cc", dst="00:1a:2b:3c:4d:01")
        / IP(src=local_ip, dst=gateway_ip, ttl=64)
        / ICMP(type=8, id=0x1024, seq=1)
        / Raw(load=b"NetPulse-NOC-Echo-Probe-Payload"),
        Ether(src="00:1a:2b:3c:4d:01", dst="00:1e:67:aa:bb:cc")
        / IP(src=gateway_ip, dst=local_ip, ttl=64)
        / ICMP(type=0, id=0x1024, seq=1)
        / Raw(load=b"NetPulse-NOC-Echo-Probe-Payload"),
        Ether(src="00:1e:67:aa:bb:cc", dst="00:1a:2b:3c:4d:01")
        / IP(src=local_ip, dst=gateway_ip, ttl=64)
        / UDP(sport=54321, dport=53)
        / DNS(rd=1, qd=DNSQR(qname="cict.wvsu.edu.ph")),
        Ether(src="00:1a:2b:3c:4d:01", dst="00:1e:67:aa:bb:cc")
        / IP(src=gateway_ip, dst=local_ip, ttl=64)
        / UDP(sport=53, dport=54321)
        / DNS(qr=1, aa=1, rcode=0, qd=DNSQR(qname="cict.wvsu.edu.ph"), an=DNSRR(rrname="cict.wvsu.edu.ph", ttl=300, rdata="192.168.1.10")),
        Ether(src="00:1e:67:aa:bb:cc", dst="00:1e:67:99:20:10")
        / IP(src=local_ip, dst="192.168.1.10", ttl=64)
        / TCP(sport=51820, dport=80, flags="S", seq=1000, window=64240),
        Ether(src="00:1e:67:99:20:10", dst="00:1e:67:aa:bb:cc")
        / IP(src="192.168.1.10", dst=local_ip, ttl=64)
        / TCP(sport=80, dport=51820, flags="SA", seq=5000, ack=1001, window=65535),
        Ether(src="00:1e:67:aa:bb:cc", dst="00:1e:67:99:20:10")
        / IP(src=local_ip, dst="192.168.1.10", ttl=64)
        / TCP(sport=51820, dport=80, flags="A", seq=1001, ack=5001, window=64240),
        Ether(src="00:1e:67:aa:bb:cc", dst="00:1e:67:99:20:10")
        / IP(src=local_ip, dst="192.168.1.10", ttl=64)
        / TCP(sport=51820, dport=80, flags="PA", seq=1001, ack=5001, window=64240)
        / Raw(load=b"GET /api/v1/health HTTP/1.1\r\nHost: cict.wvsu.edu.ph\r\nUser-Agent: NetPulse-NOC/1.0\r\n\r\n"),
        Ether(src="00:1e:67:99:20:10", dst="00:1e:67:aa:bb:cc")
        / IP(src="192.168.1.10", dst=local_ip, ttl=64)
        / TCP(sport=80, dport=51820, flags="PA", seq=5001, ack=1089, window=65535)
        / Raw(load=b"HTTP/1.1 200 OK\r\nServer: nginx/1.26.2\r\nContent-Type: application/json\r\n\r\n{\"status\":\"healthy\"}"),
        Ether(src="00:1e:67:aa:bb:cc", dst="00:1a:2b:3c:4d:01")
        / IP(src=local_ip, dst="1.1.1.1", ttl=64)
        / TCP(sport=52900, dport=443, flags="PA", seq=9000, ack=4200, window=64240)
        / Raw(load=b"\x16\x03\x03\x00\x45TLSv1.3-ClientHello-Cloudflare-DoH"),
    ]
    for idx, p in enumerate(pkts):
        p.time = base_t + (idx * 0.0042)
    return pkts


def synthesize_live_socket_packets(limit: int = 35, bpf_filter: str = "") -> list[Any]:
    """Automatic Fallback when Npcap is absent: synthesize Scapy packets from live `psutil.net_connections`."""
    from scapy.all import IP, TCP, Ether, Raw  # type: ignore[import-untyped]

    packets = build_sample_lan_packets()
    try:
        conns = psutil.net_connections(kind="inet")
        base_t = time.time()
        for idx, c in enumerate(conns[: max(10, limit)]):
            if not c.laddr or not c.raddr:
                continue
            lip, lport = c.laddr.ip, c.laddr.port
            rip, rport = c.raddr.ip, c.raddr.port
            if ":" in lip or ":" in rip:  # Skip IPv6 for IPv4 Ether/IP constructor
                continue
            pkt = (
                Ether(src="00:1e:67:aa:bb:cc", dst="00:1a:2b:3c:4d:01")
                / IP(src=lip, dst=rip, ttl=64)
                / TCP(sport=lport, dport=rport, flags="PA" if c.status == "ESTABLISHED" else "S", seq=1000 + idx * 64, ack=2000 + idx * 64)
                / Raw(load=f"ActiveSocket state={c.status} pid={c.pid or 0}".encode("utf-8"))
            )
            pkt.time = base_t + (idx * 0.008)
            packets.append(pkt)
    except Exception:  # noqa: BLE001
        pass

    lower_f = bpf_filter.lower().strip()
    if lower_f in ("arp", "icmp", "tcp", "udp", "dns", "http"):
        dissected = [(p, dissect_scapy_packet(p, i)) for i, p in enumerate(packets, 1)]
        filtered = [p for p, d in dissected if d.protocol.lower() == lower_f or (lower_f == "tcp" and d.protocol in ("TCP", "HTTP", "TLS"))]
        if filtered:
            packets = filtered

    return packets[:limit]


def compute_protocol_breakdown(dissected_packets: list[PacketDissectionSchema]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for pkt in dissected_packets:
        counts[pkt.protocol] = counts.get(pkt.protocol, 0) + 1
    return counts


def ensure_demo_pcap(session: Session) -> PcapCaptureSession:
    """Ensure `backend/captures/demo_lan_traffic.pcap` exists on disk and in database."""
    from scapy.utils import wrpcap  # type: ignore[import-untyped]

    demo_path = CAPTURES_DIR / "demo_lan_traffic.pcap"
    pkts = build_sample_lan_packets()
    if not demo_path.exists():
        wrpcap(str(demo_path), pkts)

    existing = session.exec(
        select(PcapCaptureSession).where(PcapCaptureSession.filename == "demo_lan_traffic.pcap")
    ).first()
    if existing:
        return existing

    dissected = [dissect_scapy_packet(p, idx + 1, float(pkts[0].time)) for idx, p in enumerate(pkts)]
    breakdown = compute_protocol_breakdown(dissected)

    rec = PcapCaptureSession(
        filename="demo_lan_traffic.pcap",
        file_path=str(demo_path),
        interface_name="Campus-LAN-Demo",
        bpf_filter="all",
        packet_count=len(pkts),
        capture_source="DEMO_PCAP",
        protocol_breakdown_json=json.dumps(breakdown),
    )
    session.add(rec)
    session.commit()
    session.refresh(rec)
    return rec


def capture_packets(
    session: Session,
    interface_name: str = "Auto",
    bpf_filter: str = "all",
    limit: int = 30,
    timeout: float = 3.0,
) -> dict[str, Any]:
    """Capture live packets via Scapy or live socket synthesizer fallback and save `.pcap`."""
    from scapy.all import sniff  # type: ignore[import-untyped]
    from scapy.utils import wrpcap  # type: ignore[import-untyped]

    clean_filter = validate_bpf_filter(bpf_filter)
    limit = max(5, min(limit, 250))
    timeout = max(1.0, min(timeout, 10.0))

    captured_pkts: list[Any] = []
    source_mode = "LIVE_SCAPY"

    try:
        sniff_kwargs: dict[str, Any] = {"count": limit, "timeout": timeout}
        if clean_filter:
            sniff_kwargs["filter"] = clean_filter
        if interface_name and interface_name.lower() not in ("auto", "default", "all"):
            sniff_kwargs["iface"] = interface_name
        res = sniff(**sniff_kwargs)
        captured_pkts = list(res)
    except Exception:  # noqa: BLE001
        captured_pkts = []

    if not captured_pkts:
        source_mode = "LIVE_SOCKET_FALLBACK"
        captured_pkts = synthesize_live_socket_packets(limit=limit, bpf_filter=clean_filter)

    ts_label = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"capture_{ts_label}.pcap"
    file_path = CAPTURES_DIR / filename
    wrpcap(str(file_path), captured_pkts)

    base_t = float(getattr(captured_pkts[0], "time", time.time())) if captured_pkts else time.time()
    dissected = [dissect_scapy_packet(p, idx + 1, base_t) for idx, p in enumerate(captured_pkts)]
    breakdown = compute_protocol_breakdown(dissected)

    cap_session = PcapCaptureSession(
        filename=filename,
        file_path=str(file_path),
        interface_name=interface_name or "Auto",
        bpf_filter=clean_filter or "all",
        packet_count=len(dissected),
        capture_source=source_mode,
        protocol_breakdown_json=json.dumps(breakdown),
    )
    session.add(cap_session)
    session.commit()
    session.refresh(cap_session)

    return {
        "session": cap_session.model_dump(),
        "protocol_breakdown": breakdown,
        "packets": [d.model_dump() for d in dissected],
    }


def load_pcap_session(session: Session, session_id: int) -> dict[str, Any]:
    """Read `.pcap` file from disk via Scapy `rdpcap` and return full OSI dissection."""
    from scapy.utils import rdpcap  # type: ignore[import-untyped]

    cap = session.get(PcapCaptureSession, session_id)
    if not cap:
        raise ValueError(f"Capture session {session_id} not found")

    path = Path(cap.file_path)
    if not path.exists():
        pkts = build_sample_lan_packets()
    else:
        pkts = list(rdpcap(str(path)))

    base_t = float(getattr(pkts[0], "time", time.time())) if pkts else time.time()
    dissected = [dissect_scapy_packet(p, idx + 1, base_t) for idx, p in enumerate(pkts[:250])]
    breakdown = compute_protocol_breakdown(dissected)

    return {
        "session": cap.model_dump(),
        "protocol_breakdown": breakdown,
        "packets": [d.model_dump() for d in dissected],
    }


def launch_in_wireshark_desktop(file_path: str) -> dict[str, Any]:
    """Launch desktop Wireshark.exe with the specified `.pcap` file if installed on Windows."""
    candidates = [
        shutil.which("wireshark"),
        r"C:\Program Files\Wireshark\Wireshark.exe",
        r"C:\Program Files (x86)\Wireshark\Wireshark.exe",
    ]
    exe = next((c for c in candidates if c and Path(c).exists()), None)
    if not exe:
        return {
            "launched": False,
            "wireshark_found": False,
            "file_path": file_path,
            "message": (
                "Wireshark Desktop executable was not found at C:\\Program Files\\Wireshark\\Wireshark.exe. "
                "You can download the standard .pcap file directly using the 'Download .pcap' button and open it in Wireshark on any machine."
            ),
        }
    try:
        subprocess.Popen([exe, "-r", file_path])  # noqa: S603
        return {
            "launched": True,
            "wireshark_found": True,
            "executable": exe,
            "file_path": file_path,
            "message": f"Launched Wireshark Desktop with {Path(file_path).name}.",
        }
    except Exception as exc:  # noqa: BLE001
        return {
            "launched": False,
            "wireshark_found": True,
            "file_path": file_path,
            "message": f"Failed to launch Wireshark process: {exc}",
        }

