"use client";

import { HostLatencyBarChart } from "@/components/dashboard/TelemetryCharts";
import { PingSequenceReply, PortScanResult, netpulseApi } from "@/lib/api";
import { useNetPulseStore } from "@/store/useNetPulseStore";
import { useSearchParams } from "next/navigation";
import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";

function ConnectivityWorkspace() {
  const searchParams = useSearchParams();
  const {
    devices,
    qosStats,
    pingStream,
    refreshAllNetworkData,
    clearPingStream,
  } = useNetPulseStore();

  const [activeTab, setActiveTab] = useState<"ping" | "ports">(() =>
    searchParams.get("tab") === "ports" ? "ports" : "ping"
  );
  const [targetIp, setTargetIp] = useState<string>(
    () => searchParams.get("target") || "127.0.0.1"
  );
  const [pingCount, setPingCount] = useState<number>(4);
  const [packetSize, setPacketSize] = useState<number>(32);
  const [protocol, setProtocol] = useState<string>("auto");
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [localReplies, setLocalReplies] = useState<PingSequenceReply[]>([]);

  // Bonus Feature 5: Async Socket Port Scanner state
  const [portTargetIp, setPortTargetIp] = useState<string>(
    () => searchParams.get("target") || "127.0.0.1"
  );
  const [portPreset, setPortPreset] = useState<string>("quick");
  const [customPorts, setCustomPorts] = useState<string>("21,22,23,80,135,443,445,3306,3389,8000");
  const [isScanningPorts, setIsScanningPorts] = useState<boolean>(false);
  const [portResults, setPortResults] = useState<PortScanResult[]>([]);

  const autoTriggeredRef = useRef<string>("");

  const handleRunPing = useCallback(
    async (overrideTarget?: string) => {
      const ipToTest = (overrideTarget || targetIp).trim() || "127.0.0.1";
      setIsPinging(true);
      clearPingStream();
      try {
        const res = await netpulseApi.runPing({
          targets: ipToTest,
          count: pingCount,
          packet_size: packetSize,
          protocol,
        });
        const allSamples = res.results.flatMap((r) => r.samples || []);
        setLocalReplies(allSamples);
        await refreshAllNetworkData();
      } finally {
        setIsPinging(false);
      }
    },
    [targetIp, pingCount, packetSize, protocol, clearPingStream, refreshAllNetworkData]
  );

  const handleRunPortScan = useCallback(
    async (overrideTarget?: string) => {
      const ipToScan = (overrideTarget || portTargetIp).trim() || "127.0.0.1";
      setIsScanningPorts(true);
      try {
        const res = await netpulseApi.scanPorts({
          target_ip: ipToScan,
          preset: portPreset,
          ports: portPreset === "custom" ? customPorts : undefined,
        });
        setPortResults(res.results);
        await refreshAllNetworkData();
      } finally {
        setIsScanningPorts(false);
      }
    },
    [portTargetIp, portPreset, customPorts, refreshAllNetworkData]
  );

  // Load initial persisted open ports
  useEffect(() => {
    netpulseApi
      .getHostPorts("all")
      .then((r) => setPortResults(r.results))
      .catch(() => {});
  }, []);

  // Handle cross-page contextual URL parameters (?target=IP&tab=ports&autostart=ping|scan)
  useEffect(() => {
    const qTarget = searchParams.get("target");
    const qTab = searchParams.get("tab");
    const qAuto = searchParams.get("autostart");
    const key = `${qTarget}-${qTab}-${qAuto}`;

    if (qTarget && qAuto && autoTriggeredRef.current !== key) {
      autoTriggeredRef.current = key;
      const timer = setTimeout(() => {
        if (qAuto === "ping") {
          handleRunPing(qTarget);
        } else if (qAuto === "scan") {
          handleRunPortScan(qTarget);
        }
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [searchParams, handleRunPing, handleRunPortScan]);

  const terminalFeed = pingStream.length > 0 ? pingStream : localReplies;

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
            FEATURES 2 &amp; 3 + BONUS FEATURE 5 — CONNECTIVITY, QOS STATS &amp; SOCKET PORT SCANNER
          </div>
          <h1 className="text-xl font-bold text-white mt-0.5">
            Multi-Protocol Ping Tester, Network Statistics &amp; Async Port Scanner
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("ping")}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold cursor-pointer ${
              activeTab === "ping"
                ? "bg-cyan-500 text-slate-950"
                : "bg-slate-900 text-slate-300 border border-slate-800"
            }`}
          >
            ⚡ Feature 2 &amp; 3: Ping &amp; QoS Statistics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ports")}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold cursor-pointer ${
              activeTab === "ports"
                ? "bg-cyan-500 text-slate-950"
                : "bg-slate-900 text-slate-300 border border-slate-800"
            }`}
          >
            🔓 Bonus: Socket Port Scanner ({portResults.length})
          </button>
        </div>
      </div>

      {activeTab === "ping" ? (
        <>
          {/* Feature 2: Ping Controls + Live Sequence Console */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-white">
                  Feature 2: Connectivity Testing Controls
                </h2>
                <p className="text-xs text-slate-400">
                  3-tier fallback engine: icmplib → Native OS Ping → TCP Handshake Ping
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">
                    Target IP(s) (comma-separated or choose host):
                  </label>
                  <input
                    type="text"
                    value={targetIp}
                    onChange={(e) => setTargetIp(e.target.value)}
                    placeholder="192.168.1.1, 127.0.0.1"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono text-cyan-300"
                  />
                </div>

                {devices.length > 0 && (
                  <div>
                    <label className="block text-slate-400 font-mono mb-1">
                      Quick-Select Discovered Subnet Device:
                    </label>
                    <select
                      aria-label="Quick-Select Discovered Subnet Device"
                      onChange={(e) => {
                        if (e.target.value) setTargetIp(e.target.value);
                      }}
                      value=""
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 font-mono text-slate-200"
                    >
                      <option value="">-- Choose from {devices.length} discovered hosts --</option>
                      {devices.map((d) => (
                        <option key={d.ip_address} value={d.ip_address}>
                          {d.ip_address} — {d.hostname} ({d.vendor})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-400 font-mono mb-1">Packets:</label>
                    <select
                      aria-label="Packet Count"
                      value={pingCount}
                      onChange={(e) => setPingCount(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 font-mono text-white"
                    >
                      <option value={4}>4 pkts</option>
                      <option value={8}>8 pkts</option>
                      <option value={15}>15 pkts</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-mono mb-1">Payload:</label>
                    <select
                      aria-label="Payload Bytes"
                      value={packetSize}
                      onChange={(e) => setPacketSize(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 font-mono text-white"
                    >
                      <option value={32}>32 Bytes</option>
                      <option value={64}>64 Bytes</option>
                      <option value={512}>512 Bytes</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-mono mb-1">Protocol:</label>
                    <select
                      aria-label="Ping Protocol"
                      value={protocol}
                      onChange={(e) => setProtocol(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 font-mono text-cyan-300"
                    >
                      <option value="auto">Auto Hybrid</option>
                      <option value="icmp">ICMP Echo</option>
                      <option value="tcp">TCP-Ping</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isPinging}
                  onClick={() => handleRunPing()}
                  className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold font-mono transition cursor-pointer"
                >
                  {isPinging ? "⚡ Pinging Target(s)..." : "⚡ Execute Ping Connectivity Test"}
                </button>
              </div>
            </div>

            {/* Live Ping Terminal Output */}
            <div className="lg:col-span-2 bg-[#070A12] border border-slate-800 rounded-xl p-4 flex flex-col justify-between font-mono">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 text-xs">
                <span className="text-cyan-400 font-bold">
                  LIVE ICMP / TCP ECHO SEQUENCE STREAM ({terminalFeed.length} replies)
                </span>
                <span className="text-slate-400">Target: {targetIp}</span>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto text-xs">
                {terminalFeed.length === 0 ? (
                  <div className="text-slate-500 py-10 text-center">
                    Click &ldquo;Execute Ping Connectivity Test&rdquo; to stream live sequence RTTs and packet loss percentages.
                  </div>
                ) : (
                  terminalFeed.map((item, idx) => (
                    <div
                      key={`${item.ip_address}-${item.seq}-${idx}`}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-900/90 border border-slate-800/80"
                    >
                      <div>
                        <span
                          className={
                            item.status === "SUCCESS"
                              ? "text-emerald-400 font-bold"
                              : "text-rose-400 font-bold"
                          }
                        >
                          [{item.status}]
                        </span>{" "}
                        <span className="text-slate-200">
                          Reply from {item.ip_address} ({item.hostname}):
                        </span>{" "}
                        <span className="text-slate-400">
                          seq={item.seq}/{item.count} bytes={item.bytes} protocol={item.protocol}
                        </span>
                      </div>
                      <div className="text-cyan-300 font-bold">
                        {item.rtt_ms != null
                          ? `time=${item.rtt_ms} ms TTL=${item.ttl ?? 64}`
                          : "Request timed out (100% loss)"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Feature 3 Mandatory Network Statistics Table + Visual Bar Chart */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 bg-[#0F172A] border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">
                    Feature 3: Network Statistics Table (Per-Host QoS Telemetry)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Displays Hostname, IP Address, Minimum Latency, Average Latency, Maximum Latency, Jitter, and Packet Loss %
                  </p>
                </div>
                <span className="text-xs font-mono text-cyan-400">
                  {qosStats.length} Hosts Measured
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                      <th className="py-2.5 px-2">Hostname</th>
                      <th className="py-2.5 px-2">IP Address</th>
                      <th className="py-2.5 px-2">Min Latency</th>
                      <th className="py-2.5 px-2">Average Latency</th>
                      <th className="py-2.5 px-2">Maximum Latency</th>
                      <th className="py-2.5 px-2">Jitter (ms)</th>
                      <th className="py-2.5 px-2">Packet Loss (%)</th>
                      <th className="py-2.5 px-2">Sent/Recv</th>
                      <th className="py-2.5 px-2">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {qosStats.map((s) => (
                      <tr key={s.ip_address} className="hover:bg-slate-900/60">
                        <td className="py-2.5 px-2 text-slate-100 font-sans font-medium">
                          {s.hostname}
                        </td>
                        <td className="py-2.5 px-2 text-cyan-300 font-bold">
                          {s.ip_address}
                        </td>
                        <td className="py-2.5 px-2 text-slate-300">
                          {s.min_latency_ms} ms
                        </td>
                        <td className="py-2.5 px-2 text-emerald-400 font-bold">
                          {s.avg_latency_ms} ms
                        </td>
                        <td className="py-2.5 px-2 text-amber-300 font-bold">
                          {s.max_latency_ms} ms
                        </td>
                        <td className="py-2.5 px-2 text-purple-300">
                          {s.jitter_ms} ms
                        </td>
                        <td className="py-2.5 px-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              s.packet_loss_pct >= 50
                                ? "bg-rose-500/20 text-rose-300"
                                : s.packet_loss_pct > 0
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-emerald-500/15 text-emerald-400"
                            }`}
                          >
                            {s.packet_loss_pct}%
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-slate-400">
                          {s.packets_received}/{s.packets_sent}
                        </td>
                        <td className="py-2.5 px-2 text-slate-400 text-[10px]">
                          {s.ping_method}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-bold text-white">
                Avg vs. Max Latency Comparison
              </h2>
              <HostLatencyBarChart stats={qosStats} />
            </div>
          </div>
        </>
      ) : (
        /* Bonus Feature 5: Async Socket Port Scanner Workspace */
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Target Host IP:
                </label>
                <input
                  type="text"
                  value={portTargetIp}
                  onChange={(e) => setPortTargetIp(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 mb-1">
                  Port Scan Preset:
                </label>
                <select
                  aria-label="Port Scan Preset"
                  value={portPreset}
                  onChange={(e) => setPortPreset(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white"
                >
                  <option value="quick">Quick Top 25 Enterprise Ports</option>
                  <option value="standard">Standard Well-Known Ports (20–1024)</option>
                  <option value="custom">Custom Port List / Range</option>
                </select>
              </div>

              {portPreset === "custom" ? (
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Custom Ports (e.g. 21-25,80,443,8000):
                  </label>
                  <input
                    type="text"
                    value={customPorts}
                    onChange={(e) => setCustomPorts(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1">
                    Or Select Discovered Host:
                  </label>
                  <select
                    aria-label="Select Discovered Host for Port Scan"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) setPortTargetIp(e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-300"
                  >
                    <option value="">-- Pick discovered IP --</option>
                    {devices.map((d) => (
                      <option key={d.ip_address} value={d.ip_address}>
                        {d.ip_address} ({d.hostname})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={isScanningPorts}
              onClick={() => handleRunPortScan()}
              className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs font-mono cursor-pointer"
            >
              {isScanningPorts ? "🔓 Scanning TCP Sockets..." : "🔓 Launch Socket Port Scan"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="py-2.5 px-2">Host IP</th>
                  <th className="py-2.5 px-2">Port / Proto</th>
                  <th className="py-2.5 px-2">State</th>
                  <th className="py-2.5 px-2">Service Name</th>
                  <th className="py-2.5 px-2">Grabbed Service Banner</th>
                  <th className="py-2.5 px-2">OSI Model Layer Mapping</th>
                  <th className="py-2.5 px-2">Exposure Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {portResults.map((p, idx) => (
                  <tr key={`${p.ip_address}-${p.port}-${idx}`} className="hover:bg-slate-900/60">
                    <td className="py-2.5 px-2 text-cyan-300 font-bold">{p.ip_address}</td>
                    <td className="py-2.5 px-2 text-white font-bold">
                      {p.port} / {p.protocol}
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-bold">
                        {p.state}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-amber-300 font-semibold">
                      {p.service_name}
                    </td>
                    <td className="py-2.5 px-2 text-slate-300 max-w-xs truncate">
                      {p.banner}
                    </td>
                    <td className="py-2.5 px-2 text-purple-300 text-[11px]">
                      {p.osi_layer}
                    </td>
                    <td className="py-2.5 px-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.risk_level === "CRITICAL"
                            ? "bg-rose-500/20 text-rose-300"
                            : p.risk_level === "HIGH"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-cyan-500/15 text-cyan-300"
                        }`}
                      >
                        {p.risk_level}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConnectivityPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center font-mono text-xs text-slate-400">
          Loading Connectivity &amp; QoS Engine...
        </div>
      }
    >
      <ConnectivityWorkspace />
    </Suspense>
  );
}
