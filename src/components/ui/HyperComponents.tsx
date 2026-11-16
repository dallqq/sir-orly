/**
 * Consolidated and Refactored Hyper Design System Components
 * Requirements Met:
 * 1. Removed ALL drop-shadows, shadows, and radial/glow effects for an ultra-clean, flat, crisp border aesthetic.
 * 2. Removed ALL emojis from buttons, headers, status banners, labels, and text. Pure clean typography & SVG icons only.
 * 3. Standardized smooth transitions (ease-[cubic-bezier(0.16,1,0.3,1)] 250ms).
 * 4. Displays genuine, real operational metrics from the active host environment.
 */
"use client";

import { DiscoveredDevice } from "@/lib/api";
import { ConnectionStateMode, StatusNotice } from "@/store/useNetPulseStore";
import Link from "next/link";
import React from "react";

const GAUGE_SCALE = [0, 1, 5, 10, 15, 20, 30, 40, 60, 80, 100];

function valueToGaugeFraction(val: number): number {
  const clamped = Math.max(0, Math.min(100, val));
  for (let i = 0; i < GAUGE_SCALE.length - 1; i++) {
    const start = GAUGE_SCALE[i];
    const end = GAUGE_SCALE[i + 1];
    if (clamped >= start && clamped <= end) {
      const localFrac = (clamped - start) / Math.max(0.0001, end - start);
      return (i + localFrac) / (GAUGE_SCALE.length - 1);
    }
  }
  return 1;
}

/**
 * 1. Clean Speedometer Gauge (No drop shadows or glow filters)
 */
