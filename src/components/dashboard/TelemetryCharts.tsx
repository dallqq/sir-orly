"use client";

import { DiscoveredDevice, HostQoSStats } from "@/lib/api";
import { TelemetryPoint } from "@/store/useNetPulseStore";
import React, { useState } from "react";

/**
 * 1. Real-Time Multi-Series RTT Latency & Jitter Area Chart (SVG)
 */
export function LiveLatencyAreaChart({ data }: { data: TelemetryPoint[] }) {
  const pts = data.length > 1 ? data : [
    { time: "00:00", avg_rtt_ms: 2.1, max_rtt_ms: 4.5, jitter_ms: 0.5, tx_kbps: 110, rx_kbps: 320 },
    { time: "00:02", avg_rtt_ms: 2.8, max_rtt_ms: 6.2, jitter_ms: 0.8, tx_kbps: 150, rx_kbps: 410 },
  ];

  const width = 680;
  const height = 210;
  const padX = 38;
  const padY = 22;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const maxVal = Math.max(20, ...pts.map((p) => Math.max(p.max_rtt_ms, p.avg_rtt_ms)));

  const toCoords = (key: "avg_rtt_ms" | "max_rtt_ms" | "jitter_ms") =>
    pts.map((pt, i) => {
      const x = padX + (i / Math.max(1, pts.length - 1)) * innerW;
      const y = padY + innerH - (Math.min(pt[key], maxVal) / maxVal) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

  const avgLine = toCoords("avg_rtt_ms").join(" ");
  const maxLine = toCoords("max_rtt_ms").join(" ");
  const avgArea = `${padX},${padY + innerH} ${avgLine} ${padX + innerW},${padY + innerH}`;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs mb-2">
        <div className="flex items-center gap-4 font-mono">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <span className="h-2 w-2 rounded-full bg-cyan-400" /> Avg RTT (ms)
          </span>
          <span className="flex items-center gap-1.5 text-amber-400">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Peak RTT (ms)
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-400">
          Max Scale: {maxVal.toFixed(1)} ms
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-52 bg-slate-950/60 rounded-lg border border-slate-800/80">
        <defs>
          <linearGradient id="cyanAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((step) => {
          const y = padY + step * innerH;
          const label = ((1 - step) * maxVal).toFixed(0);
          return (
            <g key={step}>
              <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="#1e293b" strokeDasharray="3 3" />
              <text x={6} y={y + 3} fill="#64748b" fontSize="10" fontFamily="monospace">
                {label}ms
              </text>
            </g>
          );
        })}
        <polygon points={avgArea} fill="url(#cyanAreaGrad)" />
        <polyline fill="none" stroke="#f59e0b" strokeWidth="1.75" strokeDasharray="4 2" points={maxLine} />
        <polyline fill="none" stroke="#06b6d4" strokeWidth="2.5" points={avgLine} />
        {pts.map((pt, idx) => {
          const x = padX + (idx / Math.max(1, pts.length - 1)) * innerW;
          const y = padY + innerH - (Math.min(pt.avg_rtt_ms, maxVal) / maxVal) * innerH;
          return (
            <g key={`${pt.time}-${idx}`}>
              <circle cx={x} cy={y} r="3" fill="#06b6d4" />
              {idx % Math.max(1, Math.floor(pts.length / 5)) === 0 && (
                <text x={x - 14} y={height - 5} fill="#64748b" fontSize="9.5" fontFamily="monospace">
                  {pt.time}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * 2. Real-Time NIC Bandwidth Throughput Chart (TX / RX kbps)
 */
export function BandwidthThroughputChart({ data }: { data: TelemetryPoint[] }) {
  const pts = data.length > 1 ? data : [
    { time: "00:00", avg_rtt_ms: 2, max_rtt_ms: 4, jitter_ms: 0.4, tx_kbps: 140, rx_kbps: 420 },
    { time: "00:02", avg_rtt_ms: 2, max_rtt_ms: 5, jitter_ms: 0.5, tx_kbps: 210, rx_kbps: 640 },
  ];

  const width = 420;
  const height = 210;
  const padX = 36;
  const padY = 22;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const maxBw = Math.max(500, ...pts.map((p) => Math.max(p.tx_kbps, p.rx_kbps)));

  const rxPoints = pts
    .map((pt, i) => {
      const x = padX + (i / Math.max(1, pts.length - 1)) * innerW;
      const y = padY + innerH - (Math.min(pt.rx_kbps, maxBw) / maxBw) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const txPoints = pts
    .map((pt, i) => {
      const x = padX + (i / Math.max(1, pts.length - 1)) * innerW;
      const y = padY + innerH - (Math.min(pt.tx_kbps, maxBw) / maxBw) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs mb-2 font-mono">
        <span className="text-emerald-400">● RX Downlink (kbps)</span>
        <span className="text-purple-400">● TX Uplink (kbps)</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-52 bg-slate-950/60 rounded-lg border border-slate-800/80">
        {[0, 0.5, 1].map((step) => {
          const y = padY + step * innerH;
          return (
            <line key={step} x1={padX} y1={y} x2={width - padX} y2={y} stroke="#1e293b" strokeDasharray="3 3" />
          );
        })}
        <polyline fill="none" stroke="#10b981" strokeWidth="2.4" points={rxPoints} />
        <polyline fill="none" stroke="#a855f7" strokeWidth="2" points={txPoints} />
      </svg>
    </div>
  );
}

/**
 * 3. Host Latency Comparison Bar Chart (Feature 3 Visual)
 */
export function HostLatencyBarChart({ stats }: { stats: HostQoSStats[] }) {
  if (stats.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-400 font-mono">
        Run a Ping Test or Subnet Scan to compare per-host latency bars.
      </div>
    );
  }
  const maxRtt = Math.max(25, ...stats.map((s) => s.max_latency_ms || s.avg_latency_ms || 1));

  return (
    <div className="space-y-2.5">
      {stats.slice(0, 8).map((s) => {
        const avgPct = Math.min(100, Math.max(4, (s.avg_latency_ms / maxRtt) * 100));
        const maxPct = Math.min(100, Math.max(avgPct, (s.max_latency_ms / maxRtt) * 100));
        const isLoss = s.packet_loss_pct >= 100;
        const barColor = isLoss
          ? "bg-rose-500"
          : s.avg_latency_ms > 80
          ? "bg-amber-400"
          : "bg-emerald-400";

        return (
          <div key={s.ip_address} className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-200 truncate">
                {s.hostname} <span className="text-slate-400">({s.ip_address})</span>
              </span>
              <span className="text-cyan-300">
                Avg: {s.avg_latency_ms}ms | Max: {s.max_latency_ms}ms | Loss: {s.packet_loss_pct}%
              </span>
            </div>
            <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden relative border border-slate-800">
              <div
                className="h-full bg-cyan-500/25 absolute left-0 top-0"
                style={{ width: `${maxPct}%` }}
              />
              <div
                className={`h-full ${barColor} relative rounded-full`}
                style={{ width: `${isLoss ? 100 : avgPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 4. Interactive Node-Link Subnet Topology Graph (React Flow style)
 */
export function InteractiveSubnetTopology({
  devices,
  localIp,
  gatewayIp,
  onSelectDevice,
}: {
  devices: DiscoveredDevice[];
  localIp: string;
  gatewayIp: string;
  onSelectDevice?: (dev: DiscoveredDevice) => void;
}) {
  const [selectedIp, setSelectedIp] = useState<string | null>(null);

  const width = 820;
  const height = 420;
  const cx = width / 2;
  const cy = height / 2;
  const radius = 152;

  const gatewayNode = devices.find((d) => d.is_gateway) || {
    ip_address: gatewayIp,
    mac_address: "00:1A:2B:3C:4D:01",
    hostname: "Default-Gateway-Router",
    vendor: "Cisco / Gateway",
    os_guess: "Router OS",
    interface_name: "Primary",
    subnet_cidr: "192.168.1.0/24",
    is_online: true,
    is_gateway: true,
    is_local_host: false,
    discovery_method: "GATEWAY_ROUTE",
    last_rtt_ms: 1.4,
    open_ports_summary: "53, 80, 443",
  };

  const leafNodes = devices.filter((d) => d.ip_address !== gatewayNode.ip_address);

  return (
    <div className="relative bg-[#070B12] rounded-xl border border-slate-800 overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-3">
          <span className="text-cyan-400 font-semibold">INTERACTIVE L2/L3 TOPOLOGY MAP</span>
          <span className="text-slate-400">({devices.length} Subnet Nodes)</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-emerald-400">● Optimal (&lt;50ms)</span>
          <span className="text-amber-400">● High RTT (50–150ms)</span>
          <span className="text-rose-400">● Unreachable / Loss</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[400px]">
        <defs>
          <pattern id="nocGrid" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M 28 0 L 0 0 0 28" fill="none" stroke="#1e293b" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#nocGrid)" />

        {/* Edges from Gateway to each Discovered Host */}
        {leafNodes.map((node, idx) => {
          const angle = (idx / Math.max(1, leafNodes.length)) * 2 * Math.PI - Math.PI / 2;
          const nx = cx + Math.cos(angle) * radius * 1.35;
          const ny = cy + Math.sin(angle) * radius * 0.92;
          const rtt = node.last_rtt_ms ?? 2.0;
          const strokeColor = !node.is_online
            ? "#ef4444"
            : rtt > 50
            ? "#f59e0b"
            : "#10b981";

          return (
            <g key={`edge-${node.ip_address}`}>
              <line
                x1={cx}
                y1={cy}
                x2={nx}
                y2={ny}
                stroke={strokeColor}
                strokeWidth={selectedIp === node.ip_address ? "2.8" : "1.8"}
                strokeDasharray={node.is_online ? "5 3" : "2 4"}
              />
              <text
                x={(cx + nx) / 2}
                y={(cy + ny) / 2 - 5}
                fill="#94a3b8"
                fontSize="9.5"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {node.is_online ? `${rtt}ms` : "OFFLINE"}
              </text>
            </g>
          );
        })}

        {/* Central Gateway Router Node */}
        <g
          className="cursor-pointer"
          onClick={() => {
            setSelectedIp(gatewayNode.ip_address);
            onSelectDevice?.(gatewayNode);
          }}
        >
          <circle cx={cx} cy={cy} r="34" fill="#0f172a" stroke="#06b6d4" strokeWidth="3" />
          <text x={cx} y={cy - 4} fill="#22d3ee" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
            GATEWAY
          </text>
          <text x={cx} y={cy + 11} fill="#f8fafc" fontSize="9.5" fontFamily="monospace" textAnchor="middle">
            {gatewayNode.ip_address}
          </text>
        </g>

        {/* Surrounding Subnet Host Nodes */}
        {leafNodes.map((node, idx) => {
          const angle = (idx / Math.max(1, leafNodes.length)) * 2 * Math.PI - Math.PI / 2;
          const nx = cx + Math.cos(angle) * radius * 1.35;
          const ny = cy + Math.sin(angle) * radius * 0.92;
          const isLocal = node.ip_address === localIp || node.is_local_host;
          const borderCol = !node.is_online
            ? "#ef4444"
            : isLocal
            ? "#06b6d4"
            : (node.last_rtt_ms ?? 2) > 50
            ? "#f59e0b"
            : "#10b981";

          return (
            <g
              key={node.ip_address}
              className="cursor-pointer"
              onClick={() => {
                setSelectedIp(node.ip_address);
                onSelectDevice?.(node);
              }}
            >
              <rect
                x={nx - 68}
                y={ny - 24}
                width="136"
                height="48"
                rx="8"
                fill="#0f172a"
                stroke={borderCol}
                strokeWidth={selectedIp === node.ip_address ? "2.8" : "1.8"}
              />
              <text x={nx} y={ny - 6} fill="#f8fafc" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                {node.hostname.slice(0, 16)}
              </text>
              <text x={nx} y={ny + 8} fill="#38bdf8" fontSize="9.5" fontFamily="monospace" textAnchor="middle">
                {node.ip_address}
              </text>
              <text x={nx} y={ny + 19} fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">
                {node.vendor.slice(0, 18)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

