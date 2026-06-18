// src/services/healthService.ts
// ─────────────────────────────────────────────────────────────────────────────
// Maps the /health endpoint — useful for liveness probes.
// ─────────────────────────────────────────────────────────────────────────────

import { get } from "./api";

export interface HealthStatus {
  status: string;
  version?: string;
}

// GET /health
export const checkHealth = (): Promise<HealthStatus> =>
  get<HealthStatus>("/health");
