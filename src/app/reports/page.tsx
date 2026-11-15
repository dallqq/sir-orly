"use client";

import {
  DiagnosticReportMeta,
  DiscoveredDevice,
  HostQoSStats,
  SecurityAlert,
  netpulseApi,
} from "@/lib/api";
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
  const [reports, setReports] = useState<DiagnosticReportMeta[]>([]);
  const [activeReport, setActiveReport] = useState<DiagnosticReportMeta | null>(null);
  const [activePayload, setActivePayload] = useState<ReportPayload | null>(null);
  const [reportTitle, setReportTitle] = useState<string>(
    "NetPulse NOC — Official Network Diagnostic & Performance Audit"
  );
  const [generating, setGenerating] = useState<boolean>(false);

  const loadReportDetail = useCallback(async (id: number) => {
    try {
      const res = await netpulseApi.getReportDetail(id);
      setActiveReport(res.report);
      setActivePayload(res.payload as ReportPayload);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let active = true;
    netpulseApi
      .getReports()
      .then((res) => {
        if (!active) return;
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

  const detectedDevices = activePayload?.devices_detected || [];
  const pingResults = activePayload?.ping_results || [];
  const secRecs = activePayload?.security_recommendations || [];

  return (
    <div className="space-y-6">
      {/* Feature 4 & Bonus Feature 3 Header */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
              FEATURE 4 + BONUS FEATURE 3 — NETWORK REPORT GENERATOR &amp; REPORTLAB PDF EXPORT
            </div>
            <h1 className="text-xl font-bold text-white mt-0.5">
              Diagnostic Report Builder &amp; One-Click Official PDF / CSV / JSON Exporter
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Compiles Date &amp; Time, Devices Detected, Ping Results, Network Performance Summary, and Security Recommendations.
            </p>
          </div>

          {activeReport && (
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={netpulseApi.getReportPdfUrl(activeReport.id)}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono"
              >
                📄 Download Official PDF Report
              </a>
              <a
                href={netpulseApi.getReportCsvUrl(activeReport.id)}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 font-mono text-xs font-bold"
              >
                📊 Export CSV
              </a>
              <button
                type="button"
                onClick={handleExportJson}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-purple-300 font-mono text-xs font-bold cursor-pointer"
              >
                {`{ } Export JSON`}
              </button>
            </div>
          )}
        </div>

        {/* Report Generation Bar */}
        <div className="pt-3 border-t border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2">
            <label className="text-xs font-mono text-slate-400 shrink-0">Report Title:</label>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white"
            />
            <button
              type="button"
              disabled={generating}
              onClick={handleGenerateReport}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs font-mono shrink-0 cursor-pointer"
            >
              {generating ? "Generating Snapshot & PDF..." : "⚡ Generate Full Diagnostic Report"}
            </button>
          </div>

          {reports.length > 0 && (
            <select
              aria-label="Report History"
              value={activeReport?.id || ""}
              onChange={(e) => {
                if (e.target.value) loadReportDetail(Number(e.target.value));
              }}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300"
            >
              {reports.map((r) => (
                <option key={r.id} value={r.id}>
                  Report #{r.id} — {new Date(r.created_at).toLocaleString()} ({r.subnet_cidr})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Interactive Report Preview (Contains all 4 required Feature 4 sections) */}
      {!activeReport ? (
        <div className="bg-[#0F172A] border border-dashed border-slate-800 rounded-xl p-10 text-center space-y-3">
          <div className="text-base font-bold text-white">
            Ready to Generate Diagnostic Report Snapshot
          </div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Click &ldquo;Generate Full Diagnostic Report&rdquo; above to compile all discovered devices, ping statistics, and security recommendations into a styled ReportLab PDF.
          </p>
          <button
            type="button"
            onClick={handleGenerateReport}
            className="px-5 py-2.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs font-mono cursor-pointer"
          >
            ⚡ Generate First Diagnostic Report
          </button>
        </div>
      ) : (
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-6 space-y-6">
          {/* 1. Date and Time & Interface Metadata */}
          <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-mono text-cyan-400">
                OFFICIAL DIAGNOSTIC REPORT #{activeReport.id}
              </span>
              <h2 className="text-lg font-bold text-white">{activeReport.title}</h2>
              <div className="text-xs font-mono text-slate-400 mt-1">
                Date &amp; Time: {activePayload?.generated_at_readable || new Date(activeReport.created_at).toUTCString()} | Interface: {activeReport.interface_name} | Local IP: {activeReport.local_ip} | CIDR: {activeReport.subnet_cidr}
              </div>
            </div>
            <div className="px-4 py-2 rounded-lg bg-slate-950 border border-slate-800 font-mono text-right">
              <div className="text-[10px] text-slate-400">HEALTH &amp; SECURITY GRADE</div>
              <div className="text-lg font-bold text-emerald-400">
                {activeReport.health_score}/100 ({activeReport.security_grade})
              </div>
            </div>
          </div>

          {/* 2. Network Performance Summary */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-cyan-400 font-mono uppercase">
              Section 1 — Executive Network Performance Summary
            </h3>
            <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/90 p-4 rounded-lg border border-slate-800">
              {activeReport.summary_text}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-400 text-[11px]">DEVICES DETECTED</div>
                <div className="text-base font-bold text-white mt-0.5">
                  {activeReport.online_devices} / {activeReport.total_devices} Online
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-400 text-[11px]">AVERAGE LATENCY</div>
                <div className="text-base font-bold text-emerald-400 mt-0.5">
                  {activeReport.avg_subnet_latency_ms} ms
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-400 text-[11px]">MAXIMUM LATENCY</div>
                <div className="text-base font-bold text-amber-300 mt-0.5">
                  {activeReport.max_subnet_latency_ms} ms
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-slate-400 text-[11px]">PACKET LOSS</div>
                <div className="text-base font-bold text-cyan-300 mt-0.5">
                  {activeReport.overall_packet_loss_pct}%
                </div>
              </div>
            </div>
          </div>

          {/* 3. Devices Detected Table */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-cyan-400 font-mono uppercase">
              Section 2 — Devices Detected ({detectedDevices.length} Hosts)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                    <th className="py-2 px-2">IP Address</th>
                    <th className="py-2 px-2">Hostname</th>
                    <th className="py-2 px-2">MAC Address</th>
                    <th className="py-2 px-2">Vendor (OUI)</th>
                    <th className="py-2 px-2">Discovery Method</th>
                    <th className="py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {detectedDevices.map((d) => (
                    <tr key={d.ip_address}>
                      <td className="py-2 px-2 text-cyan-300 font-bold">{d.ip_address}</td>
                      <td className="py-2 px-2 text-slate-200 font-sans">{d.hostname}</td>
                      <td className="py-2 px-2 text-purple-300">{d.mac_address}</td>
                      <td className="py-2 px-2 text-slate-300 font-sans">{d.vendor}</td>
                      <td className="py-2 px-2 text-slate-400">{d.discovery_method}</td>
                      <td className="py-2 px-2">
                        <span
                          className={
                            d.is_online ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"
                          }
                        >
                          {d.is_online ? "ONLINE" : "OFFLINE"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Ping Results & Network Statistics Table */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-cyan-400 font-mono uppercase">
              Section 3 — Ping Results &amp; Network QoS Statistics ({pingResults.length} Hosts)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                    <th className="py-2 px-2">Hostname</th>
                    <th className="py-2 px-2">IP Address</th>
                    <th className="py-2 px-2">Min Latency</th>
                    <th className="py-2 px-2">Average Latency</th>
                    <th className="py-2 px-2">Maximum Latency</th>
                    <th className="py-2 px-2">Jitter</th>
                    <th className="py-2 px-2">Packet Loss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {pingResults.map((p) => (
                    <tr key={p.ip_address}>
                      <td className="py-2 px-2 text-slate-200 font-sans">{p.hostname}</td>
                      <td className="py-2 px-2 text-cyan-300 font-bold">{p.ip_address}</td>
                      <td className="py-2 px-2 text-slate-300">{p.min_latency_ms} ms</td>
                      <td className="py-2 px-2 text-emerald-400 font-bold">{p.avg_latency_ms} ms</td>
                      <td className="py-2 px-2 text-amber-300 font-bold">{p.max_latency_ms} ms</td>
                      <td className="py-2 px-2 text-purple-300">{p.jitter_ms} ms</td>
                      <td className="py-2 px-2 text-slate-200">{p.packet_loss_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Open Ports & Security Recommendations Summary */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-cyan-400 font-mono uppercase">
              Section 4 — Open Ports &amp; Security Recommendations ({secRecs.length} Advisories)
            </h3>

            {/* Open Ports Quick Summary if detected hosts have open ports */}
            {detectedDevices.some((d) => d.open_ports_summary) && (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5 text-xs font-mono">
                <div className="text-amber-300 font-bold text-[11px] uppercase tracking-wider">
                  Audited Open Network Service Ports:
                </div>
                <div className="flex flex-wrap gap-2">
                  {detectedDevices
                    .filter((d) => d.open_ports_summary)
                    .map((d) => (
                      <span
                        key={d.ip_address}
                        className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200"
                      >
                        <span className="text-cyan-300 font-bold">{d.ip_address}</span>:{" "}
                        <span className="text-amber-300">{d.open_ports_summary}</span>
                      </span>
                    ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {secRecs.map((s, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1"
                >
                  <div className="font-mono text-[10px] text-cyan-300 font-bold">
                    [{s.severity} · {s.category}] Target: {s.target_ip}
                  </div>
                  <div className="font-bold text-white">{s.title}</div>
                  <div className="text-slate-400">{s.recommendation}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
