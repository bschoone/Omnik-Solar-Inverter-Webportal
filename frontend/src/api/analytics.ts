import { apiGet } from "./client.ts";
import type { DashboardAnalyticsResponse } from "../types/api.ts";
import { clampChartDays } from "../lib/chartRange.ts";

export function fetchDashboardAnalytics(opts: {
  days: number;
  bucketSeconds: number;
  histogramBins?: number;
}): Promise<DashboardAnalyticsResponse> {
  const days = clampChartDays(opts.days);
  const q = new URLSearchParams({
    days: String(days),
    bucket_seconds: String(opts.bucketSeconds),
  });
  if (opts.histogramBins != null) {
    q.set("histogram_bins", String(Math.min(48, Math.max(4, Math.floor(opts.histogramBins)))));
  }
  return apiGet<DashboardAnalyticsResponse>(`/api/analytics/dashboard?${q}`);
}