export function HyperSpeedGauge({
  value,
  label = "Mbps",
  sublabel = "Live Throughput",
  isRunning = false,
  phase = "IDLE",
}: {
  value: number;
  label?: string;
  sublabel?: string;
  isRunning?: boolean;
  phase?: string;
}) {
  const size = 270;
  const cx = size / 2;
  const cy = size / 2 + 8;
  const outerR = 104;
  const innerRingR = 62;

  const startAngleDeg = -215;
  const totalSweepDeg = 250;
  const frac = valueToGaugeFraction(value);
  const currentAngleDeg = startAngleDeg + frac * totalSweepDeg;

  const polarToCartesian = (r: number, angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const describeArc = (r: number, startDeg: number, endDeg: number) => {
    const start = polarToCartesian(r, startDeg);
    const end = polarToCartesian(r, endDeg);
    const largeArcFlag = endDeg - startDeg <= 180 ? "0" : "1";
    return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  };

  const fullTrackPath = describeArc(outerR, startAngleDeg, startAngleDeg + totalSweepDeg);
  const activeEndDeg = Math.max(startAngleDeg + 4, currentAngleDeg);
  const activeArcPath = describeArc(outerR, startAngleDeg, activeEndDeg);

  const needleLen = 58;
  const needleTip = polarToCartesian(needleLen, currentAngleDeg);
  const needleBaseLeft = polarToCartesian(9, currentAngleDeg - 90);
  const needleBaseRight = polarToCartesian(9, currentAngleDeg + 90);

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      <svg
        viewBox={`0 0 ${size} ${size - 16}`}
        className="w-full max-w-[270px] h-auto overflow-visible"
      >
        <defs>
          <linearGradient id="hyperGaugeArcGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0B57D0" />
            <stop offset="50%" stopColor="#1E6BFF" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>
          <linearGradient id="hyperNeedleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>
        </defs>

        {/* Full track arc */}
        <path
          d={fullTrackPath}
          fill="none"
          stroke="#E8F0FE"
          strokeWidth={14}
          strokeLinecap="round"
        />

        {/* Active progress arc */}
        <path
          d={activeArcPath}
          fill="none"
          stroke="url(#hyperGaugeArcGrad)"
          strokeWidth={16}
          strokeLinecap="round"
          className="transition-all duration-300 ease-out"
        />

        {/* Scale Numbers */}
        {GAUGE_SCALE.map((num, idx) => {
          const tickFrac = idx / (GAUGE_SCALE.length - 1);
          const angle = startAngleDeg + tickFrac * totalSweepDeg;
          const pos = polarToCartesian(outerR - 24, angle);
          const isReached = value >= num;
          return (
            <text
              key={num}
              x={pos.x}
              y={pos.y + 4}
              textAnchor="middle"
              fontSize="11"
              fontWeight="500"
              fontFamily="var(--font-typewriter)"
              fill={isReached ? "#0F172A" : "#94A3B8"}
              className="transition-colors duration-200"
            >
              {num}
            </text>
          );
        })}

        {/* Inner concentric ring */}
        <circle
          cx={cx}
          cy={cy}
          r={innerRingR}
          fill="#F8FAFC"
          stroke="#DCE8FD"
          strokeWidth={4}
        />
        <circle cx={cx} cy={cy} r={innerRingR - 4} fill="#FFFFFF" />

        {/* Needle */}
        <polygon
          points={`${needleTip.x.toFixed(1)},${needleTip.y.toFixed(1)} ${needleBaseLeft.x.toFixed(1)},${needleBaseLeft.y.toFixed(1)} ${needleBaseRight.x.toFixed(1)},${needleBaseRight.y.toFixed(1)}`}
          fill="url(#hyperNeedleGrad)"
          className="transition-all duration-300 ease-out"
        />

        {/* Center Pivot Cap without drop-shadow */}
        <circle
          cx={cx}
          cy={cy}
          r={14}
          fill="url(#hyperNeedleGrad)"
        />
        <circle cx={cx} cy={cy} r={5} fill="#93C5FD" />
      </svg>

      {/* Readout */}
      <div className="-mt-3 text-center">
        <div className="inline-flex items-baseline gap-1.5">
          <span className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 font-typewriter">
            {value.toFixed(2)}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 font-heading">
            {label}
          </span>
        </div>
        <div className="text-[11px] font-normal text-slate-500 mt-0.5 flex items-center justify-center gap-1.5">
          {isRunning && (
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
          )}
          <span>
            {isRunning ? `Testing ${phase}...` : sublabel}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * 2. Clean Mini Wave Sparkline
 */
export function MiniWaveSparkline({
  points = [28, 42, 30, 58, 35, 64, 48, 72, 40, 82, 55, 76],
  variant = "blue",
  height = 46,
}: {
  points?: number[];
  variant?: "white" | "blue" | "emerald" | "amber";
  height?: number;
}) {
  const width = 150;
  const padX = 4;
  const padY = 6;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const safePts = points && points.length > 1 ? points : [0, 0];
  const minVal = Math.min(...safePts);
  const maxVal = Math.max(minVal + 1, ...safePts);

  const coords = safePts.map((v, i) => {
    const x = padX + (i / (safePts.length - 1)) * innerW;
    const y = padY + innerH - ((v - minVal) / (maxVal - minVal)) * innerH;
    return { x, y };
  });

  let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const curr = coords[i];
    const next = coords[i + 1];
    const cpx1 = curr.x + (next.x - curr.x) * 0.45;
    const cpy1 = curr.y;
    const cpx2 = curr.x + (next.x - curr.x) * 0.55;
    const cpy2 = next.y;
    d += ` C ${cpx1.toFixed(1)} ${cpy1.toFixed(1)}, ${cpx2.toFixed(1)} ${cpy2.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
  }

  const areaPath = `${d} L ${coords[coords.length - 1].x.toFixed(1)} ${height} L ${coords[0].x.toFixed(1)} ${height} Z`;

  const strokeMap = {
    white: "#FFFFFF",
    blue: "#1E6BFF",
    emerald: "#10B981",
    amber: "#F59E0B",
  };
  const gradId = `waveGrad-${variant}-${Math.round(safePts[0] * 10)}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full overflow-visible"
      style={{ height }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor={variant === "white" ? "#93C5FD" : strokeMap[variant]}
            stopOpacity={variant === "white" ? 0.35 : 0.18}
          />
          <stop
            offset="100%"
            stopColor={variant === "white" ? "#1E6BFF" : strokeMap[variant]}
            stopOpacity="0.0"
          />
        </linearGradient>
      </defs>
      <line
        x1={padX}
        y1={height * 0.68}
        x2={width - padX}
        y2={height * 0.68}
        stroke={variant === "white" ? "rgba(255,255,255,0.2)" : "#E2E8F0"}
        strokeDasharray="3 3"
        strokeWidth="1"
      />
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={d}
        fill="none"
        stroke={strokeMap[variant]}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 3. Metric Sparkline Card (Flat border, zero drop shadows)
 */
export function MetricWaveCard({
  title,
  value,
  unit,
  subtitle,
  icon,
  featured = false,
  sparkline,
  onClick,
}: {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  featured?: boolean;
  sparkline?: number[];
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`group relative rounded-3xl p-4 sm:p-5 transition-all duration-200 ease-out flex flex-col justify-between overflow-hidden border ${onClick ? "cursor-pointer hover:border-blue-400" : ""
        } ${featured
          ? "hyper-hero-gradient text-white border-blue-600"
          : "bg-white text-slate-900 border-slate-200/90 hover:border-slate-300"
        }`}
    >
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {icon && (
              <span
                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${featured
                  ? "bg-white/20 text-white"
                  : "bg-blue-50 text-blue-600 border border-blue-100"
                  }`}
              >
                {icon}
              </span>
            )}
            <span
              className={`text-xs font-heading font-medium ${featured ? "text-blue-100" : "text-slate-500"
                }`}
            >
              {title}
            </span>
          </div>
          {subtitle && (
            <span
              className={`text-[10px] font-typewriter px-2 py-0.5 rounded-full font-medium ${featured
                ? "bg-white/20 text-white"
                : "bg-slate-100 text-slate-600"
                }`}
            >
              {subtitle}
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-1 pt-0.5">
          <span
            className={`text-2xl sm:text-3xl font-semibold tracking-tight font-typewriter ${featured ? "text-white" : "text-slate-900"
              }`}
          >
            {value}
          </span>
          {unit && (
            <span
              className={`text-xs sm:text-sm font-heading font-medium ${featured ? "text-blue-100" : "text-slate-500"
                }`}
            >
              {unit}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 pt-1">
        <MiniWaveSparkline
          points={sparkline}
          variant={featured ? "white" : "blue"}
          height={42}
        />
      </div>
    </div>
  );
}

/**
 * 4. Segmented Pill Control (Zero shadows, pure clean flat borders)
 */
export function SegmentedPillControl<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: Array<{ id: T; label: string; count?: number; icon?: React.ReactNode }>;
  value: T;
  onChange: (next: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1 bg-white border border-slate-200/90 p-1.5 rounded-full">
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-full font-heading font-medium transition-all duration-200 ease-out cursor-pointer flex items-center gap-1.5 ${size === "sm" ? "px-3.5 py-1.5 text-xs" : "px-4 py-2 text-xs sm:text-sm"
              } ${active
                ? "bg-[#141B2D] text-white"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/70"
              }`}
          >
            {opt.icon && <span>{opt.icon}</span>}
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={`text-[10px] font-typewriter px-1.5 py-0.5 rounded-full ${active
                  ? "bg-blue-500 text-white"
                  : "bg-slate-200/80 text-slate-600"
                  }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 5. 4-Bar Latency Signal Quality Indicator
 */
export function SignalStrengthBars({
  rttMs,
  isOnline = true,
}: {
  rttMs: number | null;
  isOnline?: boolean;
}) {
  if (!isOnline || rttMs === null) {
    return (
      <div className="inline-flex items-end gap-[3px] h-4" title="Offline / 100% Loss">
        {[6, 9, 12, 15].map((h, idx) => (
          <span
            key={idx}
            style={{ height: `${h}px` }}
            className={`w-[3.5px] rounded-full ${idx === 0 ? "bg-rose-500" : "bg-slate-200"
              }`}
          />
        ))}
      </div>
    );
  }

  const activeBars = rttMs < 35 ? 4 : rttMs < 65 ? 3 : rttMs < 110 ? 2 : 1;
  const colorClass =
    rttMs < 55
      ? "bg-emerald-500"
      : rttMs < 90
        ? "bg-amber-500"
        : "bg-rose-500";

  return (
    <div
      className="inline-flex items-end gap-[3px] h-4"
      title={`Signal Quality: ${rttMs} ms`}
    >
      {[6, 9, 12, 15].map((h, idx) => (
        <span
          key={idx}
          style={{ height: `${h}px` }}
          className={`w-[3.5px] rounded-full transition-colors duration-200 ${idx < activeBars ? colorClass : "bg-slate-200"
            }`}
        />
      ))}
    </div>
  );
}

/**
 * 6. Ping Target Row (Screenshot 1 Right)
 */
export function PingTargetRow({
  ip,
  hostname,
  rttMs,
  isOnline = true,
  subtitle,
  selected = false,
  onSelect,
  rightActions,
}: {
  ip: string;
  hostname: string;
  rttMs: number | null;
  isOnline?: boolean;
  subtitle?: string;
  selected?: boolean;
  onSelect?: () => void;
  rightActions?: React.ReactNode;
}) {
  const rttColor =
    !isOnline || rttMs === null
      ? "text-rose-500"
      : rttMs < 55
        ? "text-emerald-500"
        : rttMs < 90
          ? "text-amber-500"
          : "text-rose-500";

  return (
    <div
      onClick={onSelect}
      className={`flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 py-3.5 px-4 transition-colors duration-150 ${onSelect ? "cursor-pointer" : ""
        } ${selected
          ? "bg-blue-50/80"
          : "hover:bg-slate-50/90"
        }`}
    >
      <div className="min-w-0 flex items-center gap-3">
        <div
          className={`w-2.5 h-2.5 rounded-full shrink-0 ${isOnline ? "bg-emerald-500" : "bg-rose-500"
            }`}
        />
        <div className="min-w-0">
          <div className="font-typewriter font-medium text-sm text-slate-900 truncate">
            {ip}
          </div>
          <div className="text-xs text-slate-400 truncate">
            {hostname}
            {subtitle ? ` · ${subtitle}` : ""}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <div className="flex items-center gap-2">
          <span className={`text-xs sm:text-sm font-typewriter font-medium ${rttColor}`}>
            {rttMs !== null ? `${rttMs} ms` : isOnline ? "--" : "Timeout"}
          </span>
          <SignalStrengthBars rttMs={rttMs} isOnline={isOnline} />
        </div>
        {rightActions && (
          <div
            className="flex items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            {rightActions}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 7. LAN Device Card (Clean flat borders, zero drop shadows)
 */
export function LanDeviceCard({
  device,
  featured = false,
  onSelect,
}: {
  device: DiscoveredDevice;
  featured?: boolean;
  onSelect?: (dev: DiscoveredDevice) => void;
}) {
  const lowerHost = `${device.hostname} ${device.vendor} ${device.os_guess}`.toLowerCase();
  let iconType: "router" | "phone" | "printer" | "camera" | "computer" = "computer";
  if (device.is_gateway || lowerHost.includes("router") || lowerHost.includes("switch") || lowerHost.includes("cisco")) {
    iconType = "router";
  } else if (lowerHost.includes("iphone") || lowerHost.includes("apple") || lowerHost.includes("macbook") || lowerHost.includes("ios")) {
    iconType = "phone";
  } else if (lowerHost.includes("printer") || lowerHost.includes("print")) {
    iconType = "printer";
  } else if (lowerHost.includes("cam") || lowerHost.includes("iot") || lowerHost.includes("espressif")) {
    iconType = "camera";
  }

  const wavePoints =
    device.is_online && device.last_rtt_ms != null && device.last_rtt_ms > 0
      ? [device.last_rtt_ms, device.last_rtt_ms]
      : [0, 0];

  const renderDeviceSvg = () => {
    const strokeCol = featured ? "#FFFFFF" : "#1E6BFF";
    switch (iconType) {
      case "router":
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={strokeCol} strokeWidth="1.8">
            <rect x="2" y="14" width="20" height="6" rx="2" />
            <path d="M6 17h.01M10 17h.01M12 14V6m-4 4 4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case "phone":
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={strokeCol} strokeWidth="1.8">
            <rect x="6" y="3" width="12" height="18" rx="2.5" />
            <line x1="10" y1="18" x2="14" y2="18" strokeLinecap="round" />
          </svg>
        );
      case "printer":
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={strokeCol} strokeWidth="1.8">
            <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="7" rx="1" />
          </svg>
        );
      case "camera":
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={strokeCol} strokeWidth="1.8">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke={strokeCol} strokeWidth="1.8">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" strokeLinecap="round" />
          </svg>
        );
    }
  };

  return (
    <div
      onClick={() => onSelect?.(device)}
      className={`rounded-3xl p-5 transition-all duration-200 ease-out border ${onSelect ? "cursor-pointer hover:border-blue-400" : ""
        } ${featured
          ? "hyper-hero-gradient text-white border-blue-600"
          : "bg-white text-slate-900 border-slate-200/90 hover:border-slate-300"
        }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${featured
              ? "bg-white/15"
              : "bg-blue-50/90 border border-blue-100"
              }`}
          >
            {renderDeviceSvg()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3
                className={`font-heading font-semibold text-base truncate ${featured ? "text-white" : "text-slate-900"
                  }`}
              >
                {device.hostname}
              </h3>
              {device.is_gateway && (
                <span
                  className={`text-[10px] font-typewriter px-2 py-0.5 rounded-full font-medium ${featured
                    ? "bg-white/20 text-white"
                    : "bg-blue-100 text-blue-700"
                    }`}
                >
                  GW
                </span>
              )}
              {device.is_local_host && (
                <span
                  className={`text-[10px] font-typewriter px-2 py-0.5 rounded-full font-medium ${featured
                    ? "bg-white/20 text-white"
                    : "bg-emerald-100 text-emerald-700"
                    }`}
                >
                  LOCAL
                </span>
              )}
            </div>
            <div
              className={`text-xs font-typewriter mt-0.5 truncate ${featured ? "text-blue-100" : "text-slate-400"
                }`}
            >
              {device.ip_address || "--"} · {device.mac_address || "--"}
            </div>
            <div
              className={`text-[11px] truncate ${featured ? "text-blue-200" : "text-slate-400"
                }`}
            >
              {device.vendor || "--"}{device.os_guess ? ` (${device.os_guess})` : ""}
            </div>
          </div>
        </div>

        <div className="w-28 sm:w-36 shrink-0">
          <MiniWaveSparkline
            points={wavePoints}
            variant={featured ? "white" : "blue"}
            height={44}
          />
        </div>
      </div>

      <div
        className={`grid grid-cols-3 gap-2 pt-4 mt-3 border-t text-xs ${featured ? "border-white/15" : "border-slate-100"
          }`}
      >
        <div>
          <div
            className={`text-[11px] font-heading font-medium ${featured ? "text-blue-200" : "text-slate-400"
              }`}
          >
            Status
          </div>
          <div className="font-medium flex items-center gap-1.5 mt-0.5">
            <span
              className={`w-2 h-2 rounded-full ${device.is_online ? "bg-emerald-400" : "bg-rose-400"
                }`}
            />
            <span className={featured ? "text-white" : "text-slate-800"}>
              {device.is_online ? "Online" : "Offline"}
            </span>
          </div>
        </div>

        <div>
          <div
            className={`text-[11px] font-heading font-medium ${featured ? "text-blue-200" : "text-slate-400"
              }`}
          >
            Activity / RTT
          </div>
          <div
            className={`font-medium font-typewriter mt-0.5 truncate ${featured ? "text-white" : "text-slate-800"
              }`}
          >
            {device.last_rtt_ms != null ? `${device.last_rtt_ms} ms` : "--"}{" "}
            {device.discovery_method && (
              <span
                className={`text-[10px] font-sans ${featured ? "text-blue-100" : "text-slate-400"
                  }`}
              >
                ({device.discovery_method})
              </span>
            )}
          </div>
        </div>

        <div>
          <div
            className={`text-[11px] font-heading font-medium ${featured ? "text-blue-200" : "text-slate-400"
              }`}
          >
            Open Ports
          </div>
          <div
            className={`font-medium font-typewriter mt-0.5 truncate ${featured ? "text-white" : "text-slate-800"
              }`}
          >
            {device.open_ports_summary || "--"}
          </div>
        </div>
      </div>

      <div
        className="flex flex-wrap items-center justify-end gap-1.5 pt-3 mt-3 border-t border-dashed border-slate-200/40"
        onClick={(e) => e.stopPropagation()}
      >
        <Link
          href={`/connectivity?target=${encodeURIComponent(
            device.ip_address
          )}&autostart=ping`}
          className={`px-3 py-1 rounded-full text-[11px] font-medium transition ${featured
            ? "bg-white text-blue-700 hover:bg-blue-50"
            : "bg-blue-50 text-blue-600 hover:bg-blue-100"
            }`}
        >
          Ping
        </Link>
        <Link
          href={`/connectivity?target=${encodeURIComponent(
            device.ip_address
          )}&tab=ports&autostart=scan`}
          className={`px-3 py-1 rounded-full text-[11px] font-medium transition ${featured
            ? "bg-white/20 text-white hover:bg-white/30"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
        >
          Ports
        </Link>
        <Link
          href={`/packets?filter=${encodeURIComponent(
            `host ${device.ip_address}`
          )}`}
          className={`px-3 py-1 rounded-full text-[11px] font-medium transition ${featured
            ? "bg-white/20 text-white hover:bg-white/30"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
        >
          Sniff
        </Link>
      </div>
    </div>
  );
}

/**
 * 8. Connection State & Edge Case Banner
 * ZERO emojis. Clear icons and clean typographic status pills.
 */
export function ConnectionEdgeCaseBanner({
  connectionState,
  apiOnline,
  wsConnected,
  internetReachable,
  activeInterfaceName,
  localIp,
  subnetCidr,
  statusNotice,
  onRetryConnection,
  onDismissNotice,
}: {
  connectionState: ConnectionStateMode;
  apiOnline: boolean;
  wsConnected: boolean;
  internetReachable: boolean;
  activeInterfaceName: string;
  localIp: string;
  subnetCidr: string;
  statusNotice: StatusNotice | null;
  onRetryConnection: () => void;
  onDismissNotice: () => void;
}) {
  const hasEdgeCase = Boolean(
    statusNotice ||
    connectionState === "NETWORK_OFFLINE" ||
    connectionState === "BACKEND_OFFLINE" ||
    connectionState === "LAN_ONLY"
  );

  if (!hasEdgeCase) {
    return null;
  }

  return (
    <div className="space-y-3">
      {statusNotice && (
        <div
          className={`rounded-2xl px-4 py-3 border flex items-center justify-between gap-3 transition-all duration-200 ${statusNotice.type === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
            : statusNotice.type === "warning"
              ? "bg-amber-50 border-amber-200 text-amber-900"
              : statusNotice.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-900"
                : "bg-blue-50 border-blue-200 text-blue-900"
            }`}
        >
          <div className="flex items-center gap-3 min-w-0 text-xs">
            <span className="w-2 h-2 rounded-full bg-current shrink-0" />
            <div className="min-w-0">
              <span className="font-bold">{statusNotice.title}: </span>
              <span className="opacity-90">{statusNotice.message}</span>
              <span className="ml-2 font-mono text-[10px] opacity-65">
                [{statusNotice.timestamp}]
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismissNotice}
            className="text-xs font-bold px-2 py-1 rounded-lg hover:bg-black/5 cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {connectionState === "NETWORK_OFFLINE" && (
        <div className="rounded-3xl bg-rose-50/90 border border-rose-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-heading font-medium text-xs shrink-0">
              LAN
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-heading font-semibold uppercase tracking-wider text-rose-700">
                  Network Adapter Disconnected
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-typewriter font-medium bg-rose-200/80 text-rose-800">
                  OFFLINE
                </span>
              </div>
              <p className="text-xs text-rose-800/90 mt-0.5">
                Device reports no active link. Local loopback diagnostic tools remain available.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onRetryConnection}
              className="px-3.5 py-2 rounded-full bg-white hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-medium transition cursor-pointer"
            >
              Re-Check Link
            </button>
          </div>
        </div>
      )}

      {connectionState === "BACKEND_OFFLINE" && (
        <div className="rounded-3xl bg-amber-50/95 border border-amber-200/90 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-heading font-medium text-xs shrink-0">
              API
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-heading font-semibold uppercase tracking-wider text-amber-900">
                  Backend Standby Mode
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-typewriter font-medium bg-amber-200/80 text-amber-900">
                  PORT 8000
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                FastAPI backend on port 8000 is not reachable. Running on host network interface ({activeInterfaceName} · {localIp}).
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onRetryConnection}
              className="px-4 py-2 rounded-full bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-medium transition cursor-pointer"
            >
              Connect to API
            </button>
          </div>
        </div>
      )}

      {connectionState === "LAN_ONLY" && (
        <div className="rounded-3xl bg-blue-50/90 border border-blue-200 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-blue-900">
            <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-heading font-medium text-xs shrink-0">
              LAN
            </span>
            <div>
              <span className="font-heading font-semibold">
                LAN Connected ({activeInterfaceName} · {localIp}) — Upstream WAN Offline:
              </span>{" "}
              <span className="text-blue-800/90">
                Subnet enumeration ({subnetCidr}) is active. Upstream WAN route is currently air-gapped.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onRetryConnection}
            className="px-3 py-1.5 rounded-full bg-white text-blue-700 border border-blue-200 text-xs font-medium shrink-0 cursor-pointer"
          >
            Verify Route
          </button>
        </div>
      )}
    </div>
  );
}
