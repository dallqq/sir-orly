"use client";

import { HostLatencyBarChart } from "@/components/dashboard/TelemetryCharts";
import {
  PingTargetRow,
  SegmentedPillControl,
  SignalStrengthBars,
} from "@/components/ui/HyperComponents";
import { PingSequenceReply, PortScanResult, netpulseApi } from "@/lib/api";
import { useNetPulseStore } from "@/store/useNetPulseStore";
import { useSearchParams } from "next/navigation";
import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

function ConnectivityWorkspace() {
  const searchParams = useSearchParams();
  const {
    devices,
    qosStats,
    pingStream,
    refreshAllNetworkData,
    clearPingStream,
    postStatusNotice,
  } = useNetPulseStore();

  const [activeTab, setActiveTab] = useState<"ping" | "ports">(() =>
    searchParams.get("tab") === "ports" ? "ports" : "ping"
  );
  const [targetIp, setTargetIp] = useState<string>(
    () => searchParams.get("target") || ""
  );
  const [pingFilter, setPingFilter] = useState<string>("");
  const [pingCount, setPingCount] = useState<number>(4);
  const [packetSize, setPacketSize] = useState<number>(32);
  const [protocol, setProtocol] = useState<string>("auto");
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [localReplies, setLocalReplies] = useState<PingSequenceReply[]>([]);

  // Bonus Feature 5: Async Socket Port Scanner state
  const [portTargetIp, setPortTargetIp] = useState<string>(
    () => searchParams.get("target") || ""
  );
  const [portPreset, setPortPreset] = useState<string>("quick");
  const [customPorts, setCustomPorts] = useState<string>(
    "21,22,23,80,135,443,445,3306,3389,8000"
  );
  const [isScanningPorts, setIsScanningPorts] = useState<boolean>(false);
  const [portResults, setPortResults] = useState<PortScanResult[]>([]);

  const autoTriggeredRef = useRef<string>("");

  const handleRunPing = useCallback(
    async (overrideTarget?: string) => {
      const ipToTest = (overrideTarget || targetIp).trim();
      if (!ipToTest) {
        postStatusNotice("info", "No Target Specified", "Please enter or select a target IP address.");
        return;
      }
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
        postStatusNotice(
          "success",
          "Ping Sequence Completed",
          `Received ${allSamples.filter((s) => s.status === "SUCCESS").length}/${allSamples.length} replies from ${ipToTest}.`
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to execute ping sequence.";
        setLocalReplies([]);
        postStatusNotice("error", "Ping Execution Failed", msg);
      } finally {
        setIsPinging(false);
      }
    },
    [
      targetIp,
      pingCount,
      packetSize,
      protocol,
      clearPingStream,
      refreshAllNetworkData,
      postStatusNotice,
    ]
  );

  const handleRunPortScan = useCallback(
    async (overrideTarget?: string) => {
      const ipToScan = (overrideTarget || portTargetIp).trim();
      if (!ipToScan) {
        postStatusNotice("info", "No Target Specified", "Please enter or select a target IP address for port scanning.");
        return;
      }
      setIsScanningPorts(true);
      try {
        const res = await netpulseApi.scanPorts({
          target_ip: ipToScan,
          preset: portPreset,
          ports: portPreset === "custom" ? customPorts : undefined,
        });
        setPortResults(res.results);
        await refreshAllNetworkData();
        postStatusNotice(
          "success",
          "Socket Port Scan Completed",
          `Found ${res.results.length} open TCP ports on ${ipToScan}.`
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to complete port scan.";
        postStatusNotice("error", "Port Scan Failed", msg);
      } finally {
        setIsScanningPorts(false);
      }
    },
    [portTargetIp, portPreset, customPorts, refreshAllNetworkData, postStatusNotice]
  );

  // Load initial persisted open ports
  useEffect(() => {
    netpulseApi
      .getHostPorts("all")
      .then((r) => {
        if (r.results.length > 0) setPortResults(r.results);
      })
      .catch(() => {});
  }, []);

  // Handle cross-page contextual URL parameters (?target=IP&tab=ports&autostart=ping|scan)
  useEffect(() => {
    const qTarget = searchParams.get("target");
    const qTab = searchParams.get("tab");
    const qAuto = searchParams.get("autostart");

    if (qTarget) {
      setTimeout(() => {
        setTargetIp((prev) => (prev !== qTarget ? qTarget : prev));
        setPortTargetIp((prev) => (prev !== qTarget ? qTarget : prev));
      }, 0);
    }
    if (qTab === "ports") {
      setTimeout(() => setActiveTab("ports"), 0);
    } else if (qTab === "ping") {
      setTimeout(() => setActiveTab("ping"), 0);
    }

    const key = `${qTarget}-${qTab}-${qAuto}`;
    if (qTarget && qAuto && autoTriggeredRef.current !== key) {
      autoTriggeredRef.current = key;
      const timer = setTimeout(() => {
        if (qAuto === "ping") {
          handleRunPing(qTarget);
        } else if (qAuto === "scan") {
          handleRunPortScan(qTarget);
        }
      }, 15);
      return () => clearTimeout(timer);
    }
  }, [searchParams, handleRunPing, handleRunPortScan]);

  const terminalFeed = pingStream.length > 0 ? pingStream : localReplies;

  const filteredPingTargets = useMemo(() => {
    const q = pingFilter.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter(
      (d) =>
        d.ip_address.toLowerCase().includes(q) ||
        d.hostname.toLowerCase().includes(q) ||
        d.vendor.toLowerCase().includes(q)
    );
  }, [devices, pingFilter]);

  return (
    <div className="space-y-6">
      {/* Page Header & Segmented Mode Switcher */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-typewriter font-medium mb-1.5">
            <span>FEATURES 2 &amp; 3 + BONUS PORT SCANNER</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-semibold text-slate-900 tracking-tight leading-tight">
            Ping Signal Analyzer, QoS Telemetry &amp; Socket Port Scanner
          </h1>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            3-Tier ICMP / OS Ping / TCP Handshake RTT engine, Jitter &amp; Loss calculator, and Async Banner Grabber
          </p>
        </div>

        <SegmentedPillControl
          size="sm"
          options={[
            { id: "ping", label: "Ping & QoS Stats", count: qosStats.length },
            { id: "ports", label: "Socket Port Scanner", count: portResults.length },
          ]}
          value={activeTab}
          onChange={(v) => setActiveTab(v)}
        />
      </div>

      {activeTab === "ping" ? (
        <div className="space-y-6">
          {/* Top Split: Left = Screenshot 1 Right "Ping" Screen List + Controls | Right = Live Echo Sequence & Bar Comparison */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left 5 Cols: Ping Target List (Screenshot 1 Right) + Ping Execution Form */}
            <div className="xl:col-span-5 space-y-5">
              {/* Ping Target Search & Signal Strength List Card (Exact Match to Screenshot 1 Right "Ping") */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-heading font-semibold text-slate-900 tracking-tight">
                      Ping Targets
                    </h2>
                    <p className="text-xs text-slate-500 font-normal mt-0.5">
                      Click any host to select or trigger an instant ping test
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isPinging}
                    onClick={() => handleRunPing()}
                    className="w-9 h-9 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 flex items-center justify-center transition-colors duration-200 cursor-pointer"
                    title="Re-run Ping"
                  >
                    ↻
                  </button>
                </div>

                {/* Pill Search Input */}
                <div className="relative">
                  <input
                    type="search"
                    value={pingFilter}
                    onChange={(e) => setPingFilter(e.target.value)}
                    placeholder="Search IP or hostname..."
                    className="w-full bg-[#F8FAFC] border border-slate-200 focus:border-blue-500 focus:bg-white rounded-full px-4 py-2.5 text-xs font-typewriter text-slate-800 outline-none transition-colors duration-200"
                  />
                </div>

                {/* Clean Divided Host List with 4-Bar Signal Strength */}
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 max-h-80 overflow-y-auto">
                  {filteredPingTargets.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No ping targets available. Run a LAN discovery sweep to find active hosts.
                    </div>
                  ) : (
                    filteredPingTargets.map((dev) => (
                      <PingTargetRow
                        key={dev.ip_address}
                        ip={dev.ip_address}
                        hostname={dev.hostname}
                        rttMs={dev.last_rtt_ms}
                        isOnline={dev.is_online}
                        selected={targetIp === dev.ip_address}
                        onSelect={() => {
                          setTargetIp(dev.ip_address);
                          handleRunPing(dev.ip_address);
                        }}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Ping Parameters Card */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4">
                <div>
                  <h3 className="text-base sm:text-lg font-heading font-medium text-slate-900">
                    Custom Ping Parameters
                  </h3>
                  <p className="text-xs text-slate-500 font-normal mt-0.5">
                    Supports single IP or comma-separated multi-host batch testing
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-500 font-heading font-medium mb-1">
                      Target IP(s) or Hostname:
                    </label>
                    <input
                      type="text"
                      value={targetIp}
                      onChange={(e) => setTargetIp(e.target.value)}
                      placeholder="e.g. 192.168.1.1, 8.8.8.8"
                      className="w-full bg-[#F8FAFC] border border-slate-200 rounded-2xl px-4 py-2.5 font-typewriter font-medium text-blue-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-slate-500 font-heading font-medium mb-1">
                        Packets:
                      </label>
                      <select
                        aria-label="Packet Count"
                        value={pingCount}
                        onChange={(e) => setPingCount(Number(e.target.value))}
                        className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-2.5 py-2 font-typewriter font-medium text-slate-800"
                      >
                        <option value={4}>4 pkts</option>
                        <option value={8}>8 pkts</option>
                        <option value={15}>15 pkts</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 font-heading font-medium mb-1">
                        Payload:
                      </label>
                      <select
                        aria-label="Payload Bytes"
                        value={packetSize}
                        onChange={(e) => setPacketSize(Number(e.target.value))}
                        className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-2.5 py-2 font-typewriter font-medium text-slate-800"
                      >
                        <option value={32}>32 Bytes</option>
                        <option value={64}>64 Bytes</option>
                        <option value={512}>512 Bytes</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-500 font-heading font-medium mb-1">
                        Protocol:
                      </label>
                      <select
                        aria-label="Ping Protocol"
                        value={protocol}
                        onChange={(e) => setProtocol(e.target.value)}
                        className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl px-2.5 py-2 font-typewriter font-medium text-blue-600"
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
                    className="w-full py-3 rounded-full hyper-hero-gradient hover:brightness-105 disabled:opacity-50 text-white font-heading font-semibold text-xs transition-all duration-200 ease-out cursor-pointer"
                  >
                    {isPinging
                      ? "Streaming Echo Replies..."
                      : "Execute Ping Connectivity Test"}
                  </button>
                </div>
              </div>
            </div>

            {/* Right 7 Cols: Live Sequence Stream + Latency Comparison Chart */}
            <div className="xl:col-span-7 space-y-5">
              {/* Live Sequence Replies Card */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-lg sm:text-xl font-heading font-semibold text-slate-900 tracking-tight">
                      Live ICMP / TCP Sequence Stream ({terminalFeed.length} replies)
                    </h2>
                    <p className="text-xs text-slate-500 font-normal mt-0.5">
                      Target: <span className="font-typewriter font-medium text-blue-600">{targetIp}</span>
                    </p>
                  </div>
                  {terminalFeed.length > 0 && (
                    <button
                      type="button"
                      onClick={clearPingStream}
                      className="px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-heading font-medium cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {terminalFeed.length === 0 ? (
                    <div className="py-12 text-center space-y-2 bg-[#F8FAFC] rounded-2xl border border-dashed border-slate-200">
                      <div className="text-sm font-heading font-medium text-slate-700">
                        Ready to Stream Ping Sequence
                      </div>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Click any target in the Ping list on the left or click &ldquo;Execute Ping Connectivity Test&rdquo; to measure live RTT and packet loss.
                      </p>
                    </div>
                  ) : (
                    terminalFeed.map((item, idx) => (
                      <div
                        key={`${item.ip_address}-${item.seq}-${idx}`}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 text-xs font-typewriter"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              item.status === "SUCCESS"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                : "bg-rose-50 text-rose-600 border border-rose-200"
                            }`}
                          >
                            {item.status}
                          </span>
                          <span className="font-medium text-slate-900">
                            {item.ip_address}
                          </span>
                          <span className="text-slate-400 font-sans">
                            ({item.hostname})
                          </span>
                          <span className="text-slate-500">
                            seq={item.seq}/{item.count} · {item.bytes}B · {item.protocol}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`font-medium ${
                              item.rtt_ms != null
                                ? "text-blue-600"
                                : "text-rose-500"
                            }`}
                          >
                            {item.rtt_ms != null
                              ? `${item.rtt_ms} ms${item.ttl != null ? ` (TTL=${item.ttl})` : ""}`
                              : "Timeout (100% loss)"}
                          </span>
                          <SignalStrengthBars
                            rttMs={item.rtt_ms}
                            isOnline={item.status === "SUCCESS"}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Per-Host Avg vs Peak Latency Comparison Card */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-heading font-semibold text-slate-900 tracking-tight">
                      Average vs. Peak Latency Comparison
                    </h2>
                    <p className="text-xs text-slate-500 font-normal mt-0.5">
                      Visual QoS distribution across measured subnet hosts
                    </p>
                  </div>
                </div>
                <HostLatencyBarChart stats={qosStats} />
              </div>
            </div>
          </div>

          {/* Feature 3 Mandatory Full Network Statistics Table */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-heading font-semibold text-slate-900 tracking-tight">
                  Feature 3: Network Statistics Table (Per-Host QoS Telemetry)
                </h2>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Displays Hostname, IP Address, Minimum Latency, Average Latency, Maximum Latency, Jitter, and Packet Loss %
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-typewriter font-medium">
                {qosStats.length} Hosts Measured
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-typewriter">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-heading font-medium uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-2.5">Hostname</th>
                    <th className="py-3 px-2.5">IP Address</th>
                    <th className="py-3 px-2.5">Min Latency</th>
                    <th className="py-3 px-2.5">Average Latency</th>
                    <th className="py-3 px-2.5">Maximum Latency</th>
                    <th className="py-3 px-2.5">Jitter (ms)</th>
                    <th className="py-3 px-2.5">Packet Loss (%)</th>
                    <th className="py-3 px-2.5">Sent/Recv</th>
                    <th className="py-3 px-2.5">Signal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {qosStats.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 font-sans">
                        No network QoS statistics recorded yet. Execute a ping test above to populate telemetry.
                      </td>
                    </tr>
                  ) : (
                    qosStats.map((s) => (
                      <tr key={s.ip_address} className="hover:bg-slate-50/90">
                        <td className="py-3 px-2.5 text-slate-900 font-heading font-medium">
                          {s.hostname || "--"}
                        </td>
                        <td className="py-3 px-2.5 text-blue-600 font-medium">
                          {s.ip_address || "--"}
                        </td>
                        <td className="py-3 px-2.5 text-slate-600">
                          {s.min_latency_ms != null ? `${s.min_latency_ms} ms` : "--"}
                        </td>
                        <td className="py-3 px-2.5 text-emerald-600 font-medium">
                          {s.avg_latency_ms != null ? `${s.avg_latency_ms} ms` : "--"}
                        </td>
                        <td className="py-3 px-2.5 text-amber-600 font-medium">
                          {s.max_latency_ms != null ? `${s.max_latency_ms} ms` : "--"}
                        </td>
                        <td className="py-3 px-2.5 text-slate-700 font-medium">
                          {s.jitter_ms != null ? `${s.jitter_ms} ms` : "--"}
                        </td>
                        <td className="py-3 px-2.5">
                          {s.packet_loss_pct != null ? (
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                                s.packet_loss_pct >= 50
                                  ? "bg-rose-50 text-rose-600 border border-rose-200"
                                  : s.packet_loss_pct > 0
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                              }`}
                            >
                              {s.packet_loss_pct}%
                            </span>
                          ) : (
                            "--"
                          )}
                        </td>
                        <td className="py-3 px-2.5 text-slate-500 font-typewriter">
                          {s.packets_sent != null ? `${s.packets_received}/${s.packets_sent}` : "--"}
                        </td>
                        <td className="py-3 px-2.5">
                          <SignalStrengthBars
                            rttMs={s.avg_latency_ms}
                            isOnline={s.packet_loss_pct != null ? s.packet_loss_pct < 100 : false}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Bonus Feature 5: Async Socket Port Scanner Workspace */
        <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 flex-1">
              <div>
                <label className="block text-xs font-heading font-medium text-slate-500 mb-1">
                  Target Host IP:
                </label>
                <input
                  type="text"
                  value={portTargetIp}
                  onChange={(e) => setPortTargetIp(e.target.value)}
                  placeholder="e.g. 192.168.1.1"
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-typewriter font-medium text-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-heading font-medium text-slate-500 mb-1">
                  Port Scan Preset:
                </label>
                <select
                  aria-label="Port Scan Preset"
                  value={portPreset}
                  onChange={(e) => setPortPreset(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-heading font-medium text-slate-800"
                >
                  <option value="quick">Quick Top 25 Enterprise Ports</option>
                  <option value="standard">Standard Well-Known Ports (20–1024)</option>
                  <option value="custom">Custom Port List / Range</option>
                </select>
              </div>

              {portPreset === "custom" ? (
                <div>
                  <label className="block text-xs font-heading font-medium text-slate-500 mb-1">
                    Custom Ports (e.g. 21-25,80,443,8000):
                  </label>
                  <input
                    type="text"
                    value={customPorts}
                    onChange={(e) => setCustomPorts(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-typewriter text-slate-800"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-heading font-medium text-slate-500 mb-1">
                    Quick-Select Discovered Host:
                  </label>
                  <select
                    aria-label="Select Discovered Host for Port Scan"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) setPortTargetIp(e.target.value);
                    }}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-heading font-medium text-slate-700"
                  >
                    <option value="">-- Choose from {devices.length} hosts --</option>
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
              className="px-6 py-3 rounded-full hyper-hero-gradient hover:brightness-105 disabled:opacity-50 text-white font-heading font-semibold text-xs transition-all duration-200 ease-out cursor-pointer shrink-0"
            >
              {isScanningPorts
                ? "Scanning TCP Sockets..."
                : "Launch Socket Port Scan"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-typewriter">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-heading font-medium uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-2.5">Host IP</th>
                  <th className="py-3 px-2.5">Port / Proto</th>
                  <th className="py-3 px-2.5">State</th>
                  <th className="py-3 px-2.5">Service Name</th>
                  <th className="py-3 px-2.5">Grabbed Service Banner</th>
                  <th className="py-3 px-2.5">OSI Model Layer Mapping</th>
                  <th className="py-3 px-2.5">Exposure Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {portResults.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                      No open ports scanned yet. Enter a host IP and click &ldquo;Launch Socket Port Scan&rdquo;.
                    </td>
                  </tr>
                ) : (
                  portResults.map((p, idx) => (
                    <tr
                      key={`${p.ip_address}-${p.port}-${idx}`}
                      className="hover:bg-slate-50/90"
                    >
                      <td className="py-3 px-2.5 text-blue-600 font-medium">
                        {p.ip_address || "--"}
                      </td>
                      <td className="py-3 px-2.5 text-slate-900 font-medium">
                        {p.port} / {p.protocol}
                      </td>
                      <td className="py-3 px-2.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-medium">
                          {p.state || "--"}
                        </span>
                      </td>
                      <td className="py-3 px-2.5 text-slate-800 font-heading font-medium">
                        {p.service_name || "--"}
                      </td>
                      <td className="py-3 px-2.5 text-slate-500 max-w-xs truncate">
                        {p.banner || "--"}
                      </td>
                      <td className="py-3 px-2.5 text-blue-600 text-[11px] font-sans font-medium">
                        {p.osi_layer || "--"}
                      </td>
                      <td className="py-3 px-2.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium ${
                            p.risk_level === "CRITICAL"
                              ? "bg-rose-50 text-rose-600 border border-rose-200"
                              : p.risk_level === "HIGH"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-blue-50 text-blue-600 border border-blue-200"
                          }`}
                        >
                          {p.risk_level || "--"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
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
        <div className="p-8 text-center font-typewriter text-xs text-slate-400">
          Loading Connectivity &amp; QoS Engine...
        </div>
      }
    >
      <ConnectivityWorkspace />
    </Suspense>
  );
}
