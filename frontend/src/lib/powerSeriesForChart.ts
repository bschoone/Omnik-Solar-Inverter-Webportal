import type { HistorySourceSeries } from "../types/api.ts";

const PREFERRED_ORDER = ["tcp_push", "tcp_pull", "http_fallback"];

function sourceKeySort(a: string, b: string): number {
  const ia = PREFERRED_ORDER.indexOf(a);
  const ib = PREFERRED_ORDER.indexOf(b);
  if (ia === -1 && ib === -1) return a.localeCompare(b);
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
}

/** One row per time bucket; `t` is Unix seconds (bucket start). Other keys are avg power (W) or null. */
export type PowerChartDatum = { t: number } & Record<string, number | null>;

export function buildPowerChartData(src: HistorySourceSeries): {
  data: PowerChartDatum[];
  sourceKeys: string[];
} {
  const { bucket_starts, series } = src;
  const sourceKeys = Object.keys(series).sort(sourceKeySort);
  if (bucket_starts.length === 0) {
    return { data: [], sourceKeys };
  }

  const data: PowerChartDatum[] = bucket_starts.map((t, i) => {
    const row = { t } as PowerChartDatum;
    for (const k of sourceKeys) {
      const arr = series[k];
      row[k] = arr != null && i < arr.length ? arr[i]! : null;
    }
    return row;
  });
  return { data, sourceKeys };
}
