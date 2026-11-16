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
      .catch(() => { });
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
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-typewriter font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>FEATURE 4 + BONUS 3 · RESULT &amp; REPORT BUILDER</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-semibold text-slate-900 tracking-tight leading-tight">
              Diagnostic Results, Overview &amp; Official PDF Report Exporter
            </h1>
            <p className="text-xs text-slate-500 font-normal">
              Compiles Date &amp; Time, Discovered Hosts, Subnet Ping QoS, Performance Summary &amp; Security Advisories
            </p>
          </div>

          {activeReport && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="px-4 py-2 rounded-full hyper-hero-gradient hover:brightness-105 text-white font-heading font-medium text-xs transition-all duration-200 ease-out cursor-pointer shadow-xs flex items-center gap-2"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Download Official PDF</span>
              </button>
              <button
                type="button"
                onClick={handleExportCsvLocal}
                className="px-3.5 py-2 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-heading font-medium text-xs transition-colors duration-200 cursor-pointer flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
                </svg>
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                className="px-3.5 py-2 rounded-full bg-[#141B2D] hover:bg-slate-800 text-white font-heading font-medium text-xs transition-colors duration-200 cursor-pointer flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
                <span>Export JSON</span>
              </button>
            </div>
          )}
        </div>

        {/* Report Generation Bar */}
        <div className="pt-4 border-t border-slate-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
          <div className="flex flex-1 items-center gap-3">
            <label className="text-xs font-heading font-semibold text-slate-500 shrink-0">
              Report Title:
            </label>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="e.g. Campus Core Subnet Diagnostic"
              className="w-full sm:max-w-md bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-xs font-heading font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
            {reports.length > 0 && (
              <select
                aria-label="Report History"
                value={activeReport?.id || ""}
                onChange={(e) => {
                  if (e.target.value) loadReportDetail(Number(e.target.value));
                }}
                className="bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-xs font-typewriter font-medium text-blue-600 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {reports.map((r) => (
                  <option key={r.id} value={r.id}>
                    Report #{r.id} · {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({r.subnet_cidr})
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              disabled={generating}
              onClick={handleGenerateReport}
              className="px-4 py-2 rounded-full bg-[#141B2D] hover:bg-slate-800 disabled:opacity-50 text-white font-heading font-semibold text-xs shrink-0 cursor-pointer transition-colors duration-200 flex items-center gap-2 shadow-2xs whitespace-nowrap"
            >
              {generating ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  <span>Generating Snapshot...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                  <span>Generate New Report Snapshot</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Report Body / Empty State */}
      {!activeReport ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="text-base font-heading font-semibold text-slate-900">
            No Diagnostic Reports Compiled Yet
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click &ldquo;Generate New Report Snapshot&rdquo; to build an executive audit report of discovered hosts, latency metrics, and security recommendations.
          </p>
        </div>
      ) : (
        <>
          {/* Overview & History Visual Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left 7 Cols: Overview Pill Bar Chart */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-xs">
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
                <span className="px-3 py-1.5 rounded-full bg-slate-100 text-xs font-heading font-medium text-slate-700">
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

            {/* Right 5 Cols: "Snapshot Telemetry" Key-Value Card */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-heading font-semibold text-slate-900">
                    Snapshot Telemetry
                  </h2>
                  <p className="text-xs text-slate-400 font-normal mt-0.5">
                    Subnet metrics at time of report compile
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-typewriter font-semibold bg-blue-50 text-blue-700">
                  Report #{activeReport.id}
                </span>
              </div>

              <div className="divide-y divide-slate-100 text-xs sm:text-sm flex-1 flex flex-col justify-between">
                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="text-slate-500 font-heading font-medium text-xs">Ping (Avg RTT)</span>
                  <span className="px-3 py-0.5 rounded-full text-xs font-typewriter font-semibold bg-slate-100 text-slate-900">
                    {activeReport.avg_subnet_latency_ms != null ? `${activeReport.avg_subnet_latency_ms} ms` : "--"}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="text-slate-500 font-heading font-medium text-xs">IP Address</span>
                  <span className="px-3 py-0.5 rounded-full text-xs font-typewriter font-semibold bg-blue-50 text-blue-700">
                    {activeReport.local_ip || "--"}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="text-slate-500 font-heading font-medium text-xs">Subnet CIDR</span>
                  <span className="px-3 py-0.5 rounded-full text-xs font-typewriter font-semibold bg-blue-50 text-blue-700">
                    {activeReport.subnet_cidr || "--"}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="text-slate-500 font-heading font-medium text-xs">Default Gateway</span>
                  <span className="px-3 py-0.5 rounded-full text-xs font-typewriter font-semibold bg-slate-100 text-slate-800">
                    {activeReport.gateway_ip || "--"}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="text-slate-500 font-heading font-medium text-xs">NIC Interface</span>
                  <span className="px-3 py-0.5 rounded-full text-xs font-heading font-semibold bg-slate-100 text-slate-800">
                    {activeReport.interface_name || "--"}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between gap-2">
                  <span className="text-slate-500 font-heading font-medium text-xs">Security Posture</span>
                  <span className="px-3 py-0.5 rounded-full text-xs font-typewriter font-semibold bg-emerald-50 text-emerald-700">
                    {activeReport.health_score != null
                      ? `${activeReport.health_score}/100 (Grade ${activeReport.security_grade})`
                      : "--"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Full Interactive 4-Section Report Document */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-8 shadow-xs">
            {/* 1. Date and Time & Interface Metadata */}
            <div className="border-b border-slate-100 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-typewriter font-semibold">
                    OFFICIAL DIAGNOSTIC REPORT #{activeReport.id}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-typewriter font-medium">
                    {activeReport.subnet_cidr || "--"}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-heading font-semibold text-slate-900 tracking-tight">
                  {activeReport.title}
                </h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-typewriter text-slate-500">
                  <span>
                    Timestamp:{" "}
                    <strong className="text-slate-700 font-medium">
                      {activePayload?.generated_at_readable || new Date(activeReport.created_at).toUTCString()}
                    </strong>
                  </span>
                  <span>·</span>
                  <span>
                    NIC: <strong className="text-slate-700 font-medium">{activeReport.interface_name || "--"}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    IP: <strong className="text-blue-600 font-medium">{activeReport.local_ip || "--"}</strong>
                  </span>
                </div>
              </div>

              {/* Health Score Card */}
              <div className="px-5 py-3 rounded-2xl bg-emerald-50 font-typewriter text-right shrink-0">
                <div className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                  Health &amp; Security Grade
                </div>
                <div className="text-2xl font-bold text-emerald-800 mt-0.5">
                  {activeReport.health_score != null
                    ? `${activeReport.health_score}/100`
                    : "--"}
                  <span className="text-sm font-medium text-emerald-600 ml-1.5">
                    (Grade {activeReport.security_grade || "--"})
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Network Performance Summary */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-typewriter font-semibold bg-blue-50 text-blue-700 uppercase tracking-wider">
                  Section 1
                </span>
                <h3 className="text-sm font-heading font-semibold text-slate-900">
                  Executive Network Performance Summary
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-100">
                {activeReport.summary_text || "No executive summary available."}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
                <div className="p-4 sm:p-4.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                  <div className="text-slate-400 font-heading font-medium text-[11px] uppercase tracking-wider">
                    DEVICES DETECTED
                  </div>
                  <div className="text-xl sm:text-2xl font-semibold text-slate-900 font-typewriter tracking-tight">
                    {activeReport.online_devices ?? 0} / {activeReport.total_devices ?? 0}
                    <span className="text-xs font-medium text-slate-400 font-sans ml-1.5">Online</span>
                  </div>
                </div>

                <div className="p-4 sm:p-4.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                  <div className="text-slate-400 font-heading font-medium text-[11px] uppercase tracking-wider">
                    AVERAGE LATENCY
                  </div>
                  <div className="text-xl sm:text-2xl font-semibold text-emerald-600 font-typewriter tracking-tight">
                    {activeReport.avg_subnet_latency_ms != null ? `${activeReport.avg_subnet_latency_ms}` : "--"}
                    <span className="text-xs font-medium text-slate-400 font-sans ml-1.5">ms</span>
                  </div>
                </div>

                <div className="p-4 sm:p-4.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                  <div className="text-slate-400 font-heading font-medium text-[11px] uppercase tracking-wider">
                    MAXIMUM LATENCY
                  </div>
                  <div className="text-xl sm:text-2xl font-semibold text-amber-600 font-typewriter tracking-tight">
                    {activeReport.max_subnet_latency_ms != null ? `${activeReport.max_subnet_latency_ms}` : "--"}
                    <span className="text-xs font-medium text-slate-400 font-sans ml-1.5">ms</span>
                  </div>
                </div>

                <div className="p-4 sm:p-4.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                  <div className="text-slate-400 font-heading font-medium text-[11px] uppercase tracking-wider">
                    PACKET LOSS
                  </div>
                  <div className="text-xl sm:text-2xl font-semibold text-blue-600 font-typewriter tracking-tight">
                    {activeReport.overall_packet_loss_pct != null ? `${activeReport.overall_packet_loss_pct}%` : "--"}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Devices Detected Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-typewriter font-semibold bg-blue-50 text-blue-700 uppercase tracking-wider">
                    Section 2
                  </span>
                  <h3 className="text-sm font-heading font-semibold text-slate-900">
                    Devices Detected
                  </h3>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-typewriter font-medium bg-slate-100 text-slate-600">
                  {detectedDevices.length} Hosts Discovered
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200/80 overflow-hidden bg-white shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-typewriter">
                    <thead>
                      <tr className="bg-slate-50/90 border-b border-slate-100 text-slate-500 font-heading font-semibold uppercase text-[11px] tracking-wider">
                        <th className="py-3 px-3.5">IP Address</th>
                        <th className="py-3 px-3.5">Hostname</th>
                        <th className="py-3 px-3.5">MAC Address</th>
                        <th className="py-3 px-3.5">Vendor (OUI)</th>
                        <th className="py-3 px-3.5">Discovery Method</th>
                        <th className="py-3 px-3.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detectedDevices.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                            No devices recorded in this report.
                          </td>
                        </tr>
                      ) : (
                        detectedDevices.map((d) => (
                          <tr key={d.ip_address} className="hover:bg-blue-50/20 transition-colors">
                            <td className="py-3 px-3.5 text-blue-600 font-semibold">
                              {d.ip_address || "--"}
                            </td>
                            <td className="py-3 px-3.5 text-slate-900 font-heading font-medium">
                              {d.hostname || "--"}
                            </td>
                            <td className="py-3 px-3.5 text-slate-600 font-mono text-[11px]">
                              {d.mac_address || "--"}
                            </td>
                            <td className="py-3 px-3.5 text-slate-700 font-heading font-medium">
                              {d.vendor || "--"}
                            </td>
                            <td className="py-3 px-3.5">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-typewriter font-medium bg-slate-100 text-slate-700">
                                {d.discovery_method || "--"}
                              </span>
                            </td>
                            <td className="py-3 px-3.5">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-typewriter font-semibold ${d.is_online
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-rose-50 text-rose-700"
                                  }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${d.is_online ? "bg-emerald-500" : "bg-rose-500"
                                    }`}
                                />
                                {d.is_online ? "ONLINE" : "OFFLINE"}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 4. Ping Results & Network Statistics Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-typewriter font-semibold bg-blue-50 text-blue-700 uppercase tracking-wider">
                    Section 3
                  </span>
                  <h3 className="text-sm font-heading font-semibold text-slate-900">
                    Ping Results &amp; Network QoS Statistics
                  </h3>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-typewriter font-medium bg-slate-100 text-slate-600">
                  {pingResults.length} Hosts Monitored
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200/80 overflow-hidden bg-white shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-typewriter">
                    <thead>
                      <tr className="bg-slate-50/90 border-b border-slate-100 text-slate-500 font-heading font-semibold uppercase text-[11px] tracking-wider">
                        <th className="py-3 px-3.5">Hostname</th>
                        <th className="py-3 px-3.5">IP Address</th>
                        <th className="py-3 px-3.5">Min Latency</th>
                        <th className="py-3 px-3.5">Avg Latency</th>
                        <th className="py-3 px-3.5">Max Latency</th>
                        <th className="py-3 px-3.5">Jitter</th>
                        <th className="py-3 px-3.5">Packet Loss</th>
                        <th className="py-3 px-3.5">Signal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pingResults.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                            No QoS telemetry recorded in this report.
                          </td>
                        </tr>
                      ) : (
                        pingResults.map((p) => (
                          <tr key={p.ip_address} className="hover:bg-blue-50/20 transition-colors">
                            <td className="py-3 px-3.5 text-slate-900 font-heading font-medium">
                              {p.hostname || "--"}
                            </td>
                            <td className="py-3 px-3.5 text-blue-600 font-semibold">
                              {p.ip_address || "--"}
                            </td>
                            <td className="py-3 px-3.5 text-slate-600">
                              {p.min_latency_ms != null ? `${p.min_latency_ms} ms` : "--"}
                            </td>
                            <td className="py-3 px-3.5">
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-typewriter font-semibold text-emerald-700 bg-emerald-50">
                                {p.avg_latency_ms != null ? `${p.avg_latency_ms} ms` : "--"}
                              </span>
                            </td>
                            <td className="py-3 px-3.5">
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-typewriter font-semibold text-amber-700 bg-amber-50">
                                {p.max_latency_ms != null ? `${p.max_latency_ms} ms` : "--"}
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-slate-700">
                              {p.jitter_ms != null ? `${p.jitter_ms} ms` : "--"}
                            </td>
                            <td className="py-3 px-3.5">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-typewriter font-semibold ${p.packet_loss_pct === 0
                                  ? "bg-emerald-50 text-emerald-700"
                                  : p.packet_loss_pct != null && p.packet_loss_pct < 20
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-rose-50 text-rose-700"
                                  }`}
                              >
                                {p.packet_loss_pct != null ? `${p.packet_loss_pct}%` : "--"}
                              </span>
                            </td>
                            <td className="py-3 px-3.5">
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
            </div>

            {/* 5. Open Ports & Security Recommendations Summary */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-typewriter font-semibold bg-blue-50 text-blue-700 uppercase tracking-wider">
                    Section 4
                  </span>
                  <h3 className="text-sm font-heading font-semibold text-slate-900">
                    Open Ports &amp; Security Recommendations
                  </h3>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-typewriter font-medium bg-slate-100 text-slate-600">
                  {secRecs.length} Advisories Logged
                </span>
              </div>

              {secRecs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                  No active security advisories recorded in this report.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {secRecs.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-2.5 hover:border-slate-200 transition-colors"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-typewriter font-bold uppercase tracking-wider ${s.severity === "CRITICAL"
                            ? "bg-rose-50 text-rose-700"
                            : s.severity === "HIGH"
                              ? "bg-amber-50 text-amber-700"
                              : s.severity === "MEDIUM"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                        >
                          {s.severity || "--"}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-typewriter font-medium bg-slate-100 text-slate-600">
                          {s.category || "--"}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-typewriter font-medium text-blue-700 bg-blue-50 ml-auto">
                          Target: {s.target_ip || "--"}
                        </span>
                      </div>
                      <div className="font-heading font-semibold text-slate-900 text-sm">
                        {s.title || "--"}
                      </div>
                      <div className="text-slate-600 leading-relaxed font-sans text-xs">
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
