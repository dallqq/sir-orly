"use client";

import {
  DiscoveredDevice,
  HostQoSStats,
  NetworkInterfaceInfo,
  PingSequenceReply,
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

const DEFAULT_NIC: NetworkInterfaceInfo = {
  interface_name: "Wi-Fi",
  local_ip: "192.168.1.105",
  netmask: "255.255.255.0",
  mac_address: "00:1E:67:AA:BB:CC",
  gateway_ip: "192.168.1.1",
  subnet_cidr: "192.168.1.0/24",
  true_cidr: "192.168.1.0/24",
  network_address: "192.168.1.0",
  broadcast_address: "192.168.1.255",
  first_usable_ip: "192.168.1.1",
  last_usable_ip: "192.168.1.254",
  usable_hosts: 254,
  is_large_subnet_capped: false,
  is_up: true,
  is_virtual: false,
  speed_mbps: 866,
  score: 180,
};

let globalListeners: Array<() => void> = [];

interface GlobalStoreState {
  apiOnline: boolean;
  wsConnected: boolean;
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
}

let state: GlobalStoreState = {
  apiOnline: false,
  wsConnected: false,
  isScanning: false,
  scanProgressPct: 0,
  scanStage: "IDLE",
  health: null,
  activeInterface: DEFAULT_NIC,
  interfaces: [DEFAULT_NIC],
  devices: [],
  qosStats: [],
  securityScore: 92,
  securityGrade: "A",
  securityAlerts: [],
  pingStream: [],
  telemetrySeries: [
    { time: "00:00", avg_rtt_ms: 2.4, max_rtt_ms: 5.1, jitter_ms: 0.6, tx_kbps: 142, rx_kbps: 480 },
    { time: "00:02", avg_rtt_ms: 3.1, max_rtt_ms: 7.4, jitter_ms: 0.9, tx_kbps: 215, rx_kbps: 690 },
    { time: "00:04", avg_rtt_ms: 2.8, max_rtt_ms: 6.2, jitter_ms: 0.7, tx_kbps: 184, rx_kbps: 540 },
    { time: "00:06", avg_rtt_ms: 3.5, max_rtt_ms: 9.0, jitter_ms: 1.1, tx_kbps: 260, rx_kbps: 820 },
  ],
  txKbps: 184,
  rxKbps: 540,
};

function setState(partial: Partial<GlobalStoreState>) {
  state = { ...state, ...partial };
  globalListeners.forEach((l) => l());
}

let wsInstance: WebSocket | null = null;
let initialized = false;

export async function refreshAllNetworkData(preferredNic?: string) {
  try {
    const [healthRes, ifaceRes, devRes, statsRes, secRes] = await Promise.all([
      netpulseApi.getHealth(),
      netpulseApi.getInterfaces(preferredNic),
      netpulseApi.getDevices(),
      netpulseApi.getNetworkStats(),
      netpulseApi.getSecurityRecommendations(),
    ]);

    setState({
      apiOnline: true,
      health: healthRes,
      activeInterface: ifaceRes.active_interface,
      interfaces: ifaceRes.interfaces,
      devices: devRes.devices,
      qosStats: statsRes.stats,
      securityScore: secRes.security_score,
      securityGrade: secRes.security_grade,
      securityAlerts: secRes.recommendations,
    });
  } catch {
    setState({ apiOnline: false });
  }
}

function connectTelemetryWebSocket() {
  if (typeof window === "undefined" || wsInstance) return;

  try {
    const ws = new WebSocket(WS_MONITOR_URL);
    wsInstance = ws;

    ws.onopen = () => {
      setState({ wsConnected: true, apiOnline: true });
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const nowStr = new Date().toLocaleTimeString([], {
          hour12: false,
          minute: "2-digit",
          second: "2-digit",
        });

        if (msg.type === "telemetry_tick" && msg.data) {
          const bw = msg.data.bandwidth || {};
          const summary = msg.data.summary || {};
          const hosts: Array<{ max_latency_ms?: number; jitter_ms?: number }> =
            msg.data.hosts || [];
          const maxHostRtt = hosts.reduce(
            (acc, h) => Math.max(acc, h.max_latency_ms || 0),
            summary.avg_latency_ms || 3.2
          );
          const avgJitter =
            hosts.length > 0
              ? Number(
                  (
                    hosts.reduce((acc, h) => acc + (h.jitter_ms || 0.5), 0) /
                    hosts.length
                  ).toFixed(2)
                )
              : 0.65;

          const nextPoint: TelemetryPoint = {
            time: nowStr,
            avg_rtt_ms: summary.avg_latency_ms || 2.4,
            max_rtt_ms: Number(maxHostRtt.toFixed(2)),
            jitter_ms: avgJitter,
            tx_kbps: bw.tx_kbps ?? 120,
            rx_kbps: bw.rx_kbps ?? 340,
          };

          setState({
            txKbps: bw.tx_kbps ?? state.txKbps,
            rxKbps: bw.rx_kbps ?? state.rxKbps,
            telemetrySeries: [...state.telemetrySeries.slice(-23), nextPoint],
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
            pingStream: [msg.data as PingSequenceReply, ...state.pingStream.slice(0, 49)],
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
      }, 3500);
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
      refreshAllNetworkData();
      connectTelemetryWebSocket();
    }

    return () => {
      globalListeners = globalListeners.filter((l) => l !== listener);
    };
  }, []);

  const selectInterface = useCallback(async (ifaceName: string) => {
    await refreshAllNetworkData(ifaceName);
  }, []);

  const triggerScan = useCallback(
    async (scanMode: string = "auto", customCidr?: string) => {
      setState({ isScanning: true, scanProgressPct: 15, scanStage: "SCANNING" });
      try {
        await netpulseApi.scanSubnet({
          cidr: customCidr || state.activeInterface.subnet_cidr,
          interface_name: state.activeInterface.interface_name,
          scan_mode: scanMode,
        });
        await refreshAllNetworkData(state.activeInterface.interface_name);
      } finally {
        setState({ isScanning: false, scanProgressPct: 100, scanStage: "COMPLETED" });
      }
    },
    []
  );

  const triggerSeedCampusLab = useCallback(async () => {
    setState({ isScanning: true, scanProgressPct: 25, scanStage: "SEEDING_CAMPUS_LAB" });
    try {
      await netpulseApi.seedCampusLab();
      await refreshAllNetworkData(state.activeInterface.interface_name);
    } finally {
      setState({ isScanning: false, scanProgressPct: 100, scanStage: "COMPLETED" });
    }
  }, []);

  const clearPingStream = useCallback(() => {
    setState({ pingStream: [] });
  }, []);

  return {
    ...state,
    refreshAllNetworkData,
    selectInterface,
    triggerScan,
    triggerSeedCampusLab,
    clearPingStream,
  };
}

