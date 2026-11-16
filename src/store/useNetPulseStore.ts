"use client";

import {
  DiscoveredDevice,
  HostQoSStats,
  NetworkInterfaceInfo,
  PingSequenceReply,
  PortScanResult,
  SecurityAlert,
  SystemHealthResponse,
  WS_MONITOR_URL,
  netpulseApi,
} from "@/lib/api";
import { useCallback, useEffect, useState } from "react";

export interface TelemetryPoint {
  time: string;
  avg_rtt_ms: number;
  max_rtt_ms: number;
  jitter_ms: number;
  tx_kbps: number;
  rx_kbps: number;
}

export interface StatusNotice {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: string;
}

export interface SpeedBenchmarkState {
  isRunning: boolean;
  phase: "IDLE" | "PING" | "DOWNLOAD" | "UPLOAD" | "COMPLETE";
  progressPct: number;
  gaugeValue: number;
  downloadMbps: number;
  uploadMbps: number;
  pingMs: number;
  jitterMs: number;
  serverName: string;
  locationLabel: string;
}

export type ConnectionStateMode =
  | "FULL_ONLINE"
  | "LAN_ONLY"
  | "BACKEND_OFFLINE"
  | "NETWORK_OFFLINE"
  | "RECONNECTING";

const DEFAULT_NIC: NetworkInterfaceInfo = {
  interface_name: "--",
  local_ip: "--",
  netmask: "--",
  mac_address: "--",
  gateway_ip: "--",
  subnet_cidr: "--",
  true_cidr: "--",
  network_address: "--",
  broadcast_address: "--",
  first_usable_ip: "--",
  last_usable_ip: "--",
  usable_hosts: 0,
  is_large_subnet_capped: false,
  is_up: false,
  is_virtual: false,
  speed_mbps: 0,
  score: 0,
};

let globalListeners: Array<() => void> = [];

interface GlobalStoreState {
  browserOnline: boolean;
  apiOnline: boolean;
  isCheckingApi: boolean;
  wsConnected: boolean;
  internetReachable: boolean;
  connectionState: ConnectionStateMode;
  lastSyncAt: string | null;
  statusNotice: StatusNotice | null;
  isScanning: boolean;
  scanProgressPct: number;
  scanStage: string;
  health: SystemHealthResponse | null;
  activeInterface: NetworkInterfaceInfo;
  interfaces: NetworkInterfaceInfo[];
  devices: DiscoveredDevice[];
  qosStats: HostQoSStats[];
  securityScore: number;
  securityGrade: string;
  securityAlerts: SecurityAlert[];
  pingStream: PingSequenceReply[];
  telemetrySeries: TelemetryPoint[];
  txKbps: number;
  rxKbps: number;
  totalMbSent: number;
  totalMbRecv: number;
  speedBenchmark: SpeedBenchmarkState;
}

let state: GlobalStoreState = {
  browserOnline: true,
  apiOnline: false,
  isCheckingApi: true,
  wsConnected: false,
  internetReachable: true,
  connectionState: "RECONNECTING",
  lastSyncAt: null,
  statusNotice: null,
  isScanning: false,
  scanProgressPct: 0,
  scanStage: "IDLE",
  health: null,
  activeInterface: DEFAULT_NIC,
  interfaces: [DEFAULT_NIC],
  devices: [],
  qosStats: [],
  securityScore: 0,
  securityGrade: "--",
  securityAlerts: [],
  pingStream: [],
  telemetrySeries: [],
  txKbps: 0,
  rxKbps: 0,
  totalMbSent: 0,
  totalMbRecv: 0,
  speedBenchmark: {
    isRunning: false,
    phase: "IDLE",
    progressPct: 0,
    gaugeValue: 0,
    downloadMbps: 0,
    uploadMbps: 0,
    pingMs: 0,
    jitterMs: 0,
    serverName: "--",
    locationLabel: "--",
  },
};

function computeConnectionState(
  browserOnline: boolean,
  apiOnline: boolean,
  internetReachable: boolean,
  isChecking: boolean
): ConnectionStateMode {
  if (!browserOnline) return "NETWORK_OFFLINE";
  if (isChecking && !apiOnline) return "RECONNECTING";
  if (!apiOnline) return "BACKEND_OFFLINE";
  if (!internetReachable) return "LAN_ONLY";
  return "FULL_ONLINE";
}

