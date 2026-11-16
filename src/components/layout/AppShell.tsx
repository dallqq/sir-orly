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
    triggerSeedCampusLab,
    refreshAllNetworkData,
    dismissNotice,
  } = useNetPulseStore();

  const currentRoute =
    ROUTE_INFO[pathname] ||
    ROUTE_INFO["/" + pathname.split("/")[1]] || {
      label: "HyperPulse NOC",
      sub: "Live Network Telemetry & Diagnostics",
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
        className="noc-header bg-white/95 backdrop-blur-md border-b border-slate-200 w-full"
        style={{ height: "4rem", flexShrink: 0 }}
      >
        <div className="noc-container h-full flex items-center justify-between gap-4">
          {/* Left: Brand / Page Title (retaining logo branding only) */}
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-3 min-w-0 group">
              <div className="w-9 h-9 rounded-full hyper-hero-gradient flex items-center justify-center text-white font-heading font-bold text-sm shrink-0 shadow-xs shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
                H
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold tracking-tight text-slate-900 text-sm sm:text-base truncate leading-none">
                    HyperPulse <span className="text-blue-600">NOC</span>
                  </span>
                  <span className="hidden sm:inline-block text-[10px] font-typewriter font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200/90 leading-none">
                    CCS 234
                  </span>
                </div>
                <div className="text-[11px] font-heading font-medium text-slate-400 truncate mt-1 leading-none hidden md:block">
                  {currentRoute.label}
                </div>
              </div>
            </Link>
          </div>

          {/* Center: Server / NIC & Location Pill Card (matching Screenshot 2 Left "Server: HYPERNET | Location") */}
          <div className="hidden lg:flex items-center gap-4 bg-[#F8FAFC] border border-slate-200 rounded-full px-4 py-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full hyper-hero-gradient text-white flex items-center justify-center text-[11px] font-semibold">
                ⇄
              </span>
              <div>
                <div className="text-[9px] font-heading font-medium uppercase tracking-wider text-slate-400 leading-none">
                  Active Interface
                </div>
                <select
                  aria-label="Active Network Interface"
                  value={activeInterface.interface_name}
                  onChange={(e) => selectInterface(e.target.value)}
                  className="bg-transparent text-slate-900 font-typewriter font-semibold text-xs focus:outline-none cursor-pointer pr-1 mt-0.5"
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
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </span>
              <div>
                <div className="text-[9px] font-heading font-medium uppercase tracking-wider text-slate-400 leading-none">
                  Subnet Range &amp; Gateway
                </div>
                <div className="font-typewriter font-semibold text-slate-800 text-xs mt-0.5">
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
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F8FAFC] border border-slate-200 text-xs font-typewriter">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  wsConnected
                    ? "bg-emerald-500 animate-pulse"
                    : apiOnline
                    ? "bg-blue-500"
                    : "bg-amber-500"
                }`}
              />
              <span className="font-semibold text-slate-700">
                {wsConnected
                  ? "LIVE 2s"
                  : apiOnline
                  ? "API ONLINE"
                  : "SIM MODE"}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-blue-600 font-medium">↓{rxKbps}</span>
              <span className="text-slate-500">↑{txKbps} kbps</span>
            </div>

            {/* Circular Refresh Button matching Screenshot 1 Right & Screenshot 2 Middle */}
            <button
              type="button"
              onClick={() => refreshAllNetworkData(activeInterface.interface_name, true)}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200 flex items-center justify-center transition-all duration-200 ease-out cursor-pointer"
              title="Refresh & Sync Backend Telemetry"
            >
              ↻
            </button>

            <button
              type="button"
              disabled={isScanning}
              onClick={() => triggerScan("auto")}
              className="px-3.5 py-2 rounded-full hyper-hero-gradient hover:brightness-110 disabled:opacity-50 text-white font-semibold text-xs transition-all duration-200 ease-out cursor-pointer"
            >
              {isScanning ? `Scanning ${scanProgressPct}%...` : "Quick Scan"}
            </button>

            <button
              type="button"
              disabled={isScanning}
              onClick={() => triggerSeedCampusLab()}
              className="hidden md:inline-flex px-3.5 py-2 rounded-full bg-[#141B2D] hover:bg-slate-800 text-white font-semibold text-xs transition-all duration-200 ease-out cursor-pointer"
              title="Seed realistic Campus Lab routers, servers, IoT hosts, open ports, and alerts"
            >
              Campus Lab
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
        <div className="noc-container py-6 sm:py-8 space-y-6">
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
        </div>
      </main>

      {/* Sticky Bottom Navigation Dock (Placed below the content, sticky) */}
      <footer className="noc-bottom-bar">
        <nav
          aria-label="Navigation Dock"
          className="noc-pill-dock"
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
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ease-out group relative ${
                  isActive
                    ? "hyper-hero-gradient text-white scale-105 shadow-md shadow-blue-500/25"
                    : "text-slate-400 hover:text-white bg-white/5 hover:bg-white/10"
                }`}
              >
                {item.icon(isActive)}
                <span className="absolute bottom-full mb-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-slate-700">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </footer>
    </div>
  );
}
