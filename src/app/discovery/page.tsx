"use client";

import { InteractiveSubnetTopology } from "@/components/dashboard/TelemetryCharts";
import {
  LanDeviceCard,
  SegmentedPillControl,
  SignalStrengthBars,
} from "@/components/ui/HyperComponents";
import { DiscoveredDevice } from "@/lib/api";
import { useNetPulseStore } from "@/store/useNetPulseStore";
import Link from "next/link";
import React, { useMemo, useState } from "react";

export default function NetworkDiscoveryPage() {
  const {
    activeInterface,
    interfaces,
    devices,
    isScanning,
    scanProgressPct,
    scanStage,
    selectInterface,
    triggerScan,
  } = useNetPulseStore();

  const [scanMode, setScanMode] = useState<string>("auto");
  const [customCidr, setCustomCidr] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"cards" | "topology" | "table">("cards");
  const [selectedNode, setSelectedNode] = useState<DiscoveredDevice | null>(null);

  const effectiveCidr = customCidr || (activeInterface.subnet_cidr !== "--" ? activeInterface.subnet_cidr : "");

  const filteredDevices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter(
      (d) =>
        d.ip_address.toLowerCase().includes(q) ||
        d.hostname.toLowerCase().includes(q) ||
        d.mac_address.toLowerCase().includes(q) ||
        d.vendor.toLowerCase().includes(q) ||
        d.os_guess.toLowerCase().includes(q)
    );
  }, [devices, searchQuery]);

  const activeSelected = selectedNode || filteredDevices[0] || null;

  return (
    <div className="space-y-6">
      {/* Top LAN Header & Segmented Pill Switcher (Matching Screenshot 2 Middle "Lan — Found X devices") */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-typewriter font-medium mb-1.5">
              <span>FEATURE 1 · LAN DISCOVERY</span>
              <span>•</span>
              <span>Found {devices.length} devices</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-semibold text-slate-900 tracking-tight leading-tight">
              Local Area Network (LAN) &amp; Subnet Topology
            </h1>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              Multi-tier Layer 2 Scapy ARP, Layer 3 ICMP, Layer 4 TCP &amp; Offline IEEE OUI MAC vendor enumeration
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <SegmentedPillControl
              size="sm"
              options={[
                { id: "cards", label: "Devices", count: filteredDevices.length },
                { id: "topology", label: "Internet & Map" },
                { id: "table", label: "Inventory Table" },
              ]}
              value={activeTab}
              onChange={(v) => setActiveTab(v)}
            />
          </div>
        </div>

        {/* 5 Feature 1 Mandatory Telemetry Cards (Local IP, CIDR Range, Subnet Mask, Gateway, MAC) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-3.5">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 overflow-hidden min-w-0 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-heading font-semibold uppercase tracking-wider text-slate-400 truncate">
                Detected Local IP
              </div>
              <div
                className="text-base sm:text-lg xl:text-xl font-bold font-typewriter text-blue-600 mt-1 truncate tracking-tight"
                title={activeInterface.local_ip || "--"}
              >
                {activeInterface.local_ip || "--"}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">
              NIC: {activeInterface.interface_name || "--"}
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 overflow-hidden min-w-0 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-heading font-semibold uppercase tracking-wider text-slate-400 truncate">
                Network Range (CIDR)
              </div>
              <div
                className="text-base sm:text-lg xl:text-xl font-bold font-typewriter text-slate-900 mt-1 truncate tracking-tight"
                title={activeInterface.subnet_cidr || "--"}
              >
                {activeInterface.subnet_cidr || "--"}
              </div>
            </div>
            <div
              className="text-[10px] sm:text-[11px] font-typewriter text-slate-500 mt-1 truncate"
              title={
                activeInterface.first_usable_ip && activeInterface.last_usable_ip && activeInterface.first_usable_ip !== "--"
                  ? `${activeInterface.first_usable_ip} – ${activeInterface.last_usable_ip}`
                  : "--"
              }
            >
              {activeInterface.first_usable_ip && activeInterface.last_usable_ip && activeInterface.first_usable_ip !== "--"
                ? `${activeInterface.first_usable_ip} – ${activeInterface.last_usable_ip}`
                : "--"}
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 overflow-hidden min-w-0 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-heading font-semibold uppercase tracking-wider text-slate-400 truncate">
                Subnet Mask
              </div>
              <div
                className="text-base sm:text-lg xl:text-xl font-bold font-typewriter text-slate-900 mt-1 truncate tracking-tight"
                title={activeInterface.netmask || "--"}
              >
                {activeInterface.netmask || "--"}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">
              {activeInterface.usable_hosts > 0
                ? `${activeInterface.usable_hosts} Usable Host IPs`
                : "--"}
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 overflow-hidden min-w-0 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-heading font-semibold uppercase tracking-wider text-slate-400 truncate">
                Default Gateway
              </div>
              <div
                className="text-base sm:text-lg xl:text-xl font-bold font-typewriter text-emerald-600 mt-1 truncate tracking-tight"
                title={activeInterface.gateway_ip || "--"}
              >
                {activeInterface.gateway_ip || "--"}
              </div>
            </div>
            <div
              className="text-[10px] sm:text-[11px] font-typewriter text-slate-500 mt-1 truncate"
              title={
                activeInterface.broadcast_address && activeInterface.broadcast_address !== "--"
                  ? `Bcast: ${activeInterface.broadcast_address}`
                  : "--"
              }
            >
              {activeInterface.broadcast_address && activeInterface.broadcast_address !== "--"
                ? `Bcast: ${activeInterface.broadcast_address}`
                : "--"}
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 overflow-hidden min-w-0 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-heading font-semibold uppercase tracking-wider text-slate-400 truncate">
                Local MAC Address
              </div>
              <div
                className="text-base sm:text-lg xl:text-xl font-bold font-typewriter text-slate-900 mt-1 truncate tracking-tight"
                title={activeInterface.mac_address || "--"}
              >
                {activeInterface.mac_address || "--"}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 truncate">
              Speed: {activeInterface.speed_mbps ? `${activeInterface.speed_mbps} Mbps` : "--"}
            </div>
          </div>
        </div>

        {/* Discovery Controls & Search Bar */}
        <div className="pt-4 border-t border-slate-100 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="Select Network Interface"
              value={activeInterface.interface_name}
              onChange={(e) => {
                setCustomCidr("");
                selectInterface(e.target.value);
              }}
              className="bg-[#F8FAFC] border border-slate-200 rounded-full px-3.5 py-2 text-xs font-heading font-medium text-slate-800 cursor-pointer"
            >
              {interfaces.map((nic) => (
                <option key={nic.interface_name} value={nic.interface_name}>
                  NIC: {nic.interface_name} ({nic.local_ip})
                </option>
              ))}
            </select>

            <input
              type="text"
              value={effectiveCidr}
              onChange={(e) => setCustomCidr(e.target.value)}
              className="bg-[#F8FAFC] border border-slate-200 rounded-full px-3.5 py-2 text-xs font-typewriter font-medium text-blue-600 w-40"
              placeholder="e.g. 192.168.1.0/24"
            />

            <select
              aria-label="Discovery Mode"
              value={scanMode}
              onChange={(e) => setScanMode(e.target.value)}
              className="bg-[#F8FAFC] border border-slate-200 rounded-full px-3.5 py-2 text-xs font-heading font-medium text-slate-700 cursor-pointer"
            >
              <option value="auto">Hybrid Auto (ARP L2 + ICMP L3 + TCP L4)</option>
              <option value="arp">Layer 2 ARP Broadcast Sweep</option>
              <option value="icmp">Layer 3 ICMP &amp; Layer 4 TCP Sweep</option>
            </select>

            <button
              type="button"
              disabled={isScanning}
              onClick={() => triggerScan(scanMode, effectiveCidr)}
              className="px-5 py-2 rounded-full hyper-hero-gradient hover:brightness-105 disabled:opacity-50 text-white font-heading font-semibold text-xs transition-all duration-200 ease-out cursor-pointer"
            >
              {isScanning
                ? `Scanning (${scanStage} ${scanProgressPct}%)...`
                : "Start Discovery Sweep"}
            </button>
          </div>

          {/* Pill Search Input */}
          <div className="relative min-w-[240px]">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search IP, Hostname, MAC, Vendor..."
              className="w-full bg-[#F8FAFC] border border-slate-200 focus:border-blue-500 focus:bg-white rounded-full px-4 py-2 text-xs font-typewriter text-slate-800 outline-none transition-colors duration-200"
            />
          </div>
        </div>

        {isScanning && (
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="hyper-hero-gradient h-full transition-all duration-300 rounded-full"
              style={{ width: `${scanProgressPct}%` }}
            />
          </div>
        )}
      </div>

      {/* VIEW 1: LAN Device Cards Grid (Screenshot 2 Middle "Lan — Found 12 devices") */}
      {activeTab === "cards" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-8">
            {filteredDevices.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-10 text-center space-y-3">
                <div className="text-base font-extrabold text-slate-900">
                  {searchQuery
                    ? `No LAN devices matched "${searchQuery}"`
                    : "No Subnet Devices Discovered Yet"}
                </div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {searchQuery
                    ? "Try clearing your search filter or searching by IPv4 address."
                    : `Click "Start Discovery Sweep" to scan the local subnet.`}
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      Clear Filter
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isScanning}
                      onClick={() => triggerScan(scanMode, effectiveCidr)}
                      className="px-5 py-2.5 rounded-full hyper-hero-gradient text-white text-xs font-bold cursor-pointer"
                    >
                      Start Discovery Sweep
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDevices.map((dev, idx) => {
                  const isFeatured =
                    activeSelected?.ip_address === dev.ip_address ||
                    (!selectedNode && idx === 0);
                  return (
                    <LanDeviceCard
                      key={dev.ip_address}
                      device={dev}
                      featured={isFeatured}
                      onSelect={(d) => setSelectedNode(d)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Right 4 Cols: Selected Device Detail & History Sheet (Matching Screenshot 2 Right "History") */}
          <div className="xl:col-span-4 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 space-y-4 sticky top-22">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Host Telemetry Sheet
                </h3>
                <p className="text-xs text-slate-400">
                  Click any LAN card to inspect Layer 2–7 details
                </p>
              </div>
              {activeSelected && (
                <SignalStrengthBars
                  rttMs={activeSelected.last_rtt_ms}
                  isOnline={activeSelected.is_online}
                />
              )}
            </div>

            {activeSelected ? (
              <>
                <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 space-y-1">
                  <div className="text-lg font-heading font-semibold text-slate-900">
                    {activeSelected.hostname || "--"}
                  </div>
                  <div className="text-xs font-typewriter font-medium text-blue-600">
                    {activeSelected.ip_address || "--"}
                  </div>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-400 font-heading font-medium">Status</span>
                    <span
                      className={`font-medium ${activeSelected.is_online
                        ? "text-emerald-600"
                        : "text-rose-600"
                        }`}
                    >
                      ● {activeSelected.is_online ? "Online" : "Offline"}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-400 font-heading font-medium">Ping / RTT</span>
                    <span className="font-typewriter font-medium text-slate-900">
                      {activeSelected.last_rtt_ms != null
                        ? `${activeSelected.last_rtt_ms} ms`
                        : "--"}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-400 font-heading font-medium">MAC Address</span>
                    <span className="font-typewriter font-medium text-slate-800">
                      {activeSelected.mac_address || "--"}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-400 font-heading font-medium">IEEE OUI Vendor</span>
                    <span className="font-heading font-medium text-slate-800">
                      {activeSelected.vendor || "--"}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-400 font-heading font-medium">OS / Role</span>
                    <span className="font-heading font-medium text-slate-700 text-right">
                      {activeSelected.os_guess || "--"}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-400 font-heading font-medium">Discovery Method</span>
                    <span className="font-typewriter font-medium text-blue-600">
                      {activeSelected.discovery_method || "--"}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-400 font-heading font-medium">Open Service Ports</span>
                    <span className="font-typewriter font-medium text-slate-800">
                      {activeSelected.open_ports_summary || "--"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-2">
                  <Link
                    href={`/connectivity?target=${encodeURIComponent(
                      activeSelected.ip_address
                    )}&autostart=ping`}
                    className="py-2.5 px-4 rounded-full hyper-hero-gradient text-white font-bold text-center text-xs transition-all duration-200 ease-out hover:brightness-105"
                  >
                    Run Ping Sequence on {activeSelected.ip_address}
                  </Link>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={`/connectivity?target=${encodeURIComponent(
                        activeSelected.ip_address
                      )}&tab=ports&autostart=scan`}
                      className="py-2 px-3 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-center text-xs transition-colors duration-200"
                    >
                      Scan Ports
                    </Link>
                    <Link
                      href={`/packets?filter=${encodeURIComponent(
                        `host ${activeSelected.ip_address}`
                      )}`}
                      className="py-2 px-3 rounded-full bg-[#141B2D] hover:bg-slate-800 text-white font-bold text-center text-xs transition-colors duration-200"
                    >
                      Sniff Packets
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-400">
                Select any device card to inspect its telemetry.
              </p>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: Interactive Subnet Topology Map */}
      {activeTab === "topology" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <InteractiveSubnetTopology
              devices={devices}
              localIp={activeInterface.local_ip}
              gatewayIp={activeInterface.gateway_ip}
              onSelectDevice={(d) => setSelectedNode(d)}
            />
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">
              Topology Node Inspector
            </h3>
            {activeSelected ? (
              <LanDeviceCard device={activeSelected} featured={true} />
            ) : (
              <p className="text-xs text-slate-400">
                Click any router or workstation node in the topology map to inspect its Layer 2 MAC, Layer 3 IPv4, OUI vendor, and launch quick diagnostics.
              </p>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: Full Technical Inventory Table */}
      {activeTab === "table" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Complete Subnet Host Inventory ({filteredDevices.length})
              </h2>
              <p className="text-xs text-slate-400">
                Layer 2 MAC, IEEE OUI Vendor, Reverse DNS Hostname, OS Heuristic &amp; RTT
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-typewriter">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-heading font-medium uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-2.5">Status</th>
                  <th className="py-3 px-2.5">IP Address</th>
                  <th className="py-3 px-2.5">Hostname</th>
                  <th className="py-3 px-2.5">MAC Address</th>
                  <th className="py-3 px-2.5">Vendor (IEEE OUI)</th>
                  <th className="py-3 px-2.5">OS / Role</th>
                  <th className="py-3 px-2.5">Method</th>
                  <th className="py-3 px-2.5">RTT</th>
                  <th className="py-3 px-2.5">Open Ports</th>
                  <th className="py-3 px-2.5 text-right font-heading">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDevices.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 font-sans">
                      No LAN devices discovered yet. Run a discovery sweep above.
                    </td>
                  </tr>
                ) : (
                  filteredDevices.map((dev) => (
                    <tr key={dev.ip_address} className="hover:bg-slate-50/90">
                      <td className="py-3 px-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium ${dev.is_online
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            : "bg-rose-50 text-rose-600 border border-rose-200"
                            }`}
                        >
                          ● {dev.is_online ? "ONLINE" : "OFFLINE"}
                        </span>
                      </td>
                      <td className="py-3 px-2.5 text-blue-600 font-medium">
                        {dev.ip_address || "--"}
                      </td>
                      <td className="py-3 px-2.5 text-slate-900 font-heading font-medium">
                        {dev.hostname || "--"}
                      </td>
                      <td className="py-3 px-2.5 text-slate-600">
                        {dev.mac_address || "--"}
                      </td>
                      <td className="py-3 px-2.5 text-slate-700 font-heading font-medium">
                        {dev.vendor || "--"}
                      </td>
                      <td className="py-3 px-2.5 text-slate-500 font-heading text-[11px]">
                        {dev.os_guess || "--"}
                      </td>
                      <td className="py-3 px-2.5">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-medium">
                          {dev.discovery_method || "--"}
                        </span>
                      </td>
                      <td className="py-3 px-2.5 text-emerald-600 font-medium">
                        {dev.last_rtt_ms != null ? `${dev.last_rtt_ms} ms` : "--"}
                      </td>
                      <td className="py-3 px-2.5 text-amber-600 font-medium text-[11px]">
                        {dev.open_ports_summary || "--"}
                      </td>
                      <td className="py-3 px-2.5 text-right space-x-1.5 whitespace-nowrap font-heading">
                        <Link
                          href={`/connectivity?target=${encodeURIComponent(
                            dev.ip_address
                          )}&autostart=ping`}
                          className="px-2.5 py-1 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium text-[11px] transition-colors duration-200"
                        >
                          Ping
                        </Link>
                        <Link
                          href={`/connectivity?target=${encodeURIComponent(
                            dev.ip_address
                          )}&tab=ports&autostart=scan`}
                          className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] transition-colors duration-200"
                        >
                          Ports
                        </Link>
                        <Link
                          href={`/packets?filter=${encodeURIComponent(
                            `host ${dev.ip_address}`
                          )}`}
                          className="px-2.5 py-1 rounded-full bg-[#141B2D] hover:bg-slate-800 text-white font-medium text-[11px] transition-colors duration-200"
                        >
                          Sniff
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
