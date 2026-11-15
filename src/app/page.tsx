"use client";

import {
  BandwidthThroughputChart,
  LiveLatencyAreaChart,
  OsiProtocolDonutChart,
} from "@/components/dashboard/TelemetryCharts";
import { netpulseApi } from "@/lib/api";
import { useNetPulseStore } from "@/store/useNetPulseStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export default function NocOverviewPage() {
  const router = useRouter();
  const {
    activeInterface,
    devices,
    qosStats,
    securityScore,
    securityGrade,
    securityAlerts,
    telemetrySeries,
    isScanning,
    triggerScan,
    triggerSeedCampusLab,
  } = useNetPulseStore();

  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [chartView, setChartView] = useState<"bandwidth" | "protocol">("bandwidth");

  const onlineDevices = devices.filter((d) => d.is_online);
  const validRtts = qosStats.filter((s) => s.avg_latency_ms > 0);
  const avgLatency =
    validRtts.length > 0
      ? (
        validRtts.reduce((acc, s) => acc + s.avg_latency_ms, 0) /
        validRtts.length
      ).toFixed(2)
      : "1.42";
  const maxLatency =
    validRtts.length > 0
      ? Math.max(...validRtts.map((s) => s.max_latency_ms)).toFixed(2)
      : "4.80";
  const avgPacketLoss =
    qosStats.length > 0
      ? (
        qosStats.reduce((acc, s) => acc + s.packet_loss_pct, 0) /
        qosStats.length
      ).toFixed(1)
      : "0.0";

  const handleQuickReport = async () => {
    setGeneratingPdf(true);
    try {
      const res = await netpulseApi.generateReport();
      window.open(netpulseApi.getReportPdfUrl(res.report.id), "_blank");
    } catch {
      router.push("/reports");
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header & Quick Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0F172A] border border-slate-800 rounded-xl p-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-cyan-400">
            WVSU CICT · CCS 234 NETWORK OPERATIONS &amp; PERFORMANCE CENTER
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white mt-0.5">
            Real-Time Network Telemetry &amp; Diagnostic Overview
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Live OSI Layer 2–7 discovery, ICMP/TCP QoS monitoring, Wireshark packet analysis, and automated security advisories.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={isScanning}
            onClick={() => triggerScan("auto")}
            className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition cursor-pointer"
          >
            {isScanning ? "Scanning Subnet..." : "🔍 Scan Active Subnet"}
          </button>
          <button
            type="button"
            disabled={isScanning}
            onClick={() => triggerSeedCampusLab()}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-cyan-500/40 text-cyan-300 font-semibold text-xs transition cursor-pointer"
          >
            🏫 Load Campus Lab Topology
          </button>
          <button
            type="button"
            disabled={generatingPdf}
            onClick={handleQuickReport}
            className="px-3.5 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-semibold text-xs transition cursor-pointer"
          >
            {generatingPdf ? "Building PDF..." : "📄 Export PDF Report"}
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards (Tremor / NOC Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Feature 1 Local IP & Network Range */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>LOCAL IP &amp; SUBNET RANGE</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300">
              FEATURE 1
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {activeInterface.local_ip}
          </div>
          <div className="text-xs font-mono text-cyan-400">
            CIDR Range: {activeInterface.subnet_cidr} ({activeInterface.usable_hosts} hosts)
          </div>
          <div className="text-[11px] font-mono text-slate-400 flex justify-between pt-1 border-t border-slate-800/80">
            <span>NIC: {activeInterface.interface_name}</span>
            <span>GW: {activeInterface.gateway_ip}</span>
          </div>
        </div>

        {/* KPI 2: Feature 1 Active Devices */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>ACTIVE SUBNET DEVICES</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
              ARP · ICMP · TCP
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {onlineDevices.length}{" "}
            <span className="text-sm font-normal text-slate-400">
              / {devices.length} Hosts Online
            </span>
          </div>
          {/* Uptime Tracker Blocks */}
          <div className="flex items-center gap-1 pt-1">
            {(devices.length > 0 ? devices.slice(0, 12) : Array.from({ length: 8 })).map(
              (dev, i) => {
                const online = dev ? (dev as { is_online: boolean }).is_online : true;
                return (
                  <span
                    key={i}
                    className={`h-2.5 flex-1 rounded-sm ${online ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                  />
                );
              }
            )}
          </div>
          <div className="text-[11px] font-mono text-slate-400 flex justify-between pt-1 border-t border-slate-800/80">
            <span>MAC: {activeInterface.mac_address}</span>
            <Link href="/discovery" className="text-cyan-400 hover:underline">
              View Topology →
            </Link>
          </div>
        </div>

        {/* KPI 3: Features 2 & 3 Network Latency & Loss */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>SUBNET LATENCY &amp; LOSS</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300">
              FEATURES 2 &amp; 3
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {avgLatency} <span className="text-sm font-normal text-slate-400">ms avg</span>
          </div>
          <div className="text-xs font-mono text-amber-300">
            Max Peak: {maxLatency} ms | Loss: {avgPacketLoss}%
          </div>
          <div className="text-[11px] font-mono text-slate-400 flex justify-between pt-1 border-t border-slate-800/80">
            <span>Tested Hosts: {qosStats.length}</span>
            <Link href="/connectivity" className="text-cyan-400 hover:underline">
              Ping Console →
            </Link>
          </div>
        </div>

        {/* KPI 4: Feature 5 Security Posture */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>SECURITY POSTURE SCORE</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300">
              FEATURE 5
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-cyan-400">
              {securityScore}/100
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
              Grade {securityGrade}
            </span>
          </div>
          <div className="text-xs font-mono text-slate-300">
            {securityAlerts.length} Active Advisories Across 4 Categories
          </div>
          <div className="text-[11px] font-mono text-slate-400 flex justify-between pt-1 border-t border-slate-800/80">
            <span>Firewall + QoS Rules</span>
            <Link href="/security" className="text-cyan-400 hover:underline">
              Security Center →
            </Link>
          </div>
        </div>
      </div>

      {/* Center Charts Row (Bonus Feature 2 & 7: Real-Time Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[#0F172A] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-white">
                Real-Time Subnet Latency &amp; Jitter Stream (WebSocket 2s Interval)
              </h2>
              <p className="text-xs text-slate-400">
                Continuous RTT telemetry across discovered active subnet hosts
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              ● STREAMING
            </span>
          </div>
          <LiveLatencyAreaChart data={telemetrySeries} />
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-white">
                  {chartView === "bandwidth"
                    ? "NIC Bandwidth Throughput"
                    : "OSI Protocol Distribution"}
                </h2>
                <p className="text-xs text-slate-400">
                  {chartView === "bandwidth"
                    ? "Live TX / RX kbps via Python psutil"
                    : "L2–L7 Network Packet Breakdown"}
                </p>
              </div>
              <div className="flex items-center gap-1 font-mono text-[11px]">
                <button
                  type="button"
                  onClick={() => setChartView("bandwidth")}
                  className={`px-2 py-0.5 rounded cursor-pointer ${chartView === "bandwidth"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "text-slate-400 hover:text-white"
                    }`}
                >
                  Bandwidth
                </button>
                <button
                  type="button"
                  onClick={() => setChartView("protocol")}
                  className={`px-2 py-0.5 rounded cursor-pointer ${chartView === "protocol"
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "text-slate-400 hover:text-white"
                    }`}
                >
                  OSI Donut
                </button>
              </div>
            </div>

            {chartView === "bandwidth" ? (
              <BandwidthThroughputChart data={telemetrySeries} />
            ) : (
              <OsiProtocolDonutChart />
            )}
          </div>

          <div className="pt-2 mt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Deep Inspection:</span>
            <Link
              href="/packets"
              className="text-cyan-400 hover:underline flex items-center gap-1"
            >
              Wireshark 🦈 →
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Split: Active Devices Quick Table + Security Recommendations Feed */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left 2/3: Discovered Devices with 1-Click Contextual Actions */}
        <div className="xl:col-span-2 bg-[#0F172A] border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-white">
                Discovered Subnet Hosts &amp; One-Click Diagnostic Pipeline
              </h2>
              <p className="text-xs text-slate-400">
                Click Ping, Scan Ports, or Sniff on any host without re-typing its IP address
              </p>
            </div>
            <Link
              href="/discovery"
              className="text-xs font-mono text-cyan-400 hover:underline"
            >
              Full Discovery &amp; Map →
            </Link>
          </div>

          {devices.length === 0 ? (
            <div className="p-8 rounded-lg bg-slate-950/70 border border-dashed border-slate-800 text-center space-y-3">
              <div className="text-sm font-semibold text-slate-200">
                No Subnet Scan Recorded Yet in Current Session
              </div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Click &ldquo;Scan Active Subnet&rdquo; to discover real LAN hosts via ARP/ICMP/TCP, or click &ldquo;Load Campus Lab Topology&rdquo; to seed a complete multi-host lab environment.
              </p>
              <div className="flex justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => triggerScan("auto")}
                  className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-xs cursor-pointer"
                >
                  🔍 Run Initial Subnet Scan
                </button>
                <button
                  type="button"
                  onClick={() => triggerSeedCampusLab()}
                  className="px-4 py-2 rounded-lg bg-slate-800 border border-cyan-500/40 text-cyan-300 font-semibold text-xs cursor-pointer"
                >
                  🏫 Seed Campus Lab Topology
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                    <th className="py-2 px-2">Status</th>
                    <th className="py-2 px-2">IP Address</th>
                    <th className="py-2 px-2">Hostname</th>
                    <th className="py-2 px-2">MAC / Vendor</th>
                    <th className="py-2 px-2">RTT</th>
                    <th className="py-2 px-2 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {devices.slice(0, 8).map((dev) => (
                    <tr key={dev.ip_address} className="hover:bg-slate-900/60">
                      <td className="py-2.5 px-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${dev.is_online
                              ? "bg-emerald-500/15 text-emerald-400"
                              : "bg-rose-500/15 text-rose-400"
                            }`}
                        >
                          ● {dev.is_online ? "ONLINE" : "OFFLINE"}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-cyan-300 font-semibold">
                        {dev.ip_address}
                      </td>
                      <td className="py-2.5 px-2 text-slate-200 font-sans">
                        {dev.hostname}
                      </td>
                      <td className="py-2.5 px-2 text-slate-400 text-[11px]">
                        <div>{dev.mac_address}</div>
                        <div className="text-slate-500">{dev.vendor}</div>
                      </td>
                      <td className="py-2.5 px-2 text-emerald-300">
                        {dev.last_rtt_ms != null ? `${dev.last_rtt_ms} ms` : "—"}
                      </td>
                      <td className="py-2.5 px-2 text-right space-x-1.5 whitespace-nowrap">
                        <Link
                          href={`/connectivity?target=${encodeURIComponent(
                            dev.ip_address
                          )}&autostart=ping`}
                          className="px-2 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 text-[11px]"
                        >
                          ⚡ Ping
                        </Link>
                        <Link
                          href={`/connectivity?target=${encodeURIComponent(
                            dev.ip_address
                          )}&tab=ports&autostart=scan`}
                          className="px-2 py-1 rounded bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 text-[11px]"
                        >
                          🔓 Ports
                        </Link>
                        <Link
                          href={`/packets?filter=${encodeURIComponent(
                            `host ${dev.ip_address}`
                          )}`}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                        >
                          🦈 Sniff
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right 1/3: Security Recommendations Feed */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-white">
                  Security &amp; QoS Advisories
                </h2>
                <p className="text-xs text-slate-400">
                  Feature 5 deterministic rule evaluation
                </p>
              </div>
              <Link
                href="/security"
                className="text-xs font-mono text-cyan-400 hover:underline"
              >
                All Rules →
              </Link>
            </div>

            {securityAlerts.length === 0 ? (
              <div className="p-6 rounded-lg bg-slate-950/70 border border-dashed border-slate-800 text-center space-y-2">
                <div className="text-xs font-semibold text-slate-300">
                  No Active Security Advisories
                </div>
                <p className="text-[11px] text-slate-400">
                  Subnet baseline satisfies standard security parameters, or evaluate rules below.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => triggerSeedCampusLab()}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 font-mono text-[11px] cursor-pointer"
                  >
                    🏫 Seed Campus Lab Advisories
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {securityAlerts.slice(0, 4).map((alert, idx) => {
                  const badgeColor =
                    alert.severity === "CRITICAL"
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      : alert.severity === "HIGH"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
                  return (
                    <div
                      key={alert.id || idx}
                      className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${badgeColor}`}
                        >
                          {alert.severity} · {alert.category}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {alert.target_ip}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-100">
                        {alert.title}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {alert.recommendation}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Tkinter Companion GUI:</span>
            <span className="text-emerald-400">backend/tkinter_gui.py</span>
          </div>
        </div>
      </div>
    </div>
  );
}
