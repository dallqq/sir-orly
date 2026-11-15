"use client";

import { ConnectionEdgeCaseBanner } from "@/components/ui/HyperComponents";
import { netpulseApi } from "@/lib/api";
import { useNetPulseStore } from "@/store/useNetPulseStore";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  badge: string;
  featureTag: string;
  icon: (active: boolean) => React.ReactNode;
}

const ROUTE_INFO: Record<string, { label: string; sub: string }> = {
  "/": {
    label: "Speed Test & NOC Overview",
    sub: "Real-Time Speedometer, Data Usage & Subnet Telemetry",
  },
  "/discovery": {
    label: "LAN Discovery & Topology",
    sub: "Feature 1 — Layer 2/3 Subnet Device Cards & Interactive Map",
  },
  "/connectivity": {
    label: "Ping, QoS Stats & Port Scanner",
    sub: "Features 2 & 3 + Bonus Async Socket Port Scanner",
  },
  "/packets": {
    label: "Wireshark Packet Dissector",
    sub: "Course Topic 7 & Bonus .pcap Interoperability",
  },
  "/security": {
    label: "Security Advisor & Alert Center",
    sub: "Feature 5 + Bonus SMTP Email Alerts & Hybrid Cloud DB",
  },
  "/reports": {
    label: "Diagnostic Results & PDF Reports",
    sub: "Feature 4 + Bonus ReportLab Official PDF Exporter",
  },
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Speed & NOC Overview",
    shortLabel: "Overview",
    badge: "LIVE",
    featureTag: "Speedometer & Telemetry",
    icon: () => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/discovery",
    label: "LAN Devices & Map",
    shortLabel: "LAN",
    badge: "F1",
    featureTag: "ARP · Subnet · Topology",
    icon: () => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="8" height="6" rx="1.5" />
        <rect x="14" y="3" width="8" height="6" rx="1.5" />
        <rect x="8" y="15" width="8" height="6" rx="1.5" />
        <path d="M6 9v3h12V9M12 12v3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/connectivity",
    label: "Ping, Stats & Ports",
    shortLabel: "Ping",
    badge: "F2·F3",
    featureTag: "ICMP · QoS · Port Scan",
    icon: () => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 14l4-4 4 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/packets",
    label: "Wireshark Analyzer",
    shortLabel: "Packets",
    badge: "PCAP",
    featureTag: "OSI L2–L7 & .pcap",
    icon: () => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 12h4l3-8 5 16 3-8h5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/security",
    label: "Security & Alerts",
    shortLabel: "Security",
    badge: "F5",
    featureTag: "Rules · Email · Cloud DB",
    icon: () => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/reports",
    label: "Results & PDF Reports",
    shortLabel: "Reports",
    badge: "F4·PDF",
    featureTag: "ReportLab PDF · CSV",
    icon: () => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 2v6h6M8 13h8M8 17h5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    apiOnline,
    wsConnected,
    internetReachable,
    connectionState,
    statusNotice,
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
    dismissNotice,
    postStatusNotice,
  } = useNetPulseStore();

  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const onlineCount = devices.filter((d) => d.is_online).length;

  const handleToggleMonitor = async () => {
    const next = !monitoringEnabled;
    setMonitoringEnabled(next);
    try {
      await netpulseApi.toggleMonitoring(next);
      await refreshAllNetworkData();
      postStatusNotice(
        "info",
        next ? "Real-Time Stream Resumed" : "Real-Time Stream Paused",
        next
          ? "WebSocket telemetry stream is broadcasting at 2-second intervals."
          : "Live telemetry updates paused."
      );
    } catch {
      postStatusNotice(
        "info",
        next ? "Local Stream Active" : "Local Stream Paused",
        "Toggled telemetry stream state."
      );
    }
  };

  const currentRoute =
    ROUTE_INFO[pathname] ||
    ROUTE_INFO["/" + pathname.split("/")[1]] || {
      label: "HyperPulse NOC",
      sub: "Live Network Telemetry & Diagnostics",
    };

  return (
    <div className="min-h-screen bg-[#F3F6FB] text-slate-900 flex flex-col">
      {/* Top Global Telemetry Header Bar */}
      <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-6 flex items-center justify-between gap-3 shadow-[0_2px_15px_rgba(15,23,42,0.03)]">
        {/* Left: Circular Menu Button (matching Screenshot 1 Left) + Brand / Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.innerWidth < 1024) {
                setMobileMenuOpen((o) => !o);
              } else {
                setSidebarCollapsed((c) => !c);
              }
            }}
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 flex items-center justify-center transition border border-slate-200/80 cursor-pointer shrink-0"
            title="Toggle Navigation"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M4 7h16M4 12h12M4 17h16" strokeLinecap="round" />
            </svg>
          </button>

          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl hyper-hero-gradient flex items-center justify-center text-white font-black text-sm shadow-[0_6px_16px_rgba(30,107,255,0.38)] shrink-0">
              H
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-slate-900 text-sm sm:text-base truncate">
                  HyperPulse <span className="text-blue-600">NOC</span>
                </span>
                <span className="hidden sm:inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200/80">
                  CCS 234
                </span>
              </div>
              <div className="text-[11px] text-slate-400 truncate hidden md:block">
                {currentRoute.label}
              </div>
            </div>
          </Link>
        </div>

        {/* Center: Server / NIC & Location Pill Card (matching Screenshot 2 Left "Server: HYPERNET | Location") */}
        <div className="hidden xl:flex items-center gap-4 bg-[#F8FAFC] border border-slate-200/90 rounded-full px-4 py-1.5 text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full hyper-hero-gradient text-white flex items-center justify-center text-[11px] font-bold shadow-xs">
              ⇄
            </span>
            <div>
              <div className="text-[10px] text-slate-400 leading-none">
                Active Interface
              </div>
              <select
                aria-label="Active Network Interface"
                value={activeInterface.interface_name}
                onChange={(e) => selectInterface(e.target.value)}
                className="bg-transparent text-slate-900 font-bold text-xs focus:outline-none cursor-pointer pr-1"
              >
                {interfaces.map((nic) => (
                  <option key={nic.interface_name} value={nic.interface_name}>
                    {nic.interface_name} ({nic.local_ip})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <span className="h-6 w-px bg-slate-200" />

          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-slate-200/80 text-slate-700 flex items-center justify-center text-xs">
              🌐
            </span>
            <div>
              <div className="text-[10px] text-slate-400 leading-none">
                Subnet Range &amp; Gateway
              </div>
              <div className="font-mono font-bold text-slate-800 text-xs mt-0.5">
                {activeInterface.subnet_cidr}{" "}
                <span className="text-slate-400 font-normal">
                  (GW {activeInterface.gateway_ip})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Status Pill + Circular Refresh + Pill CTA Buttons */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F8FAFC] border border-slate-200/90 text-xs font-mono">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                wsConnected
                  ? "bg-emerald-500 animate-pulse"
                  : apiOnline
                  ? "bg-blue-500"
                  : "bg-amber-500"
              }`}
            />
            <span className="font-bold text-slate-700">
              {wsConnected
                ? "LIVE 2s"
                : apiOnline
                ? "API ONLINE"
                : "SIM MODE"}
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-blue-600 font-semibold">↓{rxKbps}</span>
            <span className="text-slate-500">↑{txKbps} kbps</span>
          </div>

          {/* Circular Refresh Button matching Screenshot 1 Right & Screenshot 2 Middle */}
          <button
            type="button"
            onClick={() => refreshAllNetworkData(activeInterface.interface_name, true)}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200/80 flex items-center justify-center transition cursor-pointer"
            title="Refresh & Sync Backend Telemetry"
          >
            ↻
          </button>

          <button
            type="button"
            disabled={isScanning}
            onClick={() => triggerScan("auto")}
            className="px-3.5 py-2 rounded-full hyper-hero-gradient hover:brightness-110 disabled:opacity-50 text-white font-bold text-xs shadow-[0_8px_20px_-6px_rgba(30,107,255,0.55)] transition cursor-pointer"
          >
            {isScanning ? `Scanning ${scanProgressPct}%...` : "⚡ Quick Scan"}
          </button>

          <button
            type="button"
            disabled={isScanning}
            onClick={() => triggerSeedCampusLab()}
            className="hidden md:inline-flex px-3.5 py-2 rounded-full bg-[#141B2D] hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer shadow-xs"
            title="Seed realistic Campus Lab routers, servers, IoT hosts, open ports, and alerts"
          >
            🏫 Campus Lab
          </button>
        </div>
      </header>

      {/* Mobile Drawer Navigation Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-slate-900/40 backdrop-blur-xs flex"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-72 bg-white h-full p-4 flex flex-col justify-between shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-extrabold text-base text-slate-900">
                  HyperPulse <span className="text-blue-600">NOC</span>
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-1.5">
                {NAV_ITEMS.map((item) => {
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition ${
                        isActive
                          ? "hyper-hero-gradient text-white shadow-[0_10px_22px_-6px_rgba(30,107,255,0.45)]"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon(isActive)}
                        <div>
                          <div className="font-bold">{item.label}</div>
                          <div
                            className={`text-[10px] ${
                              isActive ? "text-blue-100" : "text-slate-400"
                            }`}
                          >
                            {item.featureTag}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {item.badge}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="font-bold text-slate-700">Active Interface</div>
              <div className="font-mono text-blue-600 font-bold">
                {activeInterface.interface_name} · {activeInterface.local_ip}
              </div>
              <div className="font-mono text-[11px] text-slate-500">
                CIDR: {activeInterface.subnet_cidr}
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerSeedCampusLab();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2 rounded-full bg-[#141B2D] text-white font-bold text-xs cursor-pointer"
              >
                🏫 Seed Campus Lab Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Split Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Collapsible Sidebar */}
        <aside
          className={`hidden lg:flex ${
            sidebarCollapsed ? "w-20" : "w-72"
          } transition-all duration-300 bg-white border-r border-slate-200/80 flex-col justify-between shrink-0`}
        >
          <div className="p-3.5 space-y-1.5">
            {!sidebarCollapsed && (
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Diagnostic Modules
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
                  title={item.label}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs transition-all duration-200 ${
                    isActive
                      ? "hyper-hero-gradient text-white shadow-[0_12px_24px_-8px_rgba(21,94,239,0.5)]"
                      : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`shrink-0 ${
                        isActive ? "text-white" : "text-blue-600"
                      }`}
                    >
                      {item.icon(isActive)}
                    </span>
                    {!sidebarCollapsed && (
                      <div className="truncate">
                        <div className="font-bold truncate text-[13px]">
                          {item.label}
                        </div>
                        <div
                          className={`text-[11px] truncate mt-0.5 ${
                            isActive ? "text-blue-100" : "text-slate-400"
                          }`}
                        >
                          {item.featureTag}
                        </div>
                      </div>
                    )}
                  </div>
                  {!sidebarCollapsed && (
                    <span
                      className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Live Environment & Edge-Case Capability Card (Sidebar Footer) */}
          {!sidebarCollapsed && (
            <div className="p-4 m-3.5 rounded-3xl bg-[#F8FAFC] border border-slate-200/90 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  System Telemetry
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    apiOnline
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {apiOnline ? "CONNECTED" : "SIMULATION"}
                </span>
              </div>

              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Internet / WAN:</span>
                  <span
                    className={`font-bold ${
                      internetReachable ? "text-emerald-600" : "text-amber-600"
                    }`}
                  >
                    ● {internetReachable ? "Online" : "LAN / Offline"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">FastAPI Engine:</span>
                  <span
                    className={`font-bold ${
                      apiOnline ? "text-blue-600" : "text-amber-600"
                    }`}
                  >
                    ● {apiOnline ? "Port 8000" : "Local Sim"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Database:</span>
                  <span className="font-bold text-slate-800">
                    {health?.database?.mode === "CLOUD_POSTGRESQL"
                      ? "Cloud PG"
                      : "SQLite WAL"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Packet Engine:</span>
                  <span className="font-bold text-slate-800">
                    {health?.packet_engine?.npcap_installed
                      ? "Npcap L2"
                      : "Scapy L3/L4"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Active Hosts:</span>
                  <span className="font-bold text-emerald-600">
                    {onlineCount} / {devices.length} Online
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Security Grade:</span>
                  <span className="font-bold text-blue-600">
                    {securityScore}/100 ({securityGrade})
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleMonitor}
                className="w-full mt-1 py-2 px-3 rounded-full bg-[#141B2D] hover:bg-slate-800 text-center text-[11px] font-bold text-white transition cursor-pointer"
              >
                Live Stream: {monitoringEnabled ? "ON (2s Interval)" : "PAUSED"}
              </button>
            </div>
          )}
        </aside>

        {/* Page Content Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-28 lg:pb-10 space-y-6 max-w-[1600px] mx-auto w-full">
          {/* Global Edge-Case & Connection State Banner */}
          <ConnectionEdgeCaseBanner
            connectionState={connectionState}
            apiOnline={apiOnline}
            wsConnected={wsConnected}
            internetReachable={internetReachable}
            activeInterfaceName={activeInterface.interface_name}
            localIp={activeInterface.local_ip}
            subnetCidr={activeInterface.subnet_cidr}
            statusNotice={statusNotice}
            onRetryConnection={() =>
              refreshAllNetworkData(activeInterface.interface_name, true)
            }
            onSeedSimulation={() => triggerSeedCampusLab()}
            onDismissNotice={dismissNotice}
          />

          {children}
        </main>
      </div>

      {/* Signature Mobile/Tablet Floating Dark Navy Pill Dock (matching Screenshot 1 Bottom Navigation!) */}
      <nav
        aria-label="Mobile Bottom Dock"
        className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-[#141B2D]/95 backdrop-blur-md border border-slate-800 rounded-full px-3 py-2 shadow-[0_18px_38px_rgba(15,23,42,0.42)] flex items-center gap-2"
      >
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${
                isActive
                  ? "hyper-hero-gradient text-white shadow-[0_6px_16px_rgba(30,107,255,0.65)] scale-105"
                  : "text-slate-400 hover:text-white bg-white/5"
              }`}
            >
              {item.icon(isActive)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
