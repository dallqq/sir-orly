"use client";

import { ConnectionEdgeCaseBanner } from "@/components/ui/HyperComponents";
import { useNetPulseStore } from "@/store/useNetPulseStore";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { NAV_ITEMS, ROUTE_INFO } from "./Sidebar";

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
    txKbps,
    rxKbps,
    selectInterface,
    triggerScan,
    refreshAllNetworkData,
    dismissNotice,
  } = useNetPulseStore();

  const currentRoute =
    ROUTE_INFO[pathname] ||
    ROUTE_INFO["/" + pathname.split("/")[1]] || {
      label: "NetPulse NOC",
      sub: "Live Network Telemetry & Diagnostics",
    };

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAllNetworkData(activeInterface.interface_name, true);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <div
      className="noc-app-shell text-slate-900"
      style={{
        height: "100dvh",
        maxHeight: "100dvh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#F3F6FB",
      }}
    >
      {/* Top Global Telemetry Header Bar */}
      <header
        className="noc-header bg-white/95 backdrop-blur-md border-b border-slate-200/80 w-full"
        style={{ height: "4rem", flexShrink: 0 }}
      >
        <div className="noc-container h-full flex items-center justify-between gap-4">
          {/* Left: Brand Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/" className="flex items-center gap-3 group select-none">
              <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center text-white shrink-0 shadow-xs group-hover:scale-105 transition-all duration-200">
                <svg
                  className="w-5 h-5 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 12h3l2-4 3 8 3-6 2 3h4l2-2 3 3" />
                </svg>
              </div>
              <div className="flex flex-col justify-center">
                <span className="font-heading font-bold tracking-tight text-slate-900 text-sm sm:text-base leading-none">
                  NetPulse
                </span>
                <div className="text-[11px] font-heading font-medium text-slate-400 mt-1 leading-none hidden md:block">
                  {currentRoute.label}
                </div>
              </div>
            </Link>
          </div>

          {/* Center: Sleek Unified Network Context Pill */}
          <div className="hidden lg:flex items-center gap-2.5 bg-slate-50/90 hover:bg-slate-50 border border-slate-200/90 rounded-full h-9 px-3.5 text-xs shadow-2xs transition-colors">
            {/* NIC Selector */}
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                <svg
                  className="w-3 h-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
                </svg>
              </span>
              <div className="relative flex items-center">
                <select
                  aria-label="Active Network Interface"
                  value={activeInterface.interface_name}
                  onChange={(e) => selectInterface(e.target.value)}
                  className="appearance-none bg-transparent text-slate-800 font-mono font-semibold text-xs pr-4 focus:outline-none cursor-pointer hover:text-blue-600 transition-colors"
                >
                  {interfaces.map((nic) => (
                    <option key={nic.interface_name} value={nic.interface_name} className="font-mono text-xs">
                      {nic.interface_name} · {nic.local_ip}
                    </option>
                  ))}
                </select>
                <svg
                  className="w-2.5 h-2.5 text-slate-400 pointer-events-none absolute right-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>

            {/* Divider */}
            <span className="h-3.5 w-px bg-slate-200" />

            {/* Subnet CIDR & Gateway */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <svg
                  className="w-3 h-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </span>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                {activeInterface.subnet_cidr && activeInterface.subnet_cidr !== "--" ? (
                  <>
                    <span className="font-semibold text-slate-800">{activeInterface.subnet_cidr}</span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      gw {activeInterface.gateway_ip}
                    </span>
                  </>
                ) : (
                  <span className="text-slate-400">--</span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Live Telemetry Hub + Circular Refresh + Quick Scan CTA */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Live Telemetry Pill */}
            <div className="hidden sm:flex items-center gap-2.5 px-3 rounded-full bg-slate-50/90 border border-slate-200/90 text-xs font-mono h-9 shadow-2xs">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  {wsConnected && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${wsConnected
                      ? "bg-emerald-500"
                      : apiOnline
                        ? "bg-blue-500"
                        : "bg-slate-400"
                      }`}
                  />
                </span>
                <span className="font-semibold text-[11px] text-slate-700 tracking-tight">
                  {wsConnected
                    ? "LIVE 2s"
                    : apiOnline
                      ? "API ONLINE"
                      : "OFFLINE"}
                </span>
              </div>

              <span className="h-3 w-px bg-slate-200" />

              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-blue-600 font-medium flex items-center gap-0.5" title="Inbound Rx Throughput">
                  <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M19 12l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{rxKbps > 0 ? rxKbps.toLocaleString() : "--"}</span>
                  <span className="text-[9px] text-slate-400 font-normal">kbps</span>
                </span>
                <span className="text-slate-500 font-medium flex items-center gap-0.5" title="Outbound Tx Throughput">
                  <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{txKbps > 0 ? txKbps.toLocaleString() : "--"}</span>
                  <span className="text-[9px] text-slate-400 font-normal">kbps</span>
                </span>
              </div>
            </div>

            {/* Circular Refresh Button with Smooth Click Rotation */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-9 h-9 rounded-full bg-white hover:bg-slate-50 active:scale-95 text-slate-600 hover:text-blue-600 border border-slate-200/90 flex items-center justify-center transition-all duration-200 ease-out cursor-pointer shadow-2xs group shrink-0"
              title="Refresh & Sync Backend Telemetry"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-500 ease-out ${isRefreshing ? "animate-spin text-blue-600" : "group-hover:rotate-180"
                  }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
            </button>

            {/* Quick Scan Primary CTA */}
            <button
              type="button"
              disabled={isScanning}
              onClick={() => triggerScan("auto")}
              className="h-9 px-4 rounded-full hyper-hero-gradient hover:brightness-105 active:scale-95 disabled:opacity-50 text-white font-heading font-semibold text-xs flex items-center gap-2 shadow-xs shadow-blue-500/20 transition-all duration-200 ease-out cursor-pointer shrink-0"
            >
              <svg
                className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a10 10 0 0 1 10 10" />
                <path d="m12 12 5-5" />
              </svg>
              <span>{isScanning ? `Scanning ${scanProgressPct}%` : "Quick Scan"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace (Aligned with Nav Bar, Compressed to Center with Generous Padding) */}
      <main
        className="flex-1 w-full overflow-y-auto custom-scrollbar"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          width: "100%",
        }}
      >
        <div className="noc-container pt-4 sm:pt-5 pb-28 space-y-6">
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
            onDismissNotice={dismissNotice}
          />

          {children}
        </div>
      </main>

      {/* Floating Bottom Navigation Dock (No Underlying Full-Width Container) */}
      <aside
        aria-label="Bottom Navigation Dock"
        style={{
          position: "fixed",
          bottom: "1.5rem",
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          pointerEvents: "none",
          zIndex: 40,
        }}
      >
        <nav
          aria-label="Navigation Dock"
          className="noc-pill-dock shadow-2xl"
          style={{
            pointerEvents: "auto",
          }}
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
                aria-label={item.label}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ease-out ${isActive
                  ? "hyper-hero-gradient text-white scale-105 shadow-md shadow-blue-500/25"
                  : "text-slate-400 hover:text-white bg-white/5 hover:bg-white/10"
                  }`}
              >
                {item.icon(isActive)}
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
