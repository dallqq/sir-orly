"use client";

import { InteractiveSubnetTopology } from "@/components/dashboard/TelemetryCharts";
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
    triggerSeedCampusLab,
  } = useNetPulseStore();

  const [scanMode, setScanMode] = useState<string>("auto");
  const [customCidr, setCustomCidr] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"table" | "topology">("table");
  const [selectedNode, setSelectedNode] = useState<DiscoveredDevice | null>(null);

  const effectiveCidr = customCidr || activeInterface.subnet_cidr;

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

  return (
    <div className="space-y-6">
      {/* Feature 1 Mandatory Banner: Local IP, Subnet Mask, Network Range & Gateway */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
              FEATURE 1 — NETWORK DISCOVERY &amp; LAYER 2/3 SUBNET ENUMERATION
            </div>
            <h1 className="text-xl font-bold text-white mt-0.5">
              Active Interface, Network CIDR Range &amp; Device Inventory
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Select Network Interface"
              value={activeInterface.interface_name}
              onChange={(e) => {
                setCustomCidr("");
                selectInterface(e.target.value);
              }}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300"
            >
              {interfaces.map((nic) => (
                <option key={nic.interface_name} value={nic.interface_name}>
                  NIC: {nic.interface_name} ({nic.local_ip})
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={isScanning}
              onClick={() => triggerSeedCampusLab()}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-cyan-500/40 text-cyan-300 text-xs font-semibold cursor-pointer"
            >
              🏫 Seed Campus Lab Devices
            </button>
          </div>
        </div>

        {/* 5 Telemetry Boxes explicitly highlighting Local IP, Network Range, Subnet Mask, Gateway, MAC */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800">
            <div className="text-[11px] text-slate-400">DETECTED LOCAL IP</div>
            <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
              {activeInterface.local_ip}
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              {activeInterface.interface_name}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800">
            <div className="text-[11px] text-slate-400">NETWORK RANGE (CIDR)</div>
            <div className="text-lg font-bold font-mono text-cyan-400 mt-0.5">
              {activeInterface.subnet_cidr}
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              {activeInterface.first_usable_ip} – {activeInterface.last_usable_ip}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800">
            <div className="text-[11px] text-slate-400">SUBNET MASK</div>
            <div className="text-lg font-bold font-mono text-slate-100 mt-0.5">
              {activeInterface.netmask}
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              {activeInterface.usable_hosts} Usable Host IPs
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800">
            <div className="text-[11px] text-slate-400">DEFAULT GATEWAY</div>
            <div className="text-lg font-bold font-mono text-amber-300 mt-0.5">
              {activeInterface.gateway_ip}
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              Broadcast: {activeInterface.broadcast_address}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800">
            <div className="text-[11px] text-slate-400">LOCAL MAC ADDRESS</div>
            <div className="text-lg font-bold font-mono text-purple-300 mt-0.5">
              {activeInterface.mac_address}
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              Speed: {activeInterface.speed_mbps || 1000} Mbps
            </div>
          </div>
        </div>

        {/* Scan Control Toolbar */}
        <div className="pt-2 border-t border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-mono text-slate-400">Target CIDR:</label>
            <input
              type="text"
              value={effectiveCidr}
              onChange={(e) => setCustomCidr(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white w-44"
              placeholder="192.168.1.0/24"
            />

            <label className="text-xs font-mono text-slate-400 ml-2">Discovery Mode:</label>
            <select
              aria-label="Discovery Mode"
              value={scanMode}
              onChange={(e) => setScanMode(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-cyan-300"
            >
              <option value="auto">Hybrid Auto (Scapy ARP L2 + ICMP L3 + TCP L4 + arp -a)</option>
              <option value="arp">Layer 2 ARP Broadcast Sweep</option>
              <option value="icmp">Layer 3 ICMP &amp; Layer 4 TCP Sweep</option>
              <option value="simulation">Campus Lab Simulation Mode (8 Enterprise Hosts)</option>
            </select>

            <button
              type="button"
              disabled={isScanning}
              onClick={() => triggerScan(scanMode, effectiveCidr)}
              className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition cursor-pointer"
            >
              {isScanning ? `Scanning (${scanStage} ${scanProgressPct}%)...` : "⚡ Start Discovery Sweep"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("table")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono cursor-pointer ${
                activeTab === "table"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "bg-slate-900 text-slate-400 border border-slate-800"
              }`}
            >
              📋 Device Inventory ({devices.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("topology")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono cursor-pointer ${
                activeTab === "topology"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "bg-slate-900 text-slate-400 border border-slate-800"
              }`}
            >
              🕸️ Topology Map
            </button>
          </div>
        </div>

        {isScanning && (
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
            <div
              className="bg-cyan-400 h-full transition-all duration-300"
              style={{ width: `${scanProgressPct}%` }}
            />
          </div>
        )}
      </div>

      {/* Main Workspace: Inventory Table or Interactive Topology Graph */}
      {activeTab === "table" ? (
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white">
                Active Devices Detected on Subnet ({filteredDevices.length})
              </h2>
              <p className="text-xs text-slate-400">
                Resolved via Scapy Layer 2 ARP, Layer 3 ICMP, Layer 4 TCP Handshake, OS ARP Cache, and Offline IEEE OUI Lookup
              </p>
            </div>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by IP, Hostname, MAC, Vendor..."
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 w-full sm:w-72"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                  <th className="py-2.5 px-2">Status</th>
                  <th className="py-2.5 px-2">IP Address</th>
                  <th className="py-2.5 px-2">Hostname</th>
                  <th className="py-2.5 px-2">MAC Address</th>
                  <th className="py-2.5 px-2">Vendor (IEEE OUI)</th>
                  <th className="py-2.5 px-2">OS / Role Heuristic</th>
                  <th className="py-2.5 px-2">Method</th>
                  <th className="py-2.5 px-2">RTT</th>
                  <th className="py-2.5 px-2">Open Ports</th>
                  <th className="py-2.5 px-2 text-right">Contextual Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 font-mono">
                {filteredDevices.map((dev) => (
                  <tr key={dev.ip_address} className="hover:bg-slate-900/60">
                    <td className="py-2.5 px-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          dev.is_online
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-rose-500/15 text-rose-400"
                        }`}
                      >
                        ● {dev.is_online ? "ONLINE" : "OFFLINE"}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-cyan-300 font-bold">
                      {dev.ip_address}
                      {dev.is_gateway && (
                        <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                          GW
                        </span>
                      )}
                      {dev.is_local_host && (
                        <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                          LOCAL
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-slate-100 font-sans font-medium">
                      {dev.hostname}
                    </td>
                    <td className="py-2.5 px-2 text-purple-300">
                      {dev.mac_address}
                    </td>
                    <td className="py-2.5 px-2 text-slate-300 font-sans">
                      {dev.vendor}
                    </td>
                    <td className="py-2.5 px-2 text-slate-400 font-sans text-[11px]">
                      {dev.os_guess}
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                        {dev.discovery_method}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-emerald-300">
                      {dev.last_rtt_ms != null ? `${dev.last_rtt_ms} ms` : "—"}
                    </td>
                    <td className="py-2.5 px-2 text-amber-300 text-[11px]">
                      {dev.open_ports_summary || "—"}
                    </td>
                    <td className="py-2.5 px-2 text-right space-x-1.5 whitespace-nowrap">
                      <Link
                        href={`/connectivity?target=${encodeURIComponent(
                          dev.ip_address
                        )}&autostart=ping`}
                        className="px-2 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 text-[11px]"
                      >
                        ⚡ Ping Host
                      </Link>
                      <Link
                        href={`/connectivity?target=${encodeURIComponent(
                          dev.ip_address
                        )}&tab=ports&autostart=scan`}
                        className="px-2 py-1 rounded bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 text-[11px]"
                      >
                        🔓 Scan Ports
                      </Link>
                      <Link
                        href={`/packets?filter=${encodeURIComponent(
                          `host ${dev.ip_address}`
                        )}`}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                      >
                        🦈 Capture
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <InteractiveSubnetTopology
              devices={devices}
              localIp={activeInterface.local_ip}
              gatewayIp={activeInterface.gateway_ip}
              onSelectDevice={(d) => setSelectedNode(d)}
            />
          </div>
          <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 space-y-4">
            <h3 className="text-sm font-bold text-white">
              Node Telemetry Inspector
            </h3>
            {selectedNode ? (
              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                  <div className="text-cyan-400 font-bold text-sm">
                    {selectedNode.hostname}
                  </div>
                  <div className="text-slate-300">IP: {selectedNode.ip_address}</div>
                  <div className="text-purple-300">MAC: {selectedNode.mac_address}</div>
                  <div className="text-slate-400">Vendor: {selectedNode.vendor}</div>
                  <div className="text-slate-400">OS: {selectedNode.os_guess}</div>
                  <div className="text-emerald-400">
                    Last RTT: {selectedNode.last_rtt_ms ?? "N/A"} ms ({selectedNode.discovery_method})
                  </div>
                  <div className="text-amber-300">
                    Open Ports: {selectedNode.open_ports_summary || "None scanned"}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Link
                    href={`/connectivity?target=${encodeURIComponent(
                      selectedNode.ip_address
                    )}&autostart=ping`}
                    className="py-2 px-3 rounded bg-cyan-500 text-slate-950 font-bold text-center"
                  >
                    ⚡ Ping {selectedNode.ip_address}
                  </Link>
                  <Link
                    href={`/connectivity?target=${encodeURIComponent(
                      selectedNode.ip_address
                    )}&tab=ports&autostart=scan`}
                    className="py-2 px-3 rounded bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold text-center"
                  >
                    🔓 Run Socket Port Scanner
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Click any router or workstation node in the topology map to inspect its Layer 2 MAC, Layer 3 IPv4, OUI vendor, and launch quick diagnostics.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