function setState(partial: Partial<GlobalStoreState>) {
  const next = { ...state, ...partial };
  next.connectionState = computeConnectionState(
    next.browserOnline,
    next.apiOnline,
    next.internetReachable,
    next.isCheckingApi
  );
  state = next;
  globalListeners.forEach((l) => l());
}

export function postStatusNotice(
  type: StatusNotice["type"],
  title: string,
  message: string
) {
  setState({
    statusNotice: {
      id: `${Date.now()}`,
      type,
      title,
      message,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    },
  });
}

let wsInstance: WebSocket | null = null;
let initialized = false;
let benchmarkTimer: ReturnType<typeof setInterval> | null = null;

export async function refreshAllNetworkData(preferredNic?: string, showToastOnSuccess = false) {
  setState({ isCheckingApi: true });
  try {
    const [healthRes, ifaceRes, devRes, statsRes, secRes] = await Promise.all([
      netpulseApi.getHealth(),
      netpulseApi.getInterfaces(preferredNic),
      netpulseApi.getDevices(),
      netpulseApi.getNetworkStats(),
      netpulseApi.getSecurityRecommendations(),
    ]);

    const activeNic = ifaceRes.active_interface;
    const isWanReachable =
      healthRes.network_status?.internet_reachable ??
      ifaceRes.internet_reachable ??
      !activeNic.local_ip.startsWith("127.");

    const validStats = statsRes.stats.filter((s) => s.avg_latency_ms > 0);
    const avgPing =
      validStats.length > 0
        ? Math.round(
            validStats.reduce((a, b) => a + b.avg_latency_ms, 0) / validStats.length
          )
        : 0;
    const avgJitter =
      validStats.length > 0
        ? Math.round(
            validStats.reduce((a, b) => a + b.jitter_ms, 0) / validStats.length
          )
        : 0;

    setState({
      apiOnline: true,
      isCheckingApi: false,
      internetReachable: Boolean(isWanReachable && state.browserOnline),
      lastSyncAt: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      health: healthRes,
      activeInterface: activeNic,
      interfaces: ifaceRes.interfaces,
      devices: devRes.devices,
      qosStats: statsRes.stats,
      securityScore: secRes.security_score,
      securityGrade: secRes.security_grade,
      securityAlerts: secRes.recommendations,
      speedBenchmark: {
        ...state.speedBenchmark,
        pingMs: avgPing,
        jitterMs: avgJitter,
        serverName:
          activeNic.interface_name !== "--"
            ? `HYPERNET · ${activeNic.interface_name.toUpperCase()}`
            : "--",
        locationLabel:
          activeNic.local_ip !== "--"
            ? `${activeNic.local_ip} (${activeNic.subnet_cidr})`
            : "--",
      },
    });

    if (showToastOnSuccess) {
      postStatusNotice(
        "success",
        "Connected to Python FastAPI Backend",
        `Synchronized live telemetry on ${activeNic.interface_name} (${activeNic.local_ip}).`
      );
    }
  } catch {
    setState({
      apiOnline: false,
      isCheckingApi: false,
      wsConnected: false,
    });
    if (showToastOnSuccess) {
      postStatusNotice(
        "warning",
        "Backend API Unreachable (Port 8000)",
        "FastAPI backend is offline. Start backend on port 8000 for live network telemetry."
      );
    }
  }
}

