import { apiGet } from "./client.ts";
import type { CurrentResponse, HealthResponse, HistoryResponse } from "../types/api.ts";

export function fetchHealth(): Promise<HealthResponse> {
  return apiGet<HealthResponse>("/api/health");
}

export function fetchCurrent(): Promise<CurrentResponse> {
  return apiGet<CurrentResponse>("/api/current");
}

export function fetchHistory(opts: {
  days: number;
  bucketSeconds: number;
}): Promise<HistoryResponse> {
  const q = new URLSearchParams({
    days: String(opts.days),
    bucket_seconds: String(opts.bucketSeconds),
  });
  return apiGet<HistoryResponse>(`/api/history?${q}`);
}
