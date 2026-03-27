/** Line colors for power-by-source series (MUI X Charts). */
export const POWER_CHART_STROKES: readonly string[] = [
  "#3fb950",
  "#58a6ff",
  "#d29922",
  "#a371f7",
  "#f85149",
  "#79c0ff",
  "#ffa657",
];

export const POWER_CHART_TITLE = "Power by source";
export const POWER_CHART_SUBTITLE = "(avg W per bucket)";

export function strokeForSeriesIndex(i: number): string {
  return POWER_CHART_STROKES[i % POWER_CHART_STROKES.length]!;
}

export function formatPowerChartAxisTick(unixSec: number): string {
  return new Date(unixSec * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPowerChartTooltipTime(unixSec: number): string {
  return new Date(unixSec * 1000).toLocaleString();
}

export function formatPowerChartTooltipW(value: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(0)} W`;
}
