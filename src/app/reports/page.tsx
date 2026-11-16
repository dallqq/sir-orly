"use client";

import { BandwidthThroughputChart } from "@/components/dashboard/TelemetryCharts";
import {
  SegmentedPillControl,
  SignalStrengthBars,
} from "@/components/ui/HyperComponents";
import {
  DiagnosticReportMeta,
  DiscoveredDevice,
  HostQoSStats,
  SecurityAlert,
  netpulseApi,
} from "@/lib/api";
import { useNetPulseStore } from "@/store/useNetPulseStore";
import React, { useCallback, useEffect, useState } from "react";

interface ReportPayload {
  generated_at_readable?: string;
  performance_summary?: {
    total_devices: number;
    online_devices: number;
    offline_devices: number;
    avg_subnet_latency_ms: number;
    max_subnet_latency_ms: number;
    overall_packet_loss_pct: number;
    health_score: number;
    security_grade: string;
    summary_text: string;
  };
  devices_detected?: DiscoveredDevice[];
  ping_results?: HostQoSStats[];
  security_recommendations?: SecurityAlert[];
}

export default function DiagnosticReportsPage() {
  const {
    apiOnline,
    activeInterface,
    devices,
    qosStats,
    securityAlerts,
    securityScore,
    securityGrade,
    telemetrySeries,
    postStatusNotice,
  } = useNetPulseStore();

  const [reports, setReports] = useState<DiagnosticReportMeta[]>([]);
  const [activeReport, setActiveReport] =
    useState<DiagnosticReportMeta | null>(null);
  const [activePayload, setActivePayload] = useState<ReportPayload | null>(
    null
  );
  const [reportTitle, setReportTitle] = useState<string>(
    "NetPulse NOC — Official Network Diagnostic & Performance Audit"
  );
  const [generating, setGenerating] = useState<boolean>(false);
  const [periodTab, setPeriodTab] = useState<
    "daily" | "weekly" | "monthly" | "yearly"
  >("weekly");

  const loadReportDetail = useCallback(async (id: number) => {
    try {
      const res = await netpulseApi.getReportDetail(id);
      setActiveReport(res.report);
      setActivePayload(res.payload as ReportPayload);
    } catch {
      // keep existing
    }
  }, []);

  useEffect(() => {
    let active = true;
    netpulseApi
      .getReports()
      .then((res) => {
        if (!active) return null;
        setReports(res.reports);
        if (res.reports.length > 0) {
          return netpulseApi.getReportDetail(res.reports[0].id);
        }
        return null;
      })
      .then((detail) => {
        if (!active || !detail) return;
        setActiveReport(detail.report);
        setActivePayload(detail.payload as ReportPayload);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const res = await netpulseApi.generateReport(reportTitle);
      setActiveReport(res.report);
      setActivePayload(res.payload as ReportPayload);
      const list = await netpulseApi.getReports();
      setReports(list.reports);
      postStatusNotice(
        "success",
        "Diagnostic Report & PDF Built",
        `Generated Report #${res.report.id} with ReportLab PDF.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to compile diagnostic report.";
      postStatusNotice("error", "Report Generation Failed", msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleExportJson = () => {
    if (!activeReport || !activePayload) return;
    const blob = new Blob(
      [JSON.stringify({ report: activeReport, payload: activePayload }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NetPulse_Report_${activeReport.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsvLocal = () => {
    if (!activeReport || !activePayload) return;
    if (apiOnline) {
      window.open(netpulseApi.getReportCsvUrl(activeReport.id), "_blank");
      return;
    }
    const rows = [
      ["IP Address", "Hostname", "MAC Address", "Vendor", "Status", "RTT (ms)"],
      ...(activePayload.devices_detected || []).map((d) => [
        d.ip_address,
        d.hostname,
        d.mac_address,
        d.vendor,
        d.is_online ? "ONLINE" : "OFFLINE",
        String(d.last_rtt_ms ?? ""),
      ]),
    ];
    const csvContent = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NetPulse_Report_${activeReport.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = () => {
    if (!activeReport) return;
    if (apiOnline) {
      window.open(netpulseApi.getReportPdfUrl(activeReport.id), "_blank");
    } else if (typeof window !== "undefined") {
      window.print();
    }
  };

  const detectedDevices = activePayload?.devices_detected || [];
  const pingResults = activePayload?.ping_results || [];
  const secRecs = activePayload?.security_recommendations || [];

  return (
    <div className="space-y-6">
      {/* Feature 4 & Bonus Feature 3 Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-typewriter font-medium mb-1.5">
              <span>FEATURE 4 + BONUS FEATURE 3 · RESULT &amp; REPORT BUILDER</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-semibold text-slate-900 tracking-tight leading-tight">
              Diagnostic Results, Overview &amp; Official PDF Report Exporter
            </h1>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Compiles Date &amp; Time, Devices Detected, Ping Results, Network Performance Summary &amp; Security Recommendations
            </p>
          </div>

          {activeReport && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="px-4 py-2.5 rounded-full hyper-hero-gradient hover:brightness-105 text-white font-heading font-medium text-xs transition-all duration-200 ease-out cursor-pointer"
              >
                Download Official PDF Report
              </button>
              <button
                type="button"
                onClick={handleExportCsvLocal}
                className="px-4 py-2.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-heading font-medium text-xs transition-colors duration-200 cursor-pointer"
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                className="px-4 py-2.5 rounded-full bg-[#141B2D] hover:bg-slate-800 text-white font-heading font-medium text-xs transition-colors duration-200 cursor-pointer"
              >
                {`{ } Export JSON`}
              </button>
            </div>
          )}
        </div>

        {/* Report Generation Bar */}
        <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-wrap sm:flex-nowrap flex-1 items-center gap-2.5">
            <label className="text-xs font-heading font-medium text-slate-500 shrink-0">
              Report Title:
            </label>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="flex-1 bg-[#F8FAFC] border border-slate-200 rounded-full px-4 py-2.5 text-xs font-heading font-medium text-slate-800"
            />
            <button
              type="button"
              disabled={generating}
              onClick={handleGenerateReport}
              className="px-5 py-2.5 rounded-full bg-[#141B2D] hover:bg-slate-800 disabled:opacity-50 text-white font-heading font-semibold text-xs shrink-0 cursor-pointer transition-colors duration-200"
            >
              {generating
                ? "Generating Snapshot..."
                : "Generate New Report Snapshot"}
            </button>
          </div>

          {reports.length > 0 && (
            <select
              aria-label="Report History"
              value={activeReport?.id || ""}
              onChange={(e) => {
                if (e.target.value) loadReportDetail(Number(e.target.value));
              }}
              className="bg-[#F8FAFC] border border-slate-200 rounded-full px-4 py-2.5 text-xs font-typewriter font-medium text-blue-600"
            >
              {reports.map((r) => (
                <option key={r.id} value={r.id}>
                  Report #{r.id} — {new Date(r.created_at).toLocaleTimeString()} ({r.subnet_cidr})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Report Body / Empty State */}
      {!activeReport ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-2">
          <div className="text-base font-extrabold text-slate-900">
            No Diagnostic Reports Compiled Yet
          </div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Click &ldquo;Generate New Report Snapshot&rdquo; to build an executive audit report of discovered hosts, latency metrics, and security recommendations.
          </p>
        </div>
      ) : (
        <>
          {/* Screenshot 2 Right "Result — Overview & History" Visual Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 Cols: Overview Pill Bar Chart (Exact match to Screenshot 2 Right) */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SegmentedPillControl
                  size="sm"
                  options={[
                    { id: "daily", label: "Daily" },
                    { id: "weekly", label: "Weekly" },
                    { id: "monthly", label: "Monthly" },
                    { id: "yearly", label: "Yearly" },
                  ]}
                  value={periodTab}
                  onChange={(v) => setPeriodTab(v)}
                />
                <span className="px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-heading font-medium text-slate-700">
                  ↓ Download &amp; QoS ⌄
                </span>
              </div>

              <div className="pt-1">
                <h2 className="text-xl sm:text-2xl font-heading font-semibold text-slate-900 mb-2">
                  Overview
                </h2>
                <BandwidthThroughputChart data={telemetrySeries} />
              </div>
            </div>

            {/* Right 5 Cols: "History" Key-Value Sheet (Exact match to Screenshot 2 Right bottom sheet) */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto" />
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-heading font-semibold text-slate-900">History</h2>
                <span className="text-xs font-typewriter font-medium text-slate-400">
                  Report #{activeReport.id}
                </span>
              </div>

              <div className="divide-y divide-slate-100 text-xs sm:text-sm">
                <div className="py-3 flex items-center justify-between">
                  <span className="text-slate-400 font-heading font-medium">Ping</span>
                  <span className="font-medium font-typewriter text-slate-900">
                    {activeReport.avg_subnet_latency_ms != null ? `${activeReport.avg_subnet_latency_ms}ms` : "--"}
                  </span>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <span className="text-slate-400 font-heading font-medium">Ip-Address</span>
                  <span className="font-medium font-typewriter text-slate-900">
                    {activeReport.local_ip || "--"}
                  </span>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <span className="text-slate-400 font-heading font-medium">Subnet CIDR</span>
                  <span className="font-medium font-typewriter text-blue-600">
                    {activeReport.subnet_cidr || "--"}
                  </span>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <span className="text-slate-400 font-heading font-medium">Gateway</span>
                  <span className="font-medium font-typewriter text-slate-900">
                    {activeReport.gateway_ip || "--"}
                  </span>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <span className="text-slate-400 font-heading font-medium">Interface</span>
                  <span className="font-medium text-slate-900 font-heading">
                    {activeReport.interface_name || "--"}
                  </span>
                </div>
                <div className="py-3 flex items-center justify-between">
                  <span className="text-slate-400 font-heading font-medium">
                    Security Posture
                  </span>
                  <span className="font-semibold text-emerald-600 font-typewriter">
                    {activeReport.health_score != null
                      ? `${activeReport.health_score}/100 (Grade ${activeReport.security_grade})`
                      : "--"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Full Interactive 4-Section Report Document */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6">
            {/* 1. Date and Time & Interface Metadata */}
            <div className="border-b border-slate-100 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-typewriter font-medium text-blue-600">
                  OFFICIAL DIAGNOSTIC REPORT #{activeReport.id}
                </span>
                <h2 className="text-xl sm:text-2xl font-heading font-semibold text-slate-900 mt-0.5">
                  {activeReport.title}
                </h2>
                <div className="text-xs font-typewriter text-slate-500 mt-1">
                  Date &amp; Time:{" "}
                  {activePayload?.generated_at_readable ||
                    new Date(activeReport.created_at).toUTCString()}{" "}
                  | NIC: {activeReport.interface_name || "--"} | Local IP:{" "}
                  {activeReport.local_ip || "--"} | CIDR: {activeReport.subnet_cidr || "--"}
                </div>
              </div>
              <div className="px-4 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 font-typewriter text-right shrink-0">
                <div className="text-[10px] font-medium text-emerald-700">
                  HEALTH &amp; SECURITY GRADE
                </div>
                <div className="text-xl font-semibold text-emerald-700">
                  {activeReport.health_score != null
                    ? `${activeReport.health_score}/100 (${activeReport.security_grade})`
                    : "--"}
                </div>
              </div>
            </div>

            {/* 2. Network Performance Summary */}
            <div className="space-y-3">
              <h3 className="text-xs font-typewriter font-medium text-blue-600 uppercase tracking-wider">
                Section 1 — Executive Network Performance Summary
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-[#F8FAFC] p-4 rounded-2xl border border-slate-200/80">
                {activeReport.summary_text || "No executive summary available."}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
                <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80">
                  <div className="text-slate-400 font-heading font-medium text-[11px]">
                    DEVICES DETECTED
                  </div>
                  <div className="text-xl sm:text-2xl font-semibold text-slate-900 mt-0.5 font-typewriter">
                    {activeReport.online_devices ?? 0} / {activeReport.total_devices ?? 0} Online
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80">
                  <div className="text-slate-400 font-heading font-medium text-[11px]">
                    AVERAGE LATENCY
                  </div>
                  <div className="text-xl sm:text-2xl font-semibold text-emerald-600 mt-0.5 font-typewriter">
                    {activeReport.avg_subnet_latency_ms != null ? `${activeReport.avg_subnet_latency_ms} ms` : "--"}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80">
                  <div className="text-slate-400 font-heading font-medium text-[11px]">
                    MAXIMUM LATENCY
                  </div>
                  <div className="text-xl sm:text-2xl font-semibold text-amber-600 mt-0.5 font-typewriter">
                    {activeReport.max_subnet_latency_ms != null ? `${activeReport.max_subnet_latency_ms} ms` : "--"}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80">
                  <div className="text-slate-400 font-heading font-medium text-[11px]">
                    PACKET LOSS
                  </div>
                  <div className="text-xl sm:text-2xl font-semibold text-blue-600 mt-0.5 font-typewriter">
                    {activeReport.overall_packet_loss_pct != null ? `${activeReport.overall_packet_loss_pct}%` : "--"}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Devices Detected Table */}
            <div className="space-y-3">
              <h3 className="text-xs font-typewriter font-medium text-blue-600 uppercase tracking-wider">
                Section 2 — Devices Detected ({detectedDevices.length} Hosts)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-typewriter">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-heading font-medium uppercase text-[11px] tracking-wider">
                      <th className="py-2.5 px-2.5">IP Address</th>
                      <th className="py-2.5 px-2.5">Hostname</th>
                      <th className="py-2.5 px-2.5">MAC Address</th>
                      <th className="py-2.5 px-2.5">Vendor (OUI)</th>
                      <th className="py-2.5 px-2.5">Discovery Method</th>
                      <th className="py-2.5 px-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detectedDevices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400 font-sans">
                          No devices recorded in this report.
                        </td>
                      </tr>
                    ) : (
                      detectedDevices.map((d) => (
                        <tr key={d.ip_address} className="hover:bg-slate-50">
                          <td className="py-2.5 px-2.5 text-blue-600 font-medium">
                            {d.ip_address || "--"}
                          </td>
                          <td className="py-2.5 px-2.5 text-slate-900 font-heading font-medium">
                            {d.hostname || "--"}
                          </td>
                          <td className="py-2.5 px-2.5 text-slate-600">
                            {d.mac_address || "--"}
                          </td>
                          <td className="py-2.5 px-2.5 text-slate-700 font-heading font-medium">
                            {d.vendor || "--"}
                          </td>
                          <td className="py-2.5 px-2.5 text-slate-500">
                            {d.discovery_method || "--"}
                          </td>
                          <td className="py-2.5 px-2.5">
                            <span
                              className={
                                d.is_online
                                  ? "text-emerald-600 font-medium"
                                  : "text-rose-600 font-medium"
                              }
                            >
                              ● {d.is_online ? "ONLINE" : "OFFLINE"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Ping Results & Network Statistics Table */}
            <div className="space-y-3">
              <h3 className="text-xs font-typewriter font-medium text-blue-600 uppercase tracking-wider">
                Section 3 — Ping Results &amp; Network QoS Statistics (
                {pingResults.length} Hosts)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-typewriter">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-heading font-medium uppercase text-[11px] tracking-wider">
                      <th className="py-2.5 px-2.5">Hostname</th>
                      <th className="py-2.5 px-2.5">IP Address</th>
                      <th className="py-2.5 px-2.5">Min Latency</th>
                      <th className="py-2.5 px-2.5">Average Latency</th>
                      <th className="py-2.5 px-2.5">Maximum Latency</th>
                      <th className="py-2.5 px-2.5">Jitter</th>
                      <th className="py-2.5 px-2.5">Packet Loss</th>
                      <th className="py-2.5 px-2.5">Signal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pingResults.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-slate-400 font-sans">
                          No QoS telemetry recorded in this report.
                        </td>
                      </tr>
                    ) : (
                      pingResults.map((p) => (
                        <tr key={p.ip_address} className="hover:bg-slate-50">
                          <td className="py-2.5 px-2.5 text-slate-900 font-heading font-medium">
                            {p.hostname || "--"}
                          </td>
                          <td className="py-2.5 px-2.5 text-blue-600 font-medium">
                            {p.ip_address || "--"}
                          </td>
                          <td className="py-2.5 px-2.5 text-slate-600">
                            {p.min_latency_ms != null ? `${p.min_latency_ms} ms` : "--"}
                          </td>
                          <td className="py-2.5 px-2.5 text-emerald-600 font-medium">
                            {p.avg_latency_ms != null ? `${p.avg_latency_ms} ms` : "--"}
                          </td>
                          <td className="py-2.5 px-2.5 text-amber-600 font-medium">
                            {p.max_latency_ms != null ? `${p.max_latency_ms} ms` : "--"}
                          </td>
                          <td className="py-2.5 px-2.5 text-slate-700">
                            {p.jitter_ms != null ? `${p.jitter_ms} ms` : "--"}
                          </td>
                          <td className="py-2.5 px-2.5 font-medium text-slate-800">
                            {p.packet_loss_pct != null ? `${p.packet_loss_pct}%` : "--"}
                          </td>
                          <td className="py-2.5 px-2.5">
                            <SignalStrengthBars
                              rttMs={p.avg_latency_ms}
                              isOnline={p.packet_loss_pct != null ? p.packet_loss_pct < 100 : false}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. Open Ports & Security Recommendations Summary */}
            <div className="space-y-3">
              <h3 className="text-xs font-typewriter font-medium text-blue-600 uppercase tracking-wider">
                Section 4 — Open Ports &amp; Security Recommendations (
                {secRecs.length} Advisories)
              </h3>
              {secRecs.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-[#F8FAFC] rounded-2xl border border-slate-200/80">
                  No active security advisories recorded in this report.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {secRecs.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 text-xs space-y-1.5"
                    >
                      <div className="font-typewriter text-[10px] text-blue-600 font-medium">
                        [{s.severity || "--"} · {s.category || "--"}] Target: {s.target_ip || "--"}
                      </div>
                      <div className="font-heading font-semibold text-slate-900 text-sm">
                        {s.title || "--"}
                      </div>
                      <div className="text-slate-600 leading-relaxed font-sans">
                        {s.recommendation || "--"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