function connectTelemetryWebSocket() {
  if (typeof window === "undefined" || wsInstance) return;

  try {
    const ws = new WebSocket(WS_MONITOR_URL);
    wsInstance = ws;

    ws.onopen = () => {
      setState({ wsConnected: true, apiOnline: true, isCheckingApi: false });
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const nowStr = new Date().toLocaleTimeString([], {
          hour12: false,
          minute: "2-digit",
          second: "2-digit",
        });

        if (msg.type === "connected" && msg.data?.bandwidth) {
          const bw = msg.data.bandwidth;
          setState({
            txKbps: bw.tx_kbps ?? state.txKbps,
            rxKbps: bw.rx_kbps ?? state.rxKbps,
            totalMbSent: bw.total_mb_sent ?? state.totalMbSent,
            totalMbRecv: bw.total_mb_recv ?? state.totalMbRecv,
          });
        } else if (msg.type === "telemetry_tick" && msg.data) {
          const bw = msg.data.bandwidth || {};
          const summary = msg.data.summary || {};
          const hosts: Array<{ max_latency_ms?: number; jitter_ms?: number }> =
            msg.data.hosts || [];
          const maxHostRtt = hosts.reduce(
            (acc, h) => Math.max(acc, h.max_latency_ms || 0),
            summary.avg_latency_ms || 0
          );
          const avgJitter =
            hosts.length > 0
              ? Number(
                  (
                    hosts.reduce((acc, h) => acc + (h.jitter_ms || 0), 0) /
                    hosts.length
                  ).toFixed(2)
                )
              : 0;

          const nextPoint: TelemetryPoint = {
            time: nowStr,
            avg_rtt_ms: summary.avg_latency_ms || 0,
            max_rtt_ms: Number(maxHostRtt.toFixed(2)),
            jitter_ms: avgJitter,
            tx_kbps: bw.tx_kbps ?? 0,
            rx_kbps: bw.rx_kbps ?? 0,
          };

          // Calculate live throughput in Mbps directly from real bandwidth readings
          const liveRxMbps = Number(((bw.rx_kbps || 0) / 1000).toFixed(2));
          const liveTxMbps = Number(((bw.tx_kbps || 0) / 1000).toFixed(2));

          setState({
            txKbps: bw.tx_kbps ?? state.txKbps,
            rxKbps: bw.rx_kbps ?? state.rxKbps,
            totalMbSent: bw.total_mb_sent ?? state.totalMbSent,
            totalMbRecv: bw.total_mb_recv ?? state.totalMbRecv,
            lastSyncAt: nowStr,
            telemetrySeries: [...state.telemetrySeries.slice(-23), nextPoint],
            speedBenchmark: state.speedBenchmark.isRunning
              ? state.speedBenchmark
              : {
                  ...state.speedBenchmark,
                  gaugeValue: liveRxMbps,
                  downloadMbps: liveRxMbps,
                  uploadMbps: liveTxMbps,
                  pingMs: Math.round(summary.avg_latency_ms || 0),
                  jitterMs: Math.round(avgJitter),
                },
          });
        } else if (msg.type === "scan_progress" && msg.data) {
          const pct = Number(msg.data.progress_pct || 0);
          setState({
            isScanning: pct < 100,
            scanProgressPct: pct,
            scanStage: String(msg.data.stage || "SCANNING"),
          });
        } else if (msg.type === "ping_reply" && msg.data) {
          setState({
            pingStream: [
              msg.data as PingSequenceReply,
              ...state.pingStream.slice(0, 49),
            ],
          });
        }
      } catch {
        // Ignore malformed frame
      }
    };

    ws.onclose = () => {
      wsInstance = null;
      setState({ wsConnected: false });
      setTimeout(() => {
        if (typeof window !== "undefined") connectTelemetryWebSocket();
      }, 4000);
    };

    ws.onerror = () => {
      ws.close();
    };
  } catch {
    setState({ wsConnected: false });
  }
}

