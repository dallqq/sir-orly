"use client";

import { useNetPulseStore } from "@/store/useNetPulseStore";

/**
 * Convenience hook returning the live WebSocket & REST telemetry state.
 */
export function useTelemetrySocket() {
  return useNetPulseStore();
}

