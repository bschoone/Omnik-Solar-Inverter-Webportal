import { LineChart } from "@mui/x-charts/LineChart";
import type { DashboardEnergyPoint } from "../../types/api.ts";
import {
  formatPowerChartAxisTick,
  strokeForSeriesIndex,
} from "../../lib/powerChartConfig.ts";

type Props = {
  energy: DashboardEnergyPoint[];
};

function fmtKwh(v: number | null): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${v.toFixed(2)} kWh`;
}

export function EnergyLineChart({ energy }: Props) {
  if (energy.length === 0) {
    return (
      <section className="panel chart-panel">
        <h2>Energy (last sample per bucket)</h2>
        <p className="muted">No energy data in this range.</p>
      </section>
    );
  }

  const dataset = energy.map((e) => ({
    t: e.bucket_start,
    energy_today_kwh: e.energy_today_kwh,
    energy_total_kwh: e.energy_total_kwh,
  })) as Record<string, unknown>[];

  return (
    <section className="panel chart-panel">
      <h2>Energy (last sample per bucket)</h2>
      <p className="muted chart-footnote">Today vs total as reported by the inverter.</p>
      <div className="chart-wrap chart-wrap--tall">
        <LineChart
          dataset={dataset}
          height={320}
          skipAnimation
          grid={{ vertical: true, horizontal: true }}
          margin={{ top: 8, right: 52, left: 4, bottom: 8 }}
          xAxis={[
            {
              dataKey: "t",
              scaleType: "linear",
              valueFormatter: (v) => formatPowerChartAxisTick(v as number),
            },
          ]}
          yAxis={[
            { id: "ytoday", width: 44, label: "Today kWh", position: "left" },
            {
              id: "ytotal",
              width: 44,
              label: "Total kWh",
              position: "right",
            },
          ]}
          series={[
            {
              type: "line",
              dataKey: "energy_today_kwh",
              label: "Energy today",
              yAxisId: "ytoday",
              color: strokeForSeriesIndex(0),
              showMark: false,
              connectNulls: true,
              curve: "monotoneX",
              valueFormatter: (v) => fmtKwh(v),
            },
            {
              type: "line",
              dataKey: "energy_total_kwh",
              label: "Energy total",
              yAxisId: "ytotal",
              color: strokeForSeriesIndex(1),
              showMark: false,
              connectNulls: true,
              curve: "monotoneX",
              valueFormatter: (v) => fmtKwh(v),
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
