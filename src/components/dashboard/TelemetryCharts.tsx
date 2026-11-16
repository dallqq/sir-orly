"use client";

import { DiscoveredDevice, HostQoSStats } from "@/lib/api";
import { TelemetryPoint } from "@/store/useNetPulseStore";
import React, { useState } from "react";

/**
 * 1. Signature Diagonal-Hatched Analysis Area Chart (from Screenshot 1 Middle "Analysis")
 * Features diagonal blue stripe hatching between Peak RTT and Avg RTT curves,
 * circular white-with-blue-border nodes, and floating blue pill callout badge!
 */
export function LiveLatencyAreaChart({ data }: { data: TelemetryPoint[] }) {
  const pts = (data || []).slice(-7);

  const [activeIndex, setActiveIndex] = useState<number>(
    Math.min(3, Math.max(0, pts.length - 1))
  );

  if (!data || data.length === 0) {
    return (
      <div className="w-full flex items-center justify-center h-56 bg-[#FAFBFD] rounded-2xl border border-slate-200/80 text-xs font-typewriter text-slate-400">
        -- No latency telemetry stream recorded yet --
      </div>
    );
  }

  const safeActiveIdx = Math.min(activeIndex, pts.length - 1);

  const width = 640;
  const height = 225;
  const padLeft = 52;
  const padRight = 24;
  const padTop = 22;
  const padBottom = 34;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const maxVal = Math.max(
    24,
    ...pts.map((p) => Math.max(p.max_rtt_ms, p.avg_rtt_ms * 1.4))
  );

  const getCoord = (idx: number, val: number) => {
    const x = padLeft + (idx / Math.max(1, pts.length - 1)) * innerW;
    const y = padTop + innerH - (Math.min(val, maxVal) / maxVal) * innerH;
    return { x, y };
  };

  const upperCoords = pts.map((p, i) =>
    getCoord(i, Math.max(p.max_rtt_ms, p.avg_rtt_ms + 4))
  );
  const lowerCoords = pts.map((p, i) => getCoord(i, p.avg_rtt_ms));

  const upperPointsStr = upperCoords
    .map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");
  const lowerPointsStr = lowerCoords
    .map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");

  // Closed polygon between upper curve and reversed lower curve for the diagonal hatch fill
  const bandPolygon = [
    ...upperCoords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`),
    ...[...lowerCoords].reverse().map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`),
  ].join(" ");

  const activeUpper = upperCoords[safeActiveIdx];
  const activeLower = lowerCoords[safeActiveIdx];
  const activePt = pts[safeActiveIdx];
  const midY = (activeUpper.y + activeLower.y) / 2;

  return (
    <div className="w-full select-none">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-3">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 font-heading font-medium text-slate-700">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Avg RTT (ms)
          </span>
          <span className="inline-flex items-center gap-1.5 font-heading font-medium text-slate-500">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-300 border border-blue-500" /> Peak Envelope (ms)
          </span>
        </div>
        <span className="font-typewriter text-[11px] text-slate-400">
          Click any node to inspect interval · Scale: {maxVal.toFixed(0)} ms
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-56 bg-[#FAFBFD] rounded-2xl border border-slate-200/80"
      >
        <defs>
          {/* Diagonal Hatch Pattern matching Screenshot 1 "Analysis" chart */}
          <pattern
            id="hyperDiagonalHatch"
            width="8"
            height="8"
            patternTransform="rotate(35 0 0)"
            patternUnits="userSpaceOnUse"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="8"
              stroke="#93C5FD"
              strokeWidth="2.5"
              strokeOpacity="0.55"
            />
          </pattern>
        </defs>

        {/* Horizontal Grid Lines & Y-Axis Labels */}
        {[0, 0.33, 0.66, 1].map((step) => {
          const y = padTop + step * innerH;
          const val = ((1 - step) * maxVal).toFixed(1);
          return (
            <g key={step}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="#EEF2F6"
                strokeWidth="1"
              />
              <text
                x={12}
                y={y + 4}
                fill="#94A3B8"
                fontSize="10.5"
                fontWeight="500"
                fontFamily="var(--font-typewriter)"
              >
                {val} ms
              </text>
            </g>
          );
        })}

        {/* Diagonal Hatched Band between Peak and Avg RTT */}
        <polygon points={bandPolygon} fill="url(#hyperDiagonalHatch)" />

        {/* Upper & Lower Trend Polylines */}
        <polyline
          fill="none"
          stroke="#93C5FD"
          strokeWidth="2"
          points={upperPointsStr}
          strokeLinejoin="round"
        />
        <polyline
          fill="none"
          stroke="#1E6BFF"
          strokeWidth="2.5"
          points={lowerPointsStr}
          strokeLinejoin="round"
        />

        {/* Active Vertical Callout Line & Floating Pill Badge (Screenshot 1 Middle "3.2%") */}
        {activeUpper && activeLower && (
          <g>
            <line
              x1={activeUpper.x}
              y1={activeUpper.y}
              x2={activeLower.x}
              y2={activeLower.y}
              stroke="#1E6BFF"
              strokeWidth="2"
            />
            <rect
              x={activeUpper.x - 28}
              y={midY - 12}
              width="56"
              height="24"
              rx="12"
              fill="#1E6BFF"
            />
            <text
              x={activeUpper.x}
              y={midY + 4}
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="10.5"
              fontWeight="500"
              fontFamily="var(--font-typewriter)"
            >
              {activePt.avg_rtt_ms}ms
            </text>
          </g>
        )}

        {/* Interactive Nodes & X-Axis Labels */}
        {pts.map((pt, idx) => {
          const u = upperCoords[idx];
          const l = lowerCoords[idx];
          const isSelected = idx === safeActiveIdx;
          return (
            <g
              key={`${pt.time}-${idx}`}
              onClick={() => setActiveIndex(idx)}
              className="cursor-pointer"
            >
              <circle
                cx={u.x}
                cy={u.y}
                r={isSelected ? "5" : "4"}
                fill={isSelected ? "#1E6BFF" : "#FFFFFF"}
                stroke="#60A5FA"
                strokeWidth="2"
              />
              <circle
                cx={l.x}
                cy={l.y}
                r={isSelected ? "5.5" : "4"}
                fill={isSelected ? "#1E6BFF" : "#FFFFFF"}
                stroke="#1E6BFF"
                strokeWidth="2.2"
              />
              <text
                x={l.x}
                y={height - 10}
                textAnchor="middle"
                fill={isSelected ? "#1E6BFF" : "#94A3B8"}
                fontSize="11"
                fontWeight={isSelected ? "700" : "600"}
              >
                {pt.time}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * 2. Pill Bar Overview Chart with Hatched Tracks (from Screenshot 2 Right "Result / Overview")
 */
export function BandwidthThroughputChart({ data }: { data: TelemetryPoint[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full flex items-center justify-center h-52 bg-[#FAFBFD] rounded-2xl border border-slate-200/80 text-xs font-typewriter text-slate-400">
        -- No bandwidth throughput recorded yet --
      </div>
    );
  }

  const days = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
  const pts = data.slice(-7);
  const maxRx = Math.max(100, ...pts.map((p) => p.rx_kbps + p.tx_kbps));

  return (
    <div className="w-full select-none">
      <div className="flex items-center justify-between text-xs mb-3">
        <span className="inline-flex items-center gap-1.5 font-semibold text-blue-600">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Downlink RX (kbps)
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-300" /> Hatched Peak Capacity
        </span>
      </div>

      <div className="grid grid-cols-7 gap-2.5 sm:gap-3.5 items-end h-52 pt-2 pb-1 px-2 bg-[#FAFBFD] rounded-2xl border border-slate-200/80">
        {pts.map((pt, idx) => {
          const totalPct = Math.min(96, Math.max(45, ((pt.rx_kbps + pt.tx_kbps + 220) / maxRx) * 100));
          const rxPct = Math.min(88, Math.max(26, (pt.rx_kbps / maxRx) * 100));
          const label = pt.time.length <= 5 ? pt.time : days[idx % days.length];

          return (
            <div
              key={`${pt.time}-${idx}`}
              className="flex flex-col items-center h-full justify-end group"
            >
              {/* Full Column Container */}
              <div className="relative w-full max-w-[38px] flex-1 flex items-end justify-center">
                {/* Hatched Background Pill Track (Screenshot 2 Right) */}
                <div
                  style={{ height: `${totalPct}%` }}
                  className="w-full rounded-full hyper-hatched-pill transition-all duration-300 relative overflow-hidden flex items-end"
                  title={`RX: ${pt.rx_kbps} kbps | TX: ${pt.tx_kbps} kbps`}
                >
                  {/* Active Blue Gradient Foreground Pill */}
                  <div
                    style={{ height: `${(rxPct / totalPct) * 100}%` }}
                    className="w-full rounded-full hyper-hero-gradient transition-all duration-500 group-hover:brightness-110"
                  />
                </div>
              </div>
              <span className="text-[11px] font-semibold text-slate-400 group-hover:text-blue-600 mt-2 transition-colors">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 3. Host Latency Comparison Bar Chart (Feature 3 Visual — Clean Light Hyper Theme)
 */
export function HostLatencyBarChart({ stats }: { stats: HostQoSStats[] }) {
  if (stats.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-400 font-typewriter">
        Run a Ping Test or Subnet Scan to compare per-host latency bars.
      </div>
    );
  }
  const maxRtt = Math.max(
    25,
    ...stats.map((s) => s.max_latency_ms || s.avg_latency_ms || 1)
  );

  return (
    <div className="space-y-3">
      {stats.slice(0, 8).map((s) => {
        const avgPct = Math.min(
          100,
          Math.max(6, (s.avg_latency_ms / maxRtt) * 100)
        );
        const maxPct = Math.min(
          100,
          Math.max(avgPct, (s.max_latency_ms / maxRtt) * 100)
        );
        const isLoss = s.packet_loss_pct >= 100;
        const barColor = isLoss
          ? "bg-rose-500"
          : s.avg_latency_ms > 80
            ? "bg-amber-500"
            : "hyper-hero-gradient";

        return (
          <div key={s.ip_address} className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="font-heading font-medium text-slate-800 truncate">
                {s.hostname}{" "}
                <span className="text-slate-400 font-typewriter font-normal">
                  ({s.ip_address})
                </span>
              </span>
              <span className="font-typewriter text-[11px] font-medium text-blue-600 shrink-0">
                {isLoss
                  ? "100% Loss"
                  : `${s.avg_latency_ms}ms avg · ${s.max_latency_ms}ms peak`}
              </span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden relative border border-slate-200/70">
              <div
                className="h-full bg-blue-200/60 absolute left-0 top-0 rounded-full transition-all duration-300"
                style={{ width: `${maxPct}%` }}
              />
              <div
                className={`h-full ${barColor} relative rounded-full transition-all duration-500`}
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
 * 4. Interactive Node-Link Subnet Topology Graph (Clean Hyper Light Blueprint Style)
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

  if (!devices || devices.length === 0) {
    return (
      <div className="relative bg-white rounded-3xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center min-h-[410px] space-y-2">
        <div className="text-sm font-heading font-medium text-slate-700">
          No Discovered Devices on Subnet Topology
        </div>
        <p className="text-xs text-slate-400 font-typewriter max-w-sm">
          Run a subnet scan to visualize the Layer 2/3 topology nodes, gateway link, and inter-host latency.
        </p>
      </div>
    );
  }

  const width = 820;
  const height = 430;
  const cx = width / 2;
  const cy = height / 2;
  const radius = 154;

  const gatewayNode = devices.find((d) => d.is_gateway) || {
    ip_address: gatewayIp || "--",
    mac_address: "--",
    hostname: "Default-Gateway",
    vendor: "--",
    os_guess: "Gateway Router",
    interface_name: "--",
    subnet_cidr: "--",
    is_online: true,
    is_gateway: true,
    is_local_host: false,
    discovery_method: "GATEWAY_ROUTE",
    last_rtt_ms: null,
    open_ports_summary: "",
  };

  const leafNodes = devices.filter(
    (d) => d.ip_address !== gatewayNode.ip_address
  );

  return (
    <div className="relative bg-white rounded-3xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3.5 bg-slate-50/90 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
          <span className="text-slate-900 font-heading font-semibold text-sm">
            Interactive Layer 2/3 Subnet Topology Map
          </span>
          <span className="text-slate-500 font-typewriter text-xs">
            ({devices.length} Discovered Nodes)
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-heading font-medium">
          <span className="text-emerald-600">● Optimal (&lt;50ms)</span>
          <span className="text-amber-600">● Elevated (50–150ms)</span>
          <span className="text-rose-600">● Offline / Loss</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[410px] bg-[#F8FAFC]">
        <defs>
          <pattern
            id="hyperDotGrid"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1.2" fill="#CBD5E1" />
          </pattern>
          <linearGradient id="gwHubGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2B7FFF" />
            <stop offset="100%" stopColor="#0B57D0" />
          </linearGradient>
        </defs>
        <rect width={width} height={height} fill="url(#hyperDotGrid)" />

        {/* Edges from Gateway to each Discovered Host */}
        {leafNodes.map((node, idx) => {
          const angle =
            (idx / Math.max(1, leafNodes.length)) * 2 * Math.PI - Math.PI / 2;
          const nx = cx + Math.cos(angle) * radius * 1.38;
          const ny = cy + Math.sin(angle) * radius * 0.92;
          const rtt = node.last_rtt_ms ?? 0;
          const strokeColor = !node.is_online
            ? "#EF4444"
            : rtt > 50
              ? "#F59E0B"
              : rtt > 0
                ? "#1E6BFF"
                : "#94A3B8";

          return (
            <g key={`edge-${node.ip_address}`}>
              <line
                x1={cx}
                y1={cy}
                x2={nx}
                y2={ny}
                stroke={strokeColor}
                strokeWidth={selectedIp === node.ip_address ? "3" : "2"}
                strokeDasharray={node.is_online ? "6 4" : "3 4"}
                opacity={selectedIp === node.ip_address ? 1 : 0.65}
              />
              <rect
                x={(cx + nx) / 2 - 24}
                y={(cy + ny) / 2 - 10}
                width="48"
                height="18"
                rx="9"
                fill="#FFFFFF"
                stroke="#E2E8F0"
              />
              <text
                x={(cx + nx) / 2}
                y={(cy + ny) / 2 + 2}
                fill={strokeColor}
                fontSize="9.5"
                fontWeight="700"
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
          <circle
            cx={cx}
            cy={cy}
            r="44"
            fill="#DBEAFE"
            opacity="0.65"
          />
          <circle
            cx={cx}
            cy={cy}
            r="36"
            fill="url(#gwHubGrad)"
            stroke="#FFFFFF"
            strokeWidth="3"
          />
          <text
            x={cx}
            y={cy - 4}
            fill="#FFFFFF"
            fontSize="10"
            fontWeight="800"
            fontFamily="monospace"
            textAnchor="middle"
          >
            GATEWAY
          </text>
          <text
            x={cx}
            y={cy + 11}
            fill="#E0F2FE"
            fontSize="9.5"
            fontWeight="600"
            fontFamily="monospace"
            textAnchor="middle"
          >
            {gatewayNode.ip_address}
          </text>
        </g>

        {/* Surrounding Subnet Host Nodes */}
        {leafNodes.map((node, idx) => {
          const angle =
            (idx / Math.max(1, leafNodes.length)) * 2 * Math.PI - Math.PI / 2;
          const nx = cx + Math.cos(angle) * radius * 1.38;
          const ny = cy + Math.sin(angle) * radius * 0.92;
          const isLocal = node.ip_address === localIp || node.is_local_host;
          const isSel = selectedIp === node.ip_address;
          const borderCol = !node.is_online
            ? "#EF4444"
            : isSel || isLocal
              ? "#1E6BFF"
              : (node.last_rtt_ms ?? 0) > 50
                ? "#F59E0B"
                : (node.last_rtt_ms ?? 0) > 0
                  ? "#10B981"
                  : "#94A3B8";

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
                x={nx - 70}
                y={ny - 26}
                width="140"
                height="52"
                rx="14"
                fill={isSel ? "#1E6BFF" : "#FFFFFF"}
                stroke={borderCol}
                strokeWidth={isSel ? "2.8" : "2"}
              />
              <text
                x={nx}
                y={ny - 7}
                fill={isSel ? "#FFFFFF" : "#0F172A"}
                fontSize="10.5"
                fontWeight="700"
                textAnchor="middle"
              >
                {node.hostname.slice(0, 16)}
              </text>
              <text
                x={nx}
                y={ny + 8}
                fill={isSel ? "#DBEAFE" : "#1E6BFF"}
                fontSize="9.5"
                fontWeight="700"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {node.ip_address}
              </text>
              <text
                x={nx}
                y={ny + 20}
                fill={isSel ? "#BFDBFE" : "#64748B"}
                fontSize="8.5"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {node.vendor.slice(0, 18)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * 5. OSI Protocol Distribution Donut Chart (Clean Hyper Blue & Emerald Palette)
 */
export function OsiProtocolDonutChart({
  protocolCounts,
  title = "OSI Protocol Distribution",
}: {
  protocolCounts?: Record<string, number>;
  title?: string;
}) {
  const hasData =
    protocolCounts &&
    Object.keys(protocolCounts).length > 0 &&
    Object.values(protocolCounts).some((v) => v > 0);

  if (!hasData) {
    return (
      <div className="w-full flex flex-col items-center justify-center p-8 text-center bg-[#FAFBFD] rounded-2xl border border-slate-200/80 space-y-1.5">
        <span className="text-xs font-heading font-medium text-slate-700">
          {title}
        </span>
        <span className="text-xs font-typewriter text-slate-400">
          -- No packet capture data recorded yet --
        </span>
      </div>
    );
  }

  const raw = protocolCounts;

  const colorMap: Record<string, string> = {
    TCP: "#1E6BFF",
    UDP: "#38BDF8",
    ICMP: "#10B981",
    ARP: "#6366F1",
    HTTP: "#0EA5E9",
    DNS: "#F59E0B",
    HTTPS: "#2563EB",
  };

  const entries = Object.entries(raw).map(([name, count]) => ({
    name,
    count,
    color: colorMap[name.toUpperCase()] || "#64748B",
  }));

  const total = entries.reduce((acc, e) => acc + e.count, 0) || 1;

  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulated = 0;
  const slices = entries.map((e) => {
    const fraction = e.count / total;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -accumulated * circumference;
    accumulated += fraction;
    return {
      ...e,
      fraction,
      percentage: Math.round(fraction * 100),
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="w-full space-y-3">
      {title && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-800 font-heading font-semibold text-sm">{title}</span>
          <span className="text-blue-600 font-typewriter font-medium text-xs">
            {total} Total Frames
          </span>
        </div>
      )}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-5 py-2">
        <div className="relative w-[144px] h-[144px] shrink-0">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#EFF4FB"
              strokeWidth={strokeWidth}
            />
            {slices.map((slice) => (
              <circle
                key={slice.name}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={strokeWidth}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center font-typewriter pointer-events-none">
            <span className="text-2xl font-semibold text-slate-900">{total}</span>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
              Packets
            </span>
          </div>
        </div>

        <div className="w-full sm:flex-1 space-y-2 text-xs">
          {slices.map((s) => (
            <div key={s.name} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 truncate font-heading font-medium text-slate-700">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span>{s.name}</span>
              </span>
              <span className="font-typewriter text-slate-500">
                <strong className="text-slate-900 font-medium">{s.count}</strong> ({s.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
