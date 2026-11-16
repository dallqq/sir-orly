"use client";

import Link from "next/link";
import React from "react";

export interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  badge: string;
  featureTag: string;
  icon: (active: boolean) => React.ReactNode;
}

export const ROUTE_INFO: Record<string, { label: string; sub: string }> = {
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

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Speed & NOC Overview",
    shortLabel: "Overview",
    badge: "LIVE",
    featureTag: "Speedometer & Telemetry",
    icon: () => (
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 2v6h6M8 13h8M8 17h5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export interface SidebarProps {
  pathname: string;
  sidebarCollapsed: boolean;
  onToggleCollapse: () => void;
  apiOnline: boolean;
  internetReachable: boolean;
  onlineCount: number;
  totalDevices: number;
  securityScore: number;
  securityGrade: string;
  monitoringEnabled: boolean;
  onToggleMonitor: () => void;
  dbMode?: string;
  isNpcapInstalled?: boolean;
}

export function Sidebar({
  pathname,
  sidebarCollapsed,
  onToggleCollapse,
  apiOnline,
  internetReachable,
  onlineCount,
  totalDevices,
  securityScore,
  securityGrade,
  monitoringEnabled,
  onToggleMonitor,
  dbMode = "SQLite WAL",
  isNpcapInstalled = false,
}: SidebarProps) {
  return (
    <aside
      aria-label="Application Sidebar"
      className={`noc-sidebar select-none ${
        sidebarCollapsed ? "noc-sidebar-collapsed w-20" : "noc-sidebar-expanded w-72"
      }`}
      style={{
        width: sidebarCollapsed ? "5rem" : "18rem",
        minWidth: sidebarCollapsed ? "5rem" : "18rem",
        height: "100%",
        maxHeight: "100%",
        alignSelf: "flex-start",
        flexShrink: 0,
        backgroundColor: "#ffffff",
        borderRight: "1px solid #e2e8f0",
      }}
    >
      {/* Vertically responsive scrollable container for Navigation and Telemetry Card */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col p-3 gap-2">
        {/* Top Navigation Links Section */}
        <div className="space-y-1">
          {/* Header Row */}
          <div className="flex items-center justify-between px-2 py-1 mb-0.5">
            {!sidebarCollapsed ? (
              <span className="text-[10px] font-heading font-medium uppercase tracking-wider text-slate-400">
                Diagnostic Modules
              </span>
            ) : (
              <span className="w-full text-center text-[10px] font-typewriter font-medium text-slate-400">
                NOC
              </span>
            )}
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              className="hidden lg:flex w-5 h-5 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 items-center justify-center transition-colors cursor-pointer"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <svg
                className={`w-3 h-3 transition-transform duration-200 ${
                  sidebarCollapsed ? "rotate-180" : ""
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* Navigation Items */}
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
                className={`flex items-center rounded-xl transition-all duration-200 ease-out group relative ${
                  sidebarCollapsed
                    ? "justify-center p-2.5"
                    : "justify-between px-3 py-2 text-xs"
                } ${
                  isActive
                    ? "hyper-hero-gradient text-white shadow-xs shadow-blue-500/20"
                    : "text-slate-600 hover:bg-slate-100/90 hover:text-slate-900"
                }`}
              >
                <div className={`flex items-center gap-2.5 min-w-0 ${sidebarCollapsed ? "justify-center" : ""}`}>
                  <span
                    className={`transition-colors shrink-0 ${
                      isActive ? "text-white" : "text-blue-600 group-hover:scale-105"
                    }`}
                  >
                    {item.icon(isActive)}
                  </span>
                  {!sidebarCollapsed && (
                    <div className="truncate">
                      <div className="font-heading font-medium truncate text-xs leading-snug">
                        {item.label}
                      </div>
                      <div
                        className={`text-[10px] truncate leading-tight ${
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
                    className={`font-typewriter text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ml-1.5 ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Tooltip for collapsed mode */}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-[11px] font-medium rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                    {item.label}
                    <span className="ml-1.5 font-typewriter text-[10px] text-blue-300">
                      [{item.badge}]
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Live System Telemetry Section (Footer Card) */}
        {!sidebarCollapsed ? (
          <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-2 text-xs shrink-0 mt-auto">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-heading font-medium uppercase tracking-wider text-slate-400">
                System Telemetry
              </span>
              <span
                className={`text-[9px] font-typewriter font-medium px-1.5 py-0.5 rounded-full ${
                  apiOnline
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {apiOnline ? "CONNECTED" : "SIMULATION"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-typewriter text-[10px]">
              <div className="flex flex-col min-w-0">
                <span className="text-slate-400 text-[9px] leading-tight">WAN</span>
                <span
                  className={`font-medium leading-tight truncate ${
                    internetReachable ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  ● {internetReachable ? "Online" : "LAN"}
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-slate-400 text-[9px] leading-tight">FastAPI</span>
                <span
                  className={`font-medium leading-tight truncate ${
                    apiOnline ? "text-blue-600" : "text-amber-600"
                  }`}
                >
                  ● {apiOnline ? "Port 8000" : "Sim"}
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-slate-400 text-[9px] leading-tight">Database</span>
                <span className="font-medium text-slate-800 leading-tight truncate" title={dbMode}>
                  {dbMode === "CLOUD_POSTGRESQL" ? "Cloud PG" : "SQLite"}
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-slate-400 text-[9px] leading-tight">Packet</span>
                <span className="font-medium text-slate-800 leading-tight truncate">
                  {isNpcapInstalled ? "Npcap L2" : "Scapy"}
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-slate-400 text-[9px] leading-tight">Hosts</span>
                <span className="font-medium text-emerald-600 leading-tight truncate">
                  {onlineCount}/{totalDevices} Up
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-slate-400 text-[9px] leading-tight">Security</span>
                <span className="font-medium text-blue-600 leading-tight truncate">
                  {securityScore}/100 ({securityGrade})
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleMonitor}
              className="w-full py-1.5 px-2 rounded-lg bg-[#141B2D] hover:bg-slate-800 text-center text-[10px] font-heading font-medium text-white transition-colors duration-200 cursor-pointer shadow-2xs"
            >
              Live Stream: {monitoringEnabled ? "ON (2s)" : "PAUSED"}
            </button>
          </div>
        ) : (
          /* Sleek Collapsed Mode Status Indicator */
          <div className="p-2 rounded-xl bg-[#F8FAFC] border border-slate-200 flex flex-col items-center gap-1.5 shrink-0 mt-auto">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                apiOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
              title={`Engine: ${apiOnline ? "Online" : "Simulation"} | ${onlineCount}/${totalDevices} hosts`}
            />
            <button
              type="button"
              onClick={onToggleMonitor}
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-typewriter font-medium transition-colors cursor-pointer ${
                monitoringEnabled
                  ? "bg-blue-600 text-white"
                  : "bg-slate-200 text-slate-600 hover:bg-slate-300"
              }`}
              title={`Telemetry Stream: ${monitoringEnabled ? "Active (2s)" : "Paused"} — Click to toggle`}
            >
              {monitoringEnabled ? "2s" : "II"}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
