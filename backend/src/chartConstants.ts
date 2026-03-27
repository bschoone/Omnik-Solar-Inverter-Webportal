/** Upper bound for time range on chart and analytics APIs. */
export const MAX_CHART_DAYS = 90;

export function clampChartDays(days: number): number {
  return Math.min(MAX_CHART_DAYS, Math.max(0.01, days));
}

export function clampBucketSeconds(sec: number): number {
  return Math.min(3600, Math.max(1, Math.floor(sec)));
}

export function clampHistogramBins(bins: number): number {
  return Math.min(48, Math.max(4, Math.floor(bins)));
}