export function useNetPulseStore() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    globalListeners.push(listener);

    if (!initialized && typeof window !== "undefined") {
      initialized = true;
      setState({ browserOnline: window.navigator.onLine });

      const handleOnline = () => {
        setState({ browserOnline: true });
        postStatusNotice(
          "success",
          "Network Adapter Online",
          "Browser detected active network connectivity. Synchronizing telemetry..."
        );
        refreshAllNetworkData();
      };

      const handleOffline = () => {
        setState({ browserOnline: false, internetReachable: false });
        postStatusNotice(
          "warning",
          "Internet / Network Disconnected",
          "Your device appears offline. Local LAN diagnostics and cached NOC telemetry remain available."
        );
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      refreshAllNetworkData();
      connectTelemetryWebSocket();
    }

    return () => {
      globalListeners = globalListeners.filter((l) => l !== listener);
    };
  }, []);

  const selectInterface = useCallback(async (ifaceName: string) => {
    await refreshAllNetworkData(ifaceName, true);
  }, []);

  const triggerScan = useCallback(
    async (scanMode: string = "auto", customCidr?: string) => {
      const targetCidr = customCidr || state.activeInterface.subnet_cidr;
      setState({ isScanning: true, scanProgressPct: 18, scanStage: "ARP_L2_SWEEP" });
      try {
        await netpulseApi.scanSubnet({
          cidr: targetCidr,
          interface_name: state.activeInterface.interface_name,
          scan_mode: scanMode,
        });
        await refreshAllNetworkData(state.activeInterface.interface_name);
        postStatusNotice(
          "success",
          "Subnet Discovery Completed",
          `Scanned ${targetCidr} (${scanMode.toUpperCase()}) on ${state.activeInterface.interface_name}.`
        );
      } catch {
        postStatusNotice(
          "error",
          "Subnet Discovery Failed",
          `Unable to complete scan on ${targetCidr}. Ensure backend is active and reachable.`
        );
      } finally {
        setState({ isScanning: false, scanProgressPct: 100, scanStage: "COMPLETED" });
      }
    },
    []
  );

  const runSpeedBenchmark = useCallback(async () => {
    if (benchmarkTimer) {
      clearInterval(benchmarkTimer);
      benchmarkTimer = null;
    }

    setState({
      speedBenchmark: {
        ...state.speedBenchmark,
        isRunning: true,
        phase: "PING",
        progressPct: 10,
        gaugeValue: 0,
      },
    });

    const targetHost =
      state.activeInterface.gateway_ip && state.activeInterface.gateway_ip !== "--"
        ? state.activeInterface.gateway_ip
        : state.activeInterface.local_ip && state.activeInterface.local_ip !== "--"
        ? state.activeInterface.local_ip
        : "127.0.0.1";

    let pingMsVal = 0;
    let jitterMsVal = 0;
    try {
      const res = await netpulseApi.runPing({
        targets: targetHost,
        count: 4,
        packet_size: 64,
        protocol: "auto",
      });
      const first = res.results?.[0];
      if (first && first.avg_latency_ms > 0) {
        pingMsVal = Math.round(first.avg_latency_ms);
        jitterMsVal = Math.round(first.jitter_ms || 0);
      }
    } catch {
      // Keep real 0 or previous
    }

    let tick = 0;
    let maxDl = 0;
    let maxUl = 0;

    benchmarkTimer = setInterval(() => {
      tick += 1;
      const pct = Math.min(100, tick * 10);
      const currentRxMbps = Number(((state.rxKbps || 0) / 1000).toFixed(2));
      const currentTxMbps = Number(((state.txKbps || 0) / 1000).toFixed(2));
      maxDl = Math.max(maxDl, currentRxMbps);
      maxUl = Math.max(maxUl, currentTxMbps);

      if (pct <= 30) {
        setState({
          speedBenchmark: {
            ...state.speedBenchmark,
            isRunning: true,
            phase: "PING",
            progressPct: pct,
            gaugeValue: pingMsVal,
            pingMs: pingMsVal,
            jitterMs: jitterMsVal,
          },
        });
      } else if (pct <= 70) {
        setState({
          speedBenchmark: {
            ...state.speedBenchmark,
            isRunning: true,
            phase: "DOWNLOAD",
            progressPct: pct,
            gaugeValue: currentRxMbps,
            downloadMbps: maxDl,
          },
        });
      } else if (pct < 100) {
        setState({
          speedBenchmark: {
            ...state.speedBenchmark,
            isRunning: true,
            phase: "UPLOAD",
            progressPct: pct,
            gaugeValue: currentTxMbps,
            uploadMbps: maxUl,
          },
        });
      } else {
        if (benchmarkTimer) {
          clearInterval(benchmarkTimer);
          benchmarkTimer = null;
        }
        setState({
          speedBenchmark: {
            ...state.speedBenchmark,
            isRunning: false,
            phase: "COMPLETE",
            progressPct: 100,
            gaugeValue: maxDl,
            downloadMbps: maxDl,
            uploadMbps: maxUl,
            pingMs: pingMsVal,
            jitterMs: jitterMsVal,
          },
        });
        postStatusNotice(
          "success",
          "Speed & QoS Benchmark Complete",
          `Throughput: ${maxDl} Mbps down / ${maxUl} Mbps up · Ping: ${pingMsVal} ms`
        );
      }
    }, 200);
  }, []);

  const stopSpeedBenchmark = useCallback(() => {
    if (benchmarkTimer) {
      clearInterval(benchmarkTimer);
      benchmarkTimer = null;
    }
    setState({
      speedBenchmark: {
        ...state.speedBenchmark,
        isRunning: false,
        phase: "IDLE",
        progressPct: 0,
      },
    });
  }, []);

  const clearPingStream = useCallback(() => {
    setState({ pingStream: [] });
  }, []);

  const dismissNotice = useCallback(() => {
    setState({ statusNotice: null });
  }, []);

  return {
    ...state,
    refreshAllNetworkData,
    selectInterface,
    triggerScan,
    runSpeedBenchmark,
    stopSpeedBenchmark,
    clearPingStream,
    dismissNotice,
    postStatusNotice,
  };
}
