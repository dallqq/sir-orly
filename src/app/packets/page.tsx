"use client";

import {
  PacketDissection,
  PcapCaptureSession,
  netpulseApi,
} from "@/lib/api";
import { useNetPulseStore } from "@/store/useNetPulseStore";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useCallback, useEffect, useState } from "react";

const BPF_PRESETS = [
  "all",
  "arp",
  "icmp",
  "tcp",
  "udp",
  "port 80 or port 443",
  "port 53",
];

function PacketsWorkspace() {
  const searchParams = useSearchParams();
  const { activeInterface, postStatusNotice } = useNetPulseStore();

  const [sessions, setSessions] = useState<PcapCaptureSession[]>([]);
  const [activeSession, setActiveSession] = useState<PcapCaptureSession | null>(
    null
  );
  const [packets, setPackets] = useState<PacketDissection[]>([]);
  const [protocolBreakdown, setProtocolBreakdown] = useState<
    Record<string, number>
  >({});
  const [selectedPacket, setSelectedPacket] = useState<PacketDissection | null>(
    null
  );

  const [bpfFilter, setBpfFilter] = useState<string>(
    () => searchParams.get("filter") || "all"
  );
  const [packetLimit, setPacketLimit] = useState<number>(30);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string>("");
  const [collapsedLayers, setCollapsedLayers] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    const qFilter = searchParams.get("filter");
    if (qFilter) {
      setTimeout(() => setBpfFilter(qFilter), 0);
    }
  }, [searchParams]);

  const loadSessionById = useCallback(async (id: number) => {
    try {
      const detail = await netpulseApi.getPacketSessionDetail(id);
      setActiveSession(detail.session);
      setPackets(detail.packets);
      setProtocolBreakdown(detail.protocol_breakdown);
      setSelectedPacket(detail.packets[0] || null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load capture session.";
      setStatusBanner(msg);
    }
  }, []);

  useEffect(() => {
    let active = true;
    netpulseApi
      .getPacketSessions()
      .then((res) => {
        if (!active || res.sessions.length === 0) return null;
        setSessions(res.sessions);
        return netpulseApi.getPacketSessionDetail(res.sessions[0].id);
      })
      .then((detail) => {
        if (!active || !detail) return;
        setActiveSession(detail.session);
        setPackets(detail.packets);
        setProtocolBreakdown(detail.protocol_breakdown);
        setSelectedPacket(detail.packets[0] || null);
      })
      .catch(() => {});
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
        `Captured ${res.packets.length} frames (${res.session.capture_source}) → saved as ${res.session.filename}`
      );
      postStatusNotice(
        "success",
        "Packet Capture Complete",
        `Dissected ${res.packets.length} OSI Layer 2–7 frames into ${res.session.filename}.`
      );
      const listRes = await netpulseApi.getPacketSessions();
      setSessions(listRes.sessions);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Packet capture failed.";
      setStatusBanner(msg);
      postStatusNotice("error", "Capture Failed", msg);
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
      setStatusBanner(
        `Upload warning: ${
          err instanceof Error ? err.message : "Backend offline"
        }`
      );
    }
  };

  const handleOpenWireshark = async () => {
    if (!activeSession) return;
    try {
      const res = await netpulseApi.openInWireshark(activeSession.id);
      setStatusBanner(res.message);
      postStatusNotice("info", "Wireshark Desktop", res.message);
    } catch {
      setStatusBanner(
        "Use 'Download .pcap' to inspect the capture file in Wireshark Desktop."
      );
    }
  };

  const toggleLayer = (layerKey: string) => {
    setCollapsedLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  const getProtocolBadgeClass = (proto: string) => {
    switch (proto.toUpperCase()) {
      case "ARP":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "ICMP":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "TCP":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "HTTP":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "DNS":
      case "UDP":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Capture & Wireshark Interoperability Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-typewriter font-medium mb-1.5">
              <span>COURSE TOPIC 7 &amp; BONUS FEATURE 6 · WIRESHARK ENGINE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-semibold text-slate-900 tracking-tight leading-tight">
              Wireshark 3-Pane Packet Sniffer &amp; OSI Layer 2–7 Dissector
            </h1>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Live Scapy packet capture, active socket synthesizer fallback, BPF filtering &amp; native `.pcap` file interoperability
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeSession && (
              <>
                <a
                  href={netpulseApi.getDownloadPcapUrl(activeSession.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-heading font-medium transition-colors duration-200"
                >
                  Download .pcap
                </a>
                <button
                  type="button"
                  onClick={handleOpenWireshark}
                  className="px-4 py-2 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-heading font-medium transition-colors duration-200 cursor-pointer"
                >
                  Open in Wireshark
                </button>
              </>
            )}

            <label className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-heading font-medium transition-colors duration-200 cursor-pointer">
              Upload .pcap
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
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 pt-4 border-t border-slate-100 items-center">
          <div className="xl:col-span-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-heading font-medium text-slate-500">BPF Filter:</span>
            <input
              type="text"
              value={bpfFilter}
              onChange={(e) => setBpfFilter(e.target.value)}
              className="bg-[#F8FAFC] border border-slate-200 rounded-full px-3.5 py-1.5 text-xs font-typewriter font-medium text-blue-600 w-44"
              placeholder="all, tcp, arp, port 80"
            />
            <div className="flex flex-wrap gap-1">
              {BPF_PRESETS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setBpfFilter(chip)}
                  className={`px-3 py-1 rounded-full text-[11px] font-typewriter font-medium transition-colors duration-200 cursor-pointer ${
                    bpfFilter === chip
                      ? "bg-[#141B2D] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div className="xl:col-span-3 flex items-center gap-2">
            <span className="text-xs font-heading font-medium text-slate-500">Limit:</span>
            <select
              aria-label="Packet Capture Limit"
              value={packetLimit}
              onChange={(e) => setPacketLimit(Number(e.target.value))}
              className="bg-[#F8FAFC] border border-slate-200 rounded-full px-3 py-1.5 text-xs font-typewriter font-medium text-slate-800"
            >
              <option value={15}>15 pkts</option>
              <option value={30}>30 pkts</option>
              <option value={60}>60 pkts</option>
            </select>

            <button
              type="button"
              disabled={isCapturing}
              onClick={handleCapture}
              className="px-5 py-2 rounded-full hyper-hero-gradient hover:brightness-105 disabled:opacity-50 text-white font-heading font-semibold text-xs transition-all duration-200 ease-out cursor-pointer"
            >
              {isCapturing ? "Sniffing..." : "Start Capture"}
            </button>
          </div>

          <div className="xl:col-span-3">
            <select
              aria-label="Saved Capture Sessions"
              disabled={sessions.length === 0}
              value={activeSession?.id || ""}
              onChange={(e) => {
                if (e.target.value) loadSessionById(Number(e.target.value));
              }}
              className="bg-[#F8FAFC] border border-slate-200 rounded-full px-3.5 py-2 text-xs font-heading font-medium text-slate-700 disabled:text-slate-400 w-full"
            >
              {sessions.length === 0 ? (
                <option value="">No saved capture sessions</option>
              ) : (
                sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.filename} ({s.packet_count} pkts · {s.capture_source})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Protocol Distribution Chips + Status Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-heading font-medium">
              Protocol Breakdown:
            </span>
            {Object.keys(protocolBreakdown).length === 0 ? (
              <span className="text-slate-400 font-typewriter">--</span>
            ) : (
              Object.entries(protocolBreakdown).map(([proto, count]) => (
                <span
                  key={proto}
                  className={`px-2.5 py-0.5 rounded-full border text-[11px] font-typewriter font-medium ${getProtocolBadgeClass(
                    proto
                  )}`}
                >
                  {proto}: {count}
                </span>
              ))
            )}
          </div>
          {statusBanner && (
            <span className="font-typewriter text-blue-600 font-medium">
              {statusBanner}
            </span>
          )}
        </div>
      </div>

      {/* Pane 1 (Top): Color-Coded Packet List Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50/90 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-900 font-heading font-semibold text-sm">
            PANE 1 — Captured Packet Summary Table ({packets.length} frames)
          </span>
          <span className="text-slate-400 font-normal">
            Click any packet row to inspect its OSI Layer 2–7 headers &amp; Hex/ASCII bytes below
          </span>
        </div>

        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs font-typewriter">
            <thead className="sticky top-0 bg-white border-b border-slate-200 text-slate-400 font-heading font-medium uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">No.</th>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Source IP / Port</th>
                <th className="py-2.5 px-3">Destination IP / Port</th>
                <th className="py-2.5 px-3">Protocol</th>
                <th className="py-2.5 px-3">Length</th>
                <th className="py-2.5 px-3">Info / Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {packets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                    No packets captured yet. Click &ldquo;Start Capture&rdquo; or upload a .pcap file to dissect frames.
                  </td>
                </tr>
              ) : (
                packets.map((pkt) => {
                  const isSelected = selectedPacket?.index === pkt.index;
                  return (
                    <tr
                      key={pkt.index}
                      onClick={() => setSelectedPacket(pkt)}
                      className={`cursor-pointer transition ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : "hover:bg-blue-50/60 text-slate-800"
                      }`}
                    >
                      <td
                        className={`py-2 px-3 font-medium ${
                          isSelected ? "text-blue-100" : "text-slate-400"
                        }`}
                      >
                        {pkt.index}
                      </td>
                      <td
                        className={`py-2 px-3 ${
                          isSelected ? "text-blue-100" : "text-slate-500"
                        }`}
                      >
                        {pkt.timestamp}
                      </td>
                      <td
                        className={`py-2 px-3 font-medium ${
                          isSelected ? "text-white" : "text-blue-600"
                        }`}
                      >
                        {pkt.src_ip}
                        {pkt.src_port ? `:${pkt.src_port}` : ""}
                      </td>
                      <td
                        className={`py-2 px-3 font-medium ${
                          isSelected ? "text-white" : "text-emerald-600"
                        }`}
                      >
                        {pkt.dst_ip}
                        {pkt.dst_port ? `:${pkt.dst_port}` : ""}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full border text-[10px] font-medium ${
                            isSelected
                              ? "bg-white/20 text-white border-white/30"
                              : getProtocolBadgeClass(pkt.protocol)
                          }`}
                        >
                          {pkt.protocol}
                        </span>
                      </td>
                      <td
                        className={`py-2 px-3 ${
                          isSelected ? "text-blue-100" : "text-slate-600"
                        }`}
                      >
                        {pkt.length} B
                      </td>
                      <td
                        className={`py-2 px-3 truncate max-w-md font-sans ${
                          isSelected ? "text-white font-medium" : "text-slate-600"
                        }`}
                      >
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pane 2: OSI Layer 2, 3, 4, 7 Dissection Tree */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50/90 border-b border-slate-200/80 text-xs flex items-center justify-between">
            <span className="text-slate-900 font-heading font-semibold text-sm">
              PANE 2 — OSI &amp; TCP/IP Protocol Dissection Tree{" "}
              {selectedPacket ? `(Packet #${selectedPacket.index})` : ""}
            </span>
            <span className="text-[11px] text-slate-400 font-typewriter">
              Click headers to expand/collapse
            </span>
          </div>
          {selectedPacket ? (
            <div className="p-5 space-y-3 text-xs font-typewriter max-h-80 overflow-y-auto">
              {(
                [
                  ["layer_2_datalink", "border-indigo-200 bg-indigo-50/30 text-indigo-900"],
                  ["layer_3_network", "border-blue-200 bg-blue-50/30 text-blue-900"],
                  ["layer_4_transport", "border-sky-200 bg-sky-50/30 text-sky-900"],
                  ["layer_7_application", "border-emerald-200 bg-emerald-50/30 text-emerald-900"],
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
                    className={`rounded-2xl border ${colorCls} overflow-hidden`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleLayer(layerKey)}
                      className="w-full px-4 py-2.5 flex items-center justify-between text-left font-heading font-medium cursor-pointer hover:bg-white/60 transition"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-blue-600">
                          {isCollapsed ? "▸" : "▾"}
                        </span>{" "}
                        {title}
                      </span>
                      <span className="text-[10px] text-slate-500 font-typewriter">
                        {fieldEntries.length} fields
                      </span>
                    </button>
                    {!isCollapsed && (
                      <div className="px-4 pb-3 pt-1.5 border-t border-slate-200/60 bg-white/80 space-y-1 text-[11px] font-typewriter">
                        {fieldEntries.map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-4">
                            <span className="text-slate-500">{k}:</span>
                            <span className="text-slate-900 font-medium text-right truncate">
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
            <div className="p-8 text-center text-xs text-slate-400">
              Select a packet row above to inspect its OSI Layer 2–7 headers.
            </div>
          )}
        </div>

        {/* Pane 3: Hexadecimal & ASCII Byte Viewer */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 bg-slate-50/90 border-b border-slate-200/80 flex justify-between text-xs">
            <span className="text-slate-900 font-heading font-semibold text-sm">
              PANE 3 — Raw Hexadecimal &amp; ASCII Frame Bytes
            </span>
            {selectedPacket && (
              <span className="font-typewriter font-medium text-blue-600 text-xs">
                {selectedPacket.length} Bytes
              </span>
            )}
          </div>
          <div className="p-5 flex-1 bg-[#141B2D] text-sky-300">
            <pre className="text-[11px] leading-relaxed font-typewriter overflow-x-auto max-h-72 overflow-y-auto">
              {selectedPacket?.hex_dump || "0000  No packet selected"}
            </pre>
          </div>
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
