"use client";

import {
  BandwidthThroughputChart,
  LiveLatencyAreaChart,
  OsiProtocolDonutChart,
} from "@/components/dashboard/TelemetryCharts";
import {
  HyperSpeedGauge,
  LanDeviceCard,
  MetricWaveCard,
  PingTargetRow,
  SegmentedPillControl,
} from "@/components/ui/HyperComponents";
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
    totalMbRecv,
    totalMbSent,
    speedBenchmark,
    isScanning,
    triggerScan,
    runSpeedBenchmark,
    stopSpeedBenchmark,
    postStatusNotice,
  } = useNetPulseStore();

  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [timeRange, setTimeRange] = useState<"daily" | "weekly" | "monthly" | "yearly">("weekly");
  const [chartTab, setChartTab] = useState<"analysis" | "overview" | "protocol">("analysis");
  const [quotaGb, setQuotaGb] = useState<number>(128);
  const [selectedFeatureMetric, setSelectedFeatureMetric] = useState<
    "download" | "upload" | "ping" | "jitter"
  >("download");

  const onlineDevices = devices.filter((d) => d.is_online);
  const validRtts = qosStats.filter((s) => s.avg_latency_ms > 0);
  const avgLatency =
    validRtts.length > 0
      ? Number(
          (
            validRtts.reduce((acc, s) => acc + s.avg_latency_ms, 0) /
            validRtts.length
          ).toFixed(1)
        )
      : null;

  const avgJitter =
    validRtts.length > 0
      ? Number(
          (
            validRtts.reduce((acc, s) => acc + s.jitter_ms, 0) /
            validRtts.length
          ).toFixed(1)
        )
      : null;

  const downloadGb = totalMbRecv > 0 ? Number((totalMbRecv / 1024).toFixed(1)) : 0;
  const uploadGb = totalMbSent > 0 ? Number((totalMbSent / 1024).toFixed(1)) : 0;

  const handleQuickReport = async () => {
    setGeneratingPdf(true);
    try {
      const res = await netpulseApi.generateReport();
      window.open(netpulseApi.getReportPdfUrl(res.report.id), "_blank");
      postStatusNotice(
        "success",
        "Official PDF Report Generated",
        `Compiled Diagnostic Report #${res.report.id}.`
      );
    } catch {
      postStatusNotice(
        "info",
        "Opening Report Builder",
        "Redirected to the Diagnostic Report Center."
      );
      router.push("/reports");
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Build dynamic sparkline arrays from telemetrySeries
  const rxSpark = telemetrySeries.map((p) => p.rx_kbps);
  const txSpark = telemetrySeries.map((p) => p.tx_kbps);
  const rttSpark = telemetrySeries.map((p) => p.avg_rtt_ms);
  const jitterSpark = telemetrySeries.map((p) => p.jitter_ms);

  // Determine what value to display on the main gauge based on user card selection
  const activeGaugeValue =
    speedBenchmark.isRunning
      ? speedBenchmark.gaugeValue
      : selectedFeatureMetric === "download"
      ? speedBenchmark.downloadMbps
      : selectedFeatureMetric === "upload"
      ? speedBenchmark.uploadMbps
      : selectedFeatureMetric === "ping"
      ? (avgLatency ?? 0)
      : (avgJitter ?? 0);

  const activeGaugeUnit =
    selectedFeatureMetric === "ping" || selectedFeatureMetric === "jitter"
      ? "ms"
      : "mbps";

  return (
    <div className="space-y-6">
      {/* Top Hero Grid: Left = Speed Test Gauge + 2x2 Sparkline Cards (Screenshot 1 & 2 Left) | Right = Data Usage & Analysis Charts (Screenshot 1 Middle & Screenshot 2 Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (5 cols on XL): Speed Test Console & 2x2 Metric Wave Cards */}
        <div className="xl:col-span-5 space-y-5">
          {/* Speed Test Main Card (Screenshot 1 Left & Screenshot 2 Left) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-5">
            {/* Card Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-slate-900 tracking-tight">
                  Speed Test &amp; QoS Gauge
                </h1>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Test your throughput, subnet latency &amp; jitter
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-[11px] font-typewriter font-medium bg-blue-50 text-blue-600 border border-blue-100">
                {speedBenchmark.isRunning ? `● ${speedBenchmark.phase}` : "● READY"}
              </span>
            </div>

            {/* Server & Location Info Pill Card (Exact match to Screenshot 2 Left) */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-full hyper-hero-gradient text-white flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <rect x="3" y="4" width="18" height="6" rx="2" />
                    <rect x="3" y="14" width="18" height="6" rx="2" />
                    <path d="M7 7h.01M7 17h.01" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-400">Server / NIC</div>
                  <div className="text-xs font-heading font-medium text-slate-900 truncate">
                    {activeInterface.interface_name !== "--"
                      ? `HYPERNET · ${activeInterface.interface_name}`
                      : "--"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 min-w-0 border-l border-slate-200 pl-3">
                <div className="w-10 h-10 rounded-full bg-slate-200/75 text-slate-700 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3.6 9h16.8M3.6 15h16.8M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-400">Local IP / CIDR</div>
                  <div className="text-xs font-typewriter font-medium text-slate-900 truncate">
                    {activeInterface.local_ip !== "--" ? activeInterface.local_ip : "--"}
                  </div>
                </div>
              </div>
            </div>

            {/* Circular Speedometer Gauge */}
            <div className="py-1">
              <HyperSpeedGauge
                value={activeGaugeValue}
                label={activeGaugeUnit}
                sublabel={
                  activeInterface.gateway_ip !== "--"
                    ? `Gateway ${activeInterface.gateway_ip} · ${activeInterface.subnet_cidr}`
                    : "Gateway -- · --"
                }
                isRunning={speedBenchmark.isRunning}
                phase={speedBenchmark.phase}
              />
            </div>

            {/* Download / Upload Volume Summary Row (Screenshot 2 Left) */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-center">
              <div>
                <div className="inline-flex items-center gap-1 text-xs font-heading font-medium text-slate-400">
                  <span className="text-blue-600 font-medium">↓</span> Download Volume
                </div>
                <div className="text-2xl sm:text-3xl font-semibold font-typewriter text-slate-900 mt-0.5">
                  {downloadGb > 0 ? `${downloadGb} GB` : "--"}
                </div>
              </div>
              <div className="border-l border-slate-100">
                <div className="inline-flex items-center gap-1 text-xs font-heading font-medium text-slate-400">
                  <span className="text-blue-600 font-medium">↑</span> Upload Volume
                </div>
                <div className="text-2xl sm:text-3xl font-semibold font-typewriter text-slate-900 mt-0.5">
                  {uploadGb > 0 ? `${uploadGb} GB` : "--"}
                </div>
              </div>
            </div>

            {/* Full-Width Gradient Pill Button (Screenshot 2 Left "Stop Test" / "Start Test") */}
            <button
              type="button"
              onClick={() =>
                speedBenchmark.isRunning
                  ? stopSpeedBenchmark()
                  : runSpeedBenchmark()
              }
              className={`w-full py-3.5 rounded-full font-heading font-semibold text-sm transition-all duration-200 ease-out cursor-pointer ${
                speedBenchmark.isRunning
                  ? "bg-rose-500 hover:bg-rose-600 text-white"
                  : "hyper-hero-gradient hover:brightness-105 text-white"
              }`}
            >
              {speedBenchmark.isRunning
                ? `Stop Test (${speedBenchmark.progressPct}%)`
                : "Start Speed & QoS Test"}
            </button>
          </div>

          {/* 2x2 Metric Sparkline Cards (Exact match to Screenshot 1 Left: Download, Upload, Ping, Jitter) */}
          <div className="grid grid-cols-2 gap-4">
            <MetricWaveCard
              title="Download"
              value={speedBenchmark.downloadMbps > 0 ? speedBenchmark.downloadMbps : "--"}
              unit="mbps"
              icon="↓"
              featured={selectedFeatureMetric === "download"}
              sparkline={rxSpark}
              onClick={() => setSelectedFeatureMetric("download")}
            />
            <MetricWaveCard
              title="Upload"
              value={speedBenchmark.uploadMbps > 0 ? speedBenchmark.uploadMbps : "--"}
              unit="mbps"
              icon="↑"
              featured={selectedFeatureMetric === "upload"}
              sparkline={txSpark}
              onClick={() => setSelectedFeatureMetric("upload")}
            />
            <MetricWaveCard
              title="Ping"
              value={avgLatency !== null ? avgLatency : "--"}
              unit="ms"
              subtitle="RTT"
              featured={selectedFeatureMetric === "ping"}
              sparkline={rttSpark}
              onClick={() => setSelectedFeatureMetric("ping")}
            />
            <MetricWaveCard
              title="Jitter"
              value={avgJitter !== null ? avgJitter : "--"}
              unit="ms"
              subtitle="QoS"
              featured={selectedFeatureMetric === "jitter"}
              sparkline={jitterSpark}
              onClick={() => setSelectedFeatureMetric("jitter")}
            />
          </div>
        </div>

        {/* RIGHT COLUMN (7 cols on XL): Data Usage, Hatched Analysis Chart, Pill Bar Overview & Subnet KPIs */}
        <div className="xl:col-span-7 space-y-5">
          {/* Data Usage & Telemetry Analysis Card (Screenshot 1 Middle & Screenshot 2 Right) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-5">
            {/* Top Row: Remaining Quota / Subnet Capacity + Add Quota / Export PDF Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-6 sm:gap-8">
                <div>
                  <div className="text-xs font-heading font-medium text-slate-400">
                    Remaining Telemetry Quota
                  </div>
                  <div className="text-3xl sm:text-4xl font-semibold font-typewriter text-slate-900 tracking-tight mt-0.5">
                    {quotaGb} GB
                  </div>
                </div>
                <div>
                  <div className="text-xs font-heading font-medium text-slate-400">
                    Download
                  </div>
                  <div className="text-2xl sm:text-3xl font-semibold font-typewriter text-slate-900 mt-0.5">
                    {downloadGb} GB
                  </div>
                </div>
                <div>
                  <div className="text-xs font-heading font-medium text-slate-400">
                    Upload
                  </div>
                  <div className="text-2xl sm:text-3xl font-semibold font-typewriter text-slate-900 mt-0.5">
                    {uploadGb} GB
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setQuotaGb((q) => q + 32);
                    postStatusNotice(
                      "success",
                      "Telemetry Quota Expanded",
                      "Added +32 GB to active monitoring quota allocation."
                    );
                  }}
                  className="px-4 py-2 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-heading font-medium text-xs transition-colors duration-200 cursor-pointer"
                >
                  Add Quota +
                </button>
                <button
                  type="button"
                  disabled={generatingPdf}
                  onClick={handleQuickReport}
                  className="px-4 py-2 rounded-full bg-[#141B2D] hover:bg-slate-800 text-white font-heading font-medium text-xs transition-colors duration-200 cursor-pointer"
                >
                  {generatingPdf ? "Building PDF..." : "Export PDF"}
                </button>
              </div>
            </div>

            {/* Segmented Pill Selector: Daily | Weekly | Monthly | Yearly (Exact match to Screenshot 1 Middle & Screenshot 2 Right) */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SegmentedPillControl
                size="sm"
                options={[
                  { id: "daily", label: "Daily" },
                  { id: "weekly", label: "Weekly" },
                  { id: "monthly", label: "Monthly" },
                  { id: "yearly", label: "Yearly" },
                ]}
                value={timeRange}
                onChange={(v) => setTimeRange(v)}
              />

              {/* Chart Mode Dropdown / Switcher matching Screenshot 2 Right "↓ Download ⌄" */}
              <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full p-1">
                <button
                  type="button"
                  onClick={() => setChartTab("analysis")}
                  className={`px-3 py-1 rounded-full text-xs font-heading font-medium transition-all duration-200 ease-out cursor-pointer ${
                    chartTab === "analysis"
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Analysis
                </button>
                <button
                  type="button"
                  onClick={() => setChartTab("overview")}
                  className={`px-3 py-1 rounded-full text-xs font-heading font-medium transition-all duration-200 ease-out cursor-pointer ${
                    chartTab === "overview"
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Overview Bars
                </button>
                <button
                  type="button"
                  onClick={() => setChartTab("protocol")}
                  className={`px-3 py-1 rounded-full text-xs font-heading font-medium transition-all duration-200 ease-out cursor-pointer ${
                    chartTab === "protocol"
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  OSI Layers
                </button>
              </div>
            </div>

            {/* Active Chart Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-heading font-semibold text-slate-900 tracking-tight">
                  {chartTab === "analysis"
                    ? "Analysis — Real-Time Latency & Jitter Stream"
                    : chartTab === "overview"
                    ? "Overview — Weekly Downlink & Capacity Bars"
                    : "OSI Layer 2–7 Protocol Breakdown"}
                </h2>
                <span className="text-xs font-typewriter text-blue-600 font-medium">
                  {timeRange.toUpperCase()} WINDOW
                </span>
              </div>

              {chartTab === "analysis" ? (
                <LiveLatencyAreaChart data={telemetrySeries} />
              ) : chartTab === "overview" ? (
                <BandwidthThroughputChart data={telemetrySeries} />
              ) : (
                <OsiProtocolDonutChart />
              )}
            </div>

            {/* History / Subnet Telemetry Key-Value Sheet (Matching Screenshot 2 Right bottom "History / Show All") */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base sm:text-lg font-heading font-medium text-slate-900">
                  Subnet &amp; Interface Telemetry Summary
                </h3>
                <Link
                  href="/discovery"
                  className="text-xs font-heading font-medium text-blue-600 hover:underline"
                >
                  Show All ({devices.length} Hosts) →
                </Link>
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                <div className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-slate-500 font-medium">Average Subnet Ping</span>
                  <span className="font-semibold font-typewriter text-slate-900 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
                    {avgLatency !== null ? `${avgLatency} ms` : "--"}
                  </span>
                </div>
                <div className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-slate-500 font-medium">Local IPv4 &amp; Subnet CIDR</span>
                  <span className="font-semibold font-typewriter text-blue-600 bg-blue-50/60 px-2.5 py-1 rounded-lg border border-blue-200/50">
                    {activeInterface.local_ip !== "--" ? (
                      <>
                        {activeInterface.local_ip}{" "}
                        <span className="text-blue-400 font-normal">({activeInterface.subnet_cidr})</span>
                      </>
                    ) : (
                      "--"
                    )}
                  </span>
                </div>
                <div className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-slate-500 font-medium">Default Gateway &amp; MAC</span>
                  <span className="font-semibold font-typewriter text-slate-800 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60">
                    {activeInterface.gateway_ip !== "--" ? (
                      <>
                        {activeInterface.gateway_ip}{" "}
                        <span className="text-slate-400 font-normal">· {activeInterface.mac_address}</span>
                      </>
                    ) : (
                      "--"
                    )}
                  </span>
                </div>
                <div className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-slate-500 font-medium">Active LAN Devices &amp; Security</span>
                  <span className="font-semibold font-typewriter text-emerald-600 bg-emerald-50/60 px-2.5 py-1 rounded-lg border border-emerald-200/50">
                    {devices.length > 0 ? (
                      <>
                        {onlineDevices.length}/{devices.length} Online <span className="text-slate-300 mx-1">|</span> Score {securityScore}/100 ({securityGrade})
                      </>
                    ) : (
                      "-- / -- Online | Score --/100 (--)"
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Ping Signal List Card (Matching Screenshot 1 Right "Ping" Screen!) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xl sm:text-2xl font-heading font-semibold text-slate-900 tracking-tight">
                  Live Host Ping &amp; Signal Quality
                </h2>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  One-click latency signal bars across active subnet hosts
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isScanning}
                  onClick={() => triggerScan("auto")}
                  className="px-3.5 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-heading font-medium text-xs transition-colors duration-200 cursor-pointer"
                >
                  {isScanning ? "Scanning..." : "Scan Subnet"}
                </button>
                <Link
                  href="/connectivity"
                  className="px-3.5 py-1.5 rounded-full bg-[#141B2D] text-white font-heading font-medium text-xs hover:bg-slate-800 transition-colors duration-200"
                >
                  Ping Console →
                </Link>
              </div>
            </div>

            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 overflow-hidden">
              {devices.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-typewriter">
                  No discovered devices yet. Click &ldquo;Scan Subnet&rdquo; to detect active hosts.
                </div>
              ) : (
                devices.slice(0, 5).map((dev) => (
                  <PingTargetRow
                    key={dev.ip_address}
                    ip={dev.ip_address}
                    hostname={dev.hostname}
                    subtitle={dev.vendor}
                    rttMs={dev.last_rtt_ms}
                    isOnline={dev.is_online}
                    rightActions={
                      <div className="hidden sm:flex items-center gap-1">
                        <Link
                          href={`/connectivity?target=${encodeURIComponent(
                            dev.ip_address
                          )}&autostart=ping`}
                          className="px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 text-[11px] font-heading font-medium"
                        >
                          Ping
                        </Link>
                        <Link
                          href={`/connectivity?target=${encodeURIComponent(
                            dev.ip_address
                          )}&tab=ports&autostart=scan`}
                          className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-heading font-medium"
                        >
                          Ports
                        </Link>
                      </div>
                    }
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Featured LAN Device Cards + Security Advisories */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: LAN Device Cards */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-heading font-semibold text-slate-900 tracking-tight">
                LAN Devices{" "}
                <span className="text-blue-600 font-typewriter font-medium text-sm ml-1">
                  Found {devices.length} devices
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                Layer 2 ARP, Layer 3 ICMP &amp; Layer 4 TCP discovered subnet nodes
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/discovery"
                className="px-4 py-1.5 rounded-full hyper-hero-gradient text-white text-xs font-heading font-medium transition-all duration-200 ease-out hover:brightness-105"
              >
                Full LAN &amp; Topology →
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {devices.length === 0 ? (
              <div className="col-span-2 p-8 text-center text-xs text-slate-400 font-typewriter bg-[#F8FAFC] rounded-2xl border border-dashed border-slate-200">
                No LAN devices discovered yet. Click &ldquo;Scan Subnet&rdquo; to discover network devices.
              </div>
            ) : (
              devices.slice(0, 4).map((dev, index) => (
                <LanDeviceCard
                  key={dev.ip_address}
                  device={dev}
                  featured={index === 0}
                />
              ))
            )}
          </div>
        </div>

        {/* Right 4 Cols: Active Security & QoS Advisories */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-heading font-semibold text-slate-900 tracking-tight">
                  Security Posture
                </h2>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Feature 5 deterministic rule engine
                </p>
              </div>
              <div className="px-3 py-1.5 rounded-2xl bg-blue-50 border border-blue-100 text-right font-typewriter">
                <div className="text-sm font-semibold text-blue-600">
                  {securityAlerts.length > 0 || securityScore > 0
                    ? `${securityScore}/100 (${securityGrade})`
                    : "--/100 (--)"}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {securityAlerts.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 font-typewriter bg-[#F8FAFC] rounded-2xl border border-slate-200/80">
                  No active security advisories recorded yet. Run a subnet scan or security evaluation.
                </div>
              ) : (
                securityAlerts.slice(0, 3).map((alert, idx) => {
                  const badgeCls =
                    alert.severity === "CRITICAL"
                      ? "bg-rose-50 text-rose-600 border-rose-200"
                      : alert.severity === "HIGH"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-blue-50 text-blue-600 border-blue-200";
                  return (
                    <div
                      key={alert.id || idx}
                      className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-typewriter font-medium px-2 py-0.5 rounded-full border ${badgeCls}`}
                        >
                          {alert.severity} · {alert.category}
                        </span>
                        <span className="text-[11px] font-typewriter font-medium text-slate-500">
                          {alert.target_ip}
                        </span>
                      </div>
                      <div className="text-xs font-heading font-medium text-slate-900">
                        {alert.title}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {alert.recommendation}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-heading">
            <Link
              href="/security"
              className="font-medium text-blue-600 hover:underline"
            >
              Open Security Advisor ({securityAlerts.length}) →
            </Link>
            <Link
              href="/packets"
              className="font-medium text-slate-600 hover:text-blue-600"
            >
              Wireshark Sniffer →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
