export const MAX_CHART_DAYS = 90;

export const DAY_PRESETS = [2, 7, 30, 90] as const;
export type DayPreset = (typeof DAY_PRESETS)[number];

export function clampChartDays(days: number): number {
  return Math.min(MAX_CHART_DAYS, Math.max(0.01, days));
}

/** Target ~300–500 buckets; cap at 3600s. */
export function bucketSecondsForDays(days: number): number {
  const d = clampChartDays(days);
  const approx = Math.floor((d * 86400) / 400);
  return Math.min(3600, Math.max(60, approx));
}
