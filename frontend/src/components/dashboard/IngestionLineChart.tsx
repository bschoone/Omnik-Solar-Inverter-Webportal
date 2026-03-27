import { LineChart } from "@mui/x-charts/LineChart";
import type { DashboardIngestionPoint } from "../../types/api.ts";
import { formatPowerChartAxisTick, strokeForSeriesIndex } from "../../lib/powerChartConfig.ts";

type Props = {
  ingestion: DashboardIngestionPoint[];
};

export function IngestionLineChart({ ingestion }: Props) {
  if (ingestion.length === 0) {
    return (
      <section className="panel chart-panel">
        <h2>Ingestion (samples per bucket)</h2>
        <p className="muted">No samples in this range.</p>
      </section>
    );
  }

  const dataset = ingestion.map((row) => ({
    t: row.bucket_start,
    n_ok: row.n_ok,
    n_fail: row.n_fail,
  })) as Record<string, unknown>[];

  return (
    <section className="panel chart-panel">
      <h2>Ingestion (ok vs failed fetches per bucket)</h2>
      <div className="chart-wrap chart-wrap--tall">
        <LineChart
          dataset={dataset}
          height={320}
          skipAnimation
          grid={{ vertical: true, horizontal: true }}
          margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
          xAxis={[
            {
              dataKey: "t",
              scaleType: "linear",
              valueFormatter: (v) => formatPowerChartAxisTick(v as number),
            },
          ]}
          yAxis={[{ width: 44, label: "Count" }]}
          series={[
            {
              type: "line",
              dataKey: "n_ok",
              label: "OK",
              color: strokeForSeriesIndex(0),
              showMark: false,
              connectNulls: true,
              curve: "monotoneX",
              valueFormatter: (v) => (v == null ? "—" : String(Math.round(v as number))),
            },
            {
              type: "line",
              dataKey: "n_fail",
              label: "Failed",
              color: strokeForSeriesIndex(4),
              showMark: false,
              connectNulls: true,
              curve: "monotoneX",
              valueFormatter: (v) => (v == null ? "—" : String(Math.round(v as number))),
            },
          ]}
          sx={chartSx}
        />
      </div>
    </section>
  );
}

const chartSx = {
  width: "100%",
  "& .MuiChartsAxis-line": { stroke: "var(--border, #30363d)" },
  "& .MuiChartsAxis-tick": { stroke: "var(--border, #30363d)" },
  "& .MuiChartsAxis-tickLabel": { fill: "var(--muted, #8b949e)", fontSize: 11 },
  "& .MuiChartsGrid-line": { strokeDasharray: "3 3", stroke: "var(--border, #30363d)" },
} as const;
