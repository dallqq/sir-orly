"use client";

import { netpulseApi } from "@/lib/api";
import { useNetPulseStore } from "@/store/useNetPulseStore";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  badge: string;
  featureTag: string;
}

const ROUTE_INFO: Record<string, { label: string; sub: string }> = {
  "/": {
    label: "NOC Overview Dashboard",
    sub: "Real-Time Telemetry & Metric Highlights",
  },
  "/discovery": {
    label: "Network Discovery & Interactive Topology",
    sub: "Feature 1 — Layer 2/3 Subnet Enumeration & Map",
  },
  "/connectivity": {
    label: "Connectivity Testing, Statistics & Port Scanner",
    sub: "Features 2 & 3 + Bonus Socket Scanner",
  },
  "/packets": {
    label: "Wireshark Packet Analyzer",
    sub: "Course Topic 7 & Bonus .pcap Interoperability",
  },
  "/security": {
    label: "Security Advisor & Alert Center",
    sub: "Feature 5 + Bonus Email Alerts & Cloud DB",
  },
  "/reports": {
    label: "Diagnostic Report Center",
    sub: "Feature 4 + Bonus ReportLab PDF Generator",
  },
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "NOC Overview",
    badge: "LIVE",
    featureTag: "Dashboard & Charts",
  },
  {
    href: "/discovery",
    label: "Network Discovery",
    badge: "F1",
    featureTag: "ARP / Subnet / Topology",
  },
  {
    href: "/connectivity",
    label: "Ping, Stats & Ports",
    badge: "F2·F3",
    featureTag: "ICMP / QoS / Port Scan",
  },
  {
    href: "/packets",
    label: "Wireshark Analyzer",
    badge: "PCAP",
    featureTag: "OSI L2–L7 & .pcap",
  },
  {
    href: "/security",
    label: "Security & Alerts",
    badge: "F5",
    featureTag: "Rules / Email / Cloud DB",
  },
  {
    href: "/reports",
    label: "Diagnostic Reports",
    badge: "F4·PDF",
    featureTag: "ReportLab PDF / CSV",
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    apiOnline,
    wsConnected,
    isScanning,
    scanProgressPct,
    activeInterface,
    interfaces,
    devices,
    securityScore,
    securityGrade,
    txKbps,
    rxKbps,
    health,
    selectInterface,
    triggerScan,
    triggerSeedCampusLab,
    refreshAllNetworkData,
  } = useNetPulseStore();

  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const onlineCount = devices.filter((d) => d.is_online).length;

  const handleToggleMonitor = async () => {
    const next = !monitoringEnabled;
    setMonitoringEnabled(next);
    try {
      await netpulseApi.toggleMonitoring(next);
      await refreshAllNetworkData();
    } catch {
      // ignore if offline
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col">
      {/* Top Global Telemetry Bar */}
      <header className="sticky top-0 z-30 h-14 bg-[#0F172A]/95 backdrop-blur border-b border-slate-800 px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="px-2.5 py-1.5 rounded bg-slate-800/80 hover:bg-slate-700 text-cyan-400 text-xs font-mono border border-slate-700"
            title="Toggle Sidebar"
          >
            {sidebarCollapsed ? "☰" : "◁"}
          </button>
          <Link href="/" className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#06b6d4]" />
            <div>
              <span className="font-bold tracking-tight text-slate-100 text-sm md:text-base">
                NetPulse <span className="text-cyan-400">NOC</span>
              </span>
              <span className="hidden lg:inline-block ml-2 text-[11px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                CCS 234 TELEMETRY ENGINE
              </span>
            </div>
          </Link>
        </div>

        {/* Center Active Interface & Subnet Range Strip (Feature 1 Always Visible) */}
        <div className="hidden xl:flex items-center gap-3 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-1.5 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">NIC:</span>
            <select
              aria-label="Active Network Interface"
              value={activeInterface.interface_name}
              onChange={(e) => selectInterface(e.target.value)}
              className="bg-slate-900 text-cyan-300 font-mono text-xs rounded px-2 py-0.5 border border-slate-700 focus:outline-none focus:border-cyan-500"
            >
              {interfaces.map((nic) => (
                <option key={nic.interface_name} value={nic.interface_name}>
                  {nic.interface_name} ({nic.local_ip})
                </option>
              ))}
            </select>
          </div>
          <span className="text-slate-700">|</span>
          <div>
            <span className="text-slate-400">Local IP: </span>
            <span className="font-mono text-emerald-400 font-semibold">
              {activeInterface.local_ip}
            </span>
          </div>
          <span className="text-slate-700">|</span>
          <div>
            <span className="text-slate-400">Range: </span>
            <span className="font-mono text-cyan-300">
              {activeInterface.subnet_cidr}
            </span>
          </div>
          <span className="text-slate-700">|</span>
          <div>
            <span className="text-slate-400">GW: </span>
            <span className="font-mono text-slate-200">
              {activeInterface.gateway_ip}
            </span>
          </div>
        </div>

        {/* Right Quick Action & Live Telemetry Badges */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-mono">
            <span
              className={`h-2 w-2 rounded-full ${
                wsConnected
                  ? "bg-emerald-400 animate-pulse"
                  : apiOnline
                  ? "bg-cyan-400"
                  : "bg-amber-400"
              }`}
            />
            <span className="text-slate-300">
              {wsConnected ? "WS LIVE" : apiOnline ? "API READY" : "OFFLINE DEMO"}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-cyan-400">↑{txKbps}</span>
            <span className="text-emerald-400">↓{rxKbps} kbps</span>
          </div>

          <button
            type="button"
            disabled={isScanning}
            onClick={() => triggerScan("auto")}
            className="px-3 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold text-xs transition cursor-pointer"
          >
            {isScanning ? `Scanning ${scanProgressPct}%...` : "⚡ Quick Scan"}
          </button>

          <button
            type="button"
            disabled={isScanning}
            onClick={() => triggerSeedCampusLab()}
            className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-cyan-500/40 text-cyan-300 font-semibold text-xs transition cursor-pointer"
            title="Populate realistic Campus Lab routers, servers, IoT hosts, open ports, and alerts for classroom defense"
          >
            🏫 Seed Campus Lab
          </button>
        </div>
      </header>

      {/* Main Split Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Collapsible Sidebar (`shadcn-admin` pattern) */}
        <aside
          className={`${
            sidebarCollapsed ? "w-16" : "w-64"
          } transition-all duration-200 bg-[#0F172A] border-r border-slate-800 flex flex-col justify-between shrink-0`}
        >
          <div className="p-3 space-y-1">
            {!sidebarCollapsed && (
              <div className="px-2 py-1.5 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                NOC / SOC Modules
              </div>
            )}
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm"
                      : "text-slate-300 hover:bg-slate-800/70 hover:text-white border border-transparent"
                  }`}
                >
                  <div className="truncate">
                    <div className="font-semibold truncate">{item.label}</div>
                    {!sidebarCollapsed && (
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {item.featureTag}
                      </div>
                    )}
                  </div>
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                      isActive
                        ? "bg-cyan-400 text-slate-950 font-bold"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {item.badge}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Live Environment Capability Badges (Sidebar Footer) */}
          {!sidebarCollapsed && (
            <div className="p-3 m-3 rounded-lg bg-slate-950/90 border border-slate-800 space-y-2 text-[11px] font-mono">
              <div className="text-slate-400 uppercase tracking-wider font-semibold">
                System Capability Status
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Python Engine:</span>
                <span className={apiOnline ? "text-emerald-400" : "text-amber-400"}>
                  ● {apiOnline ? "Online (8000)" : "Standby"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Database:</span>
                <span className="text-cyan-300">
                  ●{" "}
                  {health?.database?.mode === "CLOUD_POSTGRESQL"
                    ? "Cloud PG"
                    : "SQLite WAL"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Packet Engine:</span>
                <span className="text-purple-300">
                  ● {health?.packet_engine?.npcap_installed ? "Npcap L2" : "Scapy L3/L4"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Active Hosts:</span>
                <span className="text-emerald-400">
                  {onlineCount} / {devices.length} Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Security Grade:</span>
                <span className="text-cyan-300 font-bold">
                  {securityScore}/100 ({securityGrade})
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleMonitor}
                className="w-full mt-1 py-1 px-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-center text-xs text-slate-200 cursor-pointer"
              >
                Real-Time Stream: {monitoringEnabled ? "ON (2s)" : "PAUSED"}
              </button>
            </div>
          )}
        </aside>

        {/* Page Content Container */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Breadcrumb Navigation Bar (`shadcn-admin` specification) */}
          {(() => {
            const currentRoute =
              ROUTE_INFO[pathname] ||
              ROUTE_INFO["/" + pathname.split("/")[1]] || {
                label: "Network Operations Center",
                sub: "Live Network Telemetry & Diagnostics",
              };
            return (
              <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800/80 text-xs font-mono gap-2">
                <div className="flex items-center gap-2 text-slate-400">
                  <Link
                    href="/"
                    className="hover:text-cyan-400 transition font-bold text-slate-300"
                  >
                    NetPulse NOC
                  </Link>
                  <span className="text-slate-600">/</span>
                  <span className="text-cyan-300 font-semibold">
                    {currentRoute.label}
                  </span>
                </div>
                <div className="text-slate-400 text-[11px] font-mono">
                  {currentRoute.sub}
                </div>
              </div>
            );
          })()}
          {children}
        </main>
      </div>
    </div>
  );
}

