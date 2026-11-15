"use client";

import {
  PacketDissection,
  PcapCaptureSession,
  netpulseApi,
} from "@/lib/api";
import { useNetPulseStore } from "@/store/useNetPulseStore";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useCallback, useEffect, useState } from "react";

const BPF_PRESETS = ["all", "arp", "icmp", "tcp", "udp", "port 80 or port 443", "port 53"];

function PacketsWorkspace() {
  const searchParams = useSearchParams();
  const { activeInterface } = useNetPulseStore();

  const [sessions, setSessions] = useState<PcapCaptureSession[]>([]);
  const [activeSession, setActiveSession] = useState<PcapCaptureSession | null>(null);
  const [packets, setPackets] = useState<PacketDissection[]>([]);
  const [protocolBreakdown, setProtocolBreakdown] = useState<Record<string, number>>({});
  const [selectedPacket, setSelectedPacket] = useState<PacketDissection | null>(null);

  const [bpfFilter, setBpfFilter] = useState<string>(
    () => searchParams.get("filter") || "all"
  );
  const [packetLimit, setPacketLimit] = useState<number>(30);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string>("");
  const [collapsedLayers, setCollapsedLayers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const qFilter = searchParams.get("filter");
    if (qFilter) {
      setBpfFilter(qFilter);
    }
  }, [searchParams]);

  const loadSessionById = useCallback(async (id: number) => {
    try {
      const detail = await netpulseApi.getPacketSessionDetail(id);
      setActiveSession(detail.session);
      setPackets(detail.packets);
      setProtocolBreakdown(detail.protocol_breakdown);
      setSelectedPacket(detail.packets[0] || null);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let active = true;
    netpulseApi
      .getPacketSessions()
      .then((res) => {
        if (!active) return;
        setSessions(res.sessions);
        if (res.sessions.length > 0) {
          return netpulseApi.getPacketSessionDetail(res.sessions[0].id);
        }
        return null;
      })
      .then((detail) => {
        if (!active || !detail) return;
        setActiveSession(detail.session);
        setPackets(detail.packets);
        setProtocolBreakdown(detail.protocol_breakdown);
        setSelectedPacket(detail.packets[0] || null);
      })
      .catch(() => { });
    return () => {
      active = false;
    };
  }, []);

  const handleCapture = async () => {
    setIsCapturing(true);
    setStatusBanner("Capturing live frames and dissecting OSI Layers 2–7...");
    try {
      const res = await netpulseApi.capturePackets({
        interface_name: activeInterface.interface_name,
        bpf_filter: bpfFilter,
        count: packetLimit,
        timeout: 2.5,
      });
      setActiveSession(res.session);
      setPackets(res.packets);
      setProtocolBreakdown(res.protocol_breakdown);
      setSelectedPacket(res.packets[0] || null);
      setStatusBanner(
        `Captured ${res.packets.length} frames (${res.session.capture_source}) -> saved as ${res.session.filename}`
      );
      const listRes = await netpulseApi.getPacketSessions();
      setSessions(listRes.sessions);
    } catch (err) {
      setStatusBanner(`Capture warning: ${err instanceof Error ? err.message : "Failed"}`);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleUploadPcap = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusBanner(`Uploading and dissecting ${file.name}...`);
    try {
      const res = await netpulseApi.uploadPcap(file);
      setActiveSession(res.session);
      setPackets(res.packets);
      setProtocolBreakdown(res.protocol_breakdown);
      setSelectedPacket(res.packets[0] || null);
      setStatusBanner(`Loaded ${res.packets.length} packets from ${file.name}`);
      const listRes = await netpulseApi.getPacketSessions();
      setSessions(listRes.sessions);
    } catch (err) {
      setStatusBanner(`Upload error: ${err instanceof Error ? err.message : "Invalid PCAP"}`);
    }
  };

  const handleOpenWireshark = async () => {
    if (!activeSession) return;
    try {
      const res = await netpulseApi.openInWireshark(activeSession.id);
      setStatusBanner(res.message);
    } catch {
      setStatusBanner("Use 'Download .pcap' to open the capture file in Wireshark.");
    }
  };

  const handleLoadDemoPcap = () => {
    const demo =
      sessions.find((s) => s.filename.toLowerCase().includes("demo")) ||
      sessions[0];
    if (demo) {
      loadSessionById(demo.id);
      setStatusBanner(`Loaded demo capture session: ${demo.filename}`);
    } else {
      setStatusBanner("Demo PCAP not found in session list.");
    }
  };

  const toggleLayer = (layerKey: string) => {
    setCollapsedLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  const getProtocolBadgeClass = (proto: string) => {
    switch (proto.toUpperCase()) {
      case "ARP":
        return "bg-purple-500/20 text-purple-300 border-purple-500/40";
      case "ICMP":
        return "bg-blue-500/20 text-blue-300 border-blue-500/40";
      case "TCP":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
      case "HTTP":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
      case "DNS":
      case "UDP":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  return (
    <div className="space-y-5">
      {/* Capture & Wireshark Interoperability Header */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
              COURSE TOPIC 7 &amp; BONUS FEATURE 6 — WIRESHARK TRAFFIC ANALYSIS &amp; .PCAP ENGINE
            </div>
            <h1 className="text-xl font-bold text-white mt-0.5">
              Wireshark 3-Pane Packet Sniffer, OSI Layer 2–7 Dissector &amp; .pcap Interoperability
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeSession && (
              <>
                <a
                  href={netpulseApi.getDownloadPcapUrl(activeSession.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold"
                >
                  ⬇️ Download .pcap for Wireshark
                </a>
                <button
                  type="button"
                  onClick={handleOpenWireshark}
                  className="px-3.5 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 font-mono text-xs font-bold cursor-pointer"
                >
                  🦈 Launch in Wireshark Desktop
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleLoadDemoPcap}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-semibold cursor-pointer"
            >
              🏫 Load Demo PCAP
            </button>

            <label className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-mono text-xs cursor-pointer">
              📂 Upload .pcap
              <input
                type="file"
                accept=".pcap,.pcapng,.cap"
                onChange={handleUploadPcap}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Capture Controls & BPF Filter Chips */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
          <div className="lg:col-span-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-slate-400">BPF Filter:</span>
            <input
              type="text"
              value={bpfFilter}
              onChange={(e) => setBpfFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-cyan-300 w-48"
              placeholder="all, tcp, arp, port 80"
            />
            <div className="flex flex-wrap gap-1">
              {BPF_PRESETS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setBpfFilter(chip)}
                  className={`px-2 py-1 rounded text-[11px] font-mono cursor-pointer ${bpfFilter === chip
                      ? "bg-cyan-500 text-slate-950 font-bold"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                    }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Limit:</span>
            <select
              aria-label="Packet Capture Limit"
              value={packetLimit}
              onChange={(e) => setPacketLimit(Number(e.target.value))}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
            >
              <option value={15}>15 pkts</option>
              <option value={30}>30 pkts</option>
              <option value={60}>60 pkts</option>
            </select>

            <button
              type="button"
              disabled={isCapturing}
              onClick={handleCapture}
              className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs font-mono cursor-pointer"
            >
              {isCapturing ? "Sniffing..." : "🦈 Start Capture"}
            </button>
          </div>

          <div className="flex items-center justify-end gap-2">
            <select
              aria-label="Saved Capture Sessions"
              value={activeSession?.id || ""}
              onChange={(e) => {
                if (e.target.value) loadSessionById(Number(e.target.value));
              }}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 w-full"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.filename} ({s.packet_count} pkts · {s.capture_source})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Protocol Distribution Chips + Status Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400">Protocol Breakdown:</span>
            {Object.entries(protocolBreakdown).map(([proto, count]) => (
              <span
                key={proto}
                className={`px-2 py-0.5 rounded border text-[11px] font-bold ${getProtocolBadgeClass(
                  proto
                )}`}
              >
                {proto}: {count}
              </span>
            ))}
          </div>
          {statusBanner && <span className="text-cyan-300">{statusBanner}</span>}
        </div>
      </div>

      {/* Wireshark 3-Pane Inspector */}
      {/* Pane 1 (Top): Color-Coded Packet List Table */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
          <span className="text-cyan-400 font-bold">
            PANE 1 — CAPTURED PACKET SUMMARY TABLE ({packets.length} frames)
          </span>
          <span className="text-slate-400">
            Click any packet row to inspect its OSI Layer 2–7 headers &amp; Hex/ASCII bytes below
          </span>
        </div>

        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-slate-400 text-[11px]">
              <tr>
                <th className="py-2 px-3">No.</th>
                <th className="py-2 px-3">Time</th>
                <th className="py-2 px-3">Source IP / MAC</th>
                <th className="py-2 px-3">Destination IP / MAC</th>
                <th className="py-2 px-3">Protocol</th>
                <th className="py-2 px-3">Length</th>
                <th className="py-2 px-3">Info / Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {packets.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-slate-400 font-mono text-xs"
                  >
                    No frames captured yet in this session. Click &ldquo;🦈 Start Capture&rdquo;, &ldquo;📂 Upload .pcap&rdquo;, or &ldquo;🏫 Load Demo PCAP&rdquo;.
                  </td>
                </tr>
              ) : (
                packets.map((pkt) => {
                  const isSelected = selectedPacket?.index === pkt.index;
                  return (
                    <tr
                      key={pkt.index}
                      onClick={() => setSelectedPacket(pkt)}
                      className={`cursor-pointer transition ${isSelected
                          ? "bg-cyan-500/20 text-white"
                          : "hover:bg-slate-900/80 text-slate-200"
                        }`}
                    >
                      <td className="py-1.5 px-3 text-slate-400">{pkt.index}</td>
                      <td className="py-1.5 px-3 text-slate-300">{pkt.timestamp}</td>
                      <td className="py-2 px-3 text-cyan-300">
                        {pkt.src_ip}
                        {pkt.src_port ? `:${pkt.src_port}` : ""}
                      </td>
                      <td className="py-2 px-3 text-emerald-300">
                        {pkt.dst_ip}
                        {pkt.dst_port ? `:${pkt.dst_port}` : ""}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${getProtocolBadgeClass(
                            pkt.protocol
                          )}`}
                        >
                          {pkt.protocol}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-300">{pkt.length} B</td>
                      <td className="py-2 px-3 text-slate-300 truncate max-w-md">
                        {pkt.info}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Split: Pane 2 (OSI Layer 2-7 Dissection Tree) & Pane 3 (Hex/ASCII Byte Dump) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pane 2: OSI Layer 2, 3, 4, 7 Dissection Tree (Collapsible Accordion) */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs font-mono text-cyan-400 font-bold flex items-center justify-between">
            <span>
              PANE 2 — OSI &amp; TCP/IP PROTOCOL LAYER DISSECTION TREE{" "}
              {selectedPacket ? `(Packet #${selectedPacket.index})` : ""}
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              Click headers to collapse/expand
            </span>
          </div>
          {selectedPacket ? (
            <div className="p-4 space-y-2.5 text-xs font-mono max-h-80 overflow-y-auto">
              {(
                [
                  ["layer_2_datalink", "text-purple-300 border-purple-500/30"],
                  ["layer_3_network", "text-blue-300 border-blue-500/30"],
                  ["layer_4_transport", "text-cyan-300 border-cyan-500/30"],
                  ["layer_7_application", "text-emerald-300 border-emerald-500/30"],
                ] as const
              ).map(([layerKey, colorCls]) => {
                const layerObj = selectedPacket.osi_layers[layerKey] || {};
                const title = String(layerObj.layer || layerKey);
                const isCollapsed = !!collapsedLayers[layerKey];
                const fieldEntries = Object.entries(layerObj).filter(
                  ([k]) => k !== "layer"
                );

                return (
                  <div
                    key={layerKey}
                    className={`rounded-lg bg-slate-950/90 border ${colorCls} overflow-hidden`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleLayer(layerKey)}
                      className="w-full px-3 py-2 flex items-center justify-between text-left font-bold cursor-pointer hover:bg-slate-900/60"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="text-cyan-400">
                          {isCollapsed ? "▸" : "▾"}
                        </span>{" "}
                        {title}
                      </span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        {fieldEntries.length} fields
                      </span>
                    </button>
                    {!isCollapsed && (
                      <div className="px-3 pb-2.5 pt-1 border-t border-slate-800/60 space-y-1 text-[11px] text-slate-300">
                        {fieldEntries.map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-4">
                            <span className="text-slate-400">{k}:</span>
                            <span className="text-slate-100 text-right truncate">
                              {String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-xs font-mono text-slate-500">
              Select a packet row above to inspect its OSI Layer 2–7 headers.
            </div>
          )}
        </div>

        {/* Pane 3: Hexadecimal & ASCII Byte Viewer */}
        <div className="bg-[#070A12] border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex justify-between text-xs font-mono">
            <span className="text-cyan-400 font-bold">
              PANE 3 — RAW HEXADECIMAL &amp; ASCII FRAME BYTES
            </span>
            {selectedPacket && (
              <span className="text-slate-400">{selectedPacket.length} Bytes</span>
            )}
          </div>
          <pre className="p-4 text-[11px] leading-relaxed font-mono text-emerald-300/90 overflow-x-auto max-h-80 overflow-y-auto">
            {selectedPacket?.hex_dump || "0000  No packet selected"}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function PacketsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center font-mono text-xs text-slate-400">
          Loading Wireshark Packet Dissector...
        </div>
      }
    >
      <PacketsWorkspace />
    </Suspense>
  );
}
