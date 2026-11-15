/**
 * Canonical Typed REST API Client for NetPulse NOC (`http://localhost:8000/api/v1`)
 * Includes timeout handling and structured error messages for edge cases.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
export const WS_MONITOR_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/monitor";

export interface NetworkInterfaceInfo {
  interface_name: string;
  local_ip: string;
  netmask: string;
  mac_address: string;
  gateway_ip: string;
  subnet_cidr: string;
  true_cidr: string;
  network_address: string;
  broadcast_address: string;
  first_usable_ip: string;
  last_usable_ip: string;
  usable_hosts: number;
  is_large_subnet_capped: boolean;
  is_up: boolean;
  is_virtual: boolean;
  speed_mbps: number;
  score: number;
}

export interface DiscoveredDevice {
  id?: number;
  ip_address: string;
  mac_address: string;
  hostname: string;
  vendor: string;
  os_guess: string;
  interface_name: string;
  subnet_cidr: string;
  is_online: boolean;
  is_gateway: boolean;
  is_local_host: boolean;
  discovery_method: string;
  last_rtt_ms: number | null;
  open_ports_summary: string;
  first_seen?: string;
  last_seen?: string;
}

export interface HostQoSStats {
  id?: number;
  ip_address: string;
  hostname: string;
  packets_sent: number;
  packets_received: number;
  packet_loss_pct: number;
  min_latency_ms: number;
  avg_latency_ms: number;
  max_latency_ms: number;
  jitter_ms: number;
  last_ttl: number | null;
  ping_method: string;
  updated_at?: string;
}

export interface PingSequenceReply {
  ip_address: string;
  hostname: string;
  seq: number;
  count: number;
  bytes: number;
  rtt_ms: number | null;
  ttl: number | null;
  status: "SUCCESS" | "TIMEOUT" | "ERROR";
  protocol: string;
  timestamp: string;
}

export interface PortScanResult {
  id?: number;
  ip_address: string;
  port: number;
  protocol: string;
  state: string;
  service_name: string;
  banner: string;
  osi_layer: string;
  risk_level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  scanned_at?: string;
}

export interface PacketDissection {
  index: number;
  timestamp: string;
  length: number;
  protocol: string;
  src_ip: string;
  dst_ip: string;
  src_mac: string;
  dst_mac: string;
  src_port: number | null;
  dst_port: number | null;
  info: string;
  osi_layers: {
    layer_2_datalink: Record<string, unknown>;
    layer_3_network: Record<string, unknown>;
    layer_4_transport: Record<string, unknown>;
    layer_7_application: Record<string, unknown>;
  };
  hex_dump: string;
}

export interface PcapCaptureSession {
  id: number;
  filename: string;
  file_path: string;
  interface_name: string;
  bpf_filter: string;
  packet_count: number;
  capture_source: string;
  protocol_breakdown_json: string;
  created_at: string;
}

export interface SecurityAlert {
  id?: number;
  category: "CONNECTIVITY" | "AVAILABILITY" | "FIREWALL" | "AUTHENTICATION";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  target_ip: string;
  hostname: string;
  title: string;
  description: string;
  recommendation: string;
  remediation_command: string;
  is_resolved: boolean;
  created_at?: string;
}

export interface DiagnosticReportMeta {
  id: number;
  created_at: string;
  title: string;
  interface_name: string;
  local_ip: string;
  subnet_cidr: string;
  gateway_ip: string;
  total_devices: number;
  online_devices: number;
  avg_subnet_latency_ms: number;
  max_subnet_latency_ms: number;
  overall_packet_loss_pct: number;
  health_score: number;
  security_grade: string;
  summary_text: string;
  report_payload_json: string;
  pdf_path: string;
}

export interface EmailAlertLog {
  id: number;
  recipient_email: string;
  subject: string;
  body_preview: string;
  alert_category: string;
  delivery_mode: string;
  created_at: string;
}

export interface SystemHealthResponse {
  status: string;
  service: string;
  version: string;
  database: {
    mode: string;
    provider: string;
    database_url_masked: string;
    connected: boolean;
    cloud_configured: boolean;
    error: string | null;
  };
  packet_engine: {
    npcap_installed: boolean;
    mode: string;
    wireshark_desktop_available: boolean;
  };
  realtime_monitoring: {
    enabled: boolean;
    interval_seconds: number;
    active_ws_clients: number;
  };
  network_status?: {
    internet_reachable: boolean;
    connection_state: "WAN_ONLINE" | "LAN_ONLY" | "LOOPBACK_OFFLINE" | string;
    outbound_ip: string | null;
    hostname: string;
  };
  active_interface: NetworkInterfaceInfo;
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  timeoutMs: number = 15000
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const errText = await res.text();
      let parsedMsg = errText;
      try {
        const j = JSON.parse(errText);
        if (j?.detail) parsedMsg = String(j.detail);
      } catch {
        // use raw text
      }
      throw new Error(parsedMsg || `HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export const netpulseApi = {
  getHealth: () => apiFetch<SystemHealthResponse>("/health", undefined, 4500),

  setDatabaseMode: (mode: string, cloud_database_url?: string) =>
    apiFetch<{
      mode: string;
      provider: string;
      database_url_masked: string;
      connected: boolean;
      switched: boolean;
      message: string;
    }>("/system/database-mode", {
      method: "POST",
      body: JSON.stringify({ mode, cloud_database_url }),
    }),

  toggleMonitoring: (enabled: boolean) =>
    apiFetch<{ enabled: boolean; interval_seconds: number }>(
      "/system/monitoring-toggle",
      {
        method: "POST",
        body: JSON.stringify({ enabled }),
      }
    ),

  seedCampusLab: () =>
    apiFetch<{
      status: string;
      devices_count: number;
      security_score: number;
      security_grade: string;
    }>("/system/seed-lab", {
      method: "POST",
    }),

  getInterfaces: (interfaceName?: string) =>
    apiFetch<{
      active_interface: NetworkInterfaceInfo;
      interfaces: NetworkInterfaceInfo[];
      hostname: string;
      internet_reachable?: boolean;
      outbound_ip?: string | null;
      connection_state?: string;
    }>(
      `/discovery/interfaces${
        interfaceName ? `?interface_name=${encodeURIComponent(interfaceName)}` : ""
      }`
    ),

  scanSubnet: (params: {
    cidr?: string;
    interface_name?: string;
    scan_mode?: string;
  }) =>
    apiFetch<{
      scan_session: Record<string, unknown>;
      active_interface: NetworkInterfaceInfo;
      devices: DiscoveredDevice[];
    }>(
      "/discovery/scan",
      {
        method: "POST",
        body: JSON.stringify(params),
      },
      25000
    ),

  getDevices: () =>
    apiFetch<{
      active_interface: NetworkInterfaceInfo;
      last_scan: Record<string, unknown> | null;
      total_devices: number;
      online_devices: number;
      devices: DiscoveredDevice[];
    }>("/discovery/devices"),

  runPing: (params: {
    targets: string[] | string;
    count?: number;
    packet_size?: number;
    timeout_ms?: number;
    protocol?: string;
  }) =>
    apiFetch<{
      tested_hosts: number;
      results: (HostQoSStats & { samples: PingSequenceReply[] })[];
    }>(
      "/connectivity/ping",
      {
        method: "POST",
        body: JSON.stringify(params),
      },
      25000
    ),

  getNetworkStats: () =>
    apiFetch<{
      total_hosts: number;
      subnet_avg_latency_ms: number;
      subnet_max_latency_ms: number;
      subnet_avg_packet_loss_pct: number;
      stats: HostQoSStats[];
    }>("/connectivity/stats"),

  scanPorts: (params: {
    target_ip: string;
    preset?: string;
    ports?: string | number[];
    timeout_s?: number;
  }) =>
    apiFetch<{
      target_ip: string;
      hostname: string;
      ports_scanned: number;
      open_ports_count: number;
      scanned_at: string;
      results: PortScanResult[];
    }>(
      "/connectivity/ports/scan",
      {
        method: "POST",
        body: JSON.stringify(params),
      },
      25000
    ),

  getHostPorts: (ip: string) =>
    apiFetch<{
      target_ip: string;
      count: number;
      results: PortScanResult[];
    }>(`/connectivity/ports/${encodeURIComponent(ip)}`),

  capturePackets: (params: {
    interface_name?: string;
    bpf_filter?: string;
    count?: number;
    timeout?: number;
  }) =>
    apiFetch<{
      session: PcapCaptureSession;
      protocol_breakdown: Record<string, number>;
      packets: PacketDissection[];
    }>(
      "/packets/capture",
      {
        method: "POST",
        body: JSON.stringify(params),
      },
      20000
    ),

  uploadPcap: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE_URL}/packets/upload`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      throw new Error(await res.text());
    }
    return res.json() as Promise<{
      session: PcapCaptureSession;
      protocol_breakdown: Record<string, number>;
      packets: PacketDissection[];
    }>;
  },

  getPacketSessions: () =>
    apiFetch<{
      total: number;
      sessions: PcapCaptureSession[];
    }>("/packets/sessions"),

  getPacketSessionDetail: (id: number) =>
    apiFetch<{
      session: PcapCaptureSession;
      protocol_breakdown: Record<string, number>;
      packets: PacketDissection[];
    }>(`/packets/sessions/${id}`),

  openInWireshark: (id: number) =>
    apiFetch<{
      launched: boolean;
      wireshark_found: boolean;
      file_path: string;
      message: string;
    }>(`/packets/sessions/${id}/open-wireshark`, {
      method: "POST",
    }),

  getDownloadPcapUrl: (id: number) =>
    `${API_BASE_URL}/packets/sessions/${id}/download`,

  evaluateSecurity: () =>
    apiFetch<{
      security_score: number;
      security_grade: string;
      evaluated_at: string;
      total_alerts: number;
      category_counts: Record<string, number>;
      severity_counts: Record<string, number>;
      recommendations: SecurityAlert[];
    }>("/security/evaluate", { method: "POST" }),

  getSecurityRecommendations: () =>
    apiFetch<{
      security_score: number;
      security_grade: string;
      evaluated_at: string;
      total_alerts: number;
      category_counts: Record<string, number>;
      severity_counts: Record<string, number>;
      recommendations: SecurityAlert[];
    }>("/security/recommendations"),

  sendAlertEmail: (params: {
    recipient_email: string;
    subject?: string;
    custom_message?: string;
    smtp_host?: string;
    smtp_port?: number;
    smtp_username?: string;
    smtp_password?: string;
  }) =>
    apiFetch<{
      status: string;
      delivery_mode: string;
      message: string;
      email_log: EmailAlertLog;
    }>("/security/alerts/email", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  getEmailOutbox: () =>
    apiFetch<{
      total: number;
      outbox: EmailAlertLog[];
    }>("/security/alerts/outbox"),

  generateReport: (title?: string) =>
    apiFetch<{
      report: DiagnosticReportMeta;
      payload: Record<string, unknown>;
    }>("/reports/generate", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),

  getReports: () =>
    apiFetch<{
      total: number;
      reports: DiagnosticReportMeta[];
    }>("/reports"),

  getReportDetail: (id: number) =>
    apiFetch<{
      report: DiagnosticReportMeta;
      payload: Record<string, unknown>;
    }>(`/reports/${id}`),

  getReportPdfUrl: (id: number) => `${API_BASE_URL}/reports/${id}/pdf`,
  getReportCsvUrl: (id: number) => `${API_BASE_URL}/reports/${id}/csv`,
};
