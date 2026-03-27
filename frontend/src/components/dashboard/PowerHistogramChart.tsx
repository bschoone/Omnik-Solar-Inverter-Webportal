import { BarChart } from "@mui/x-charts/BarChart";
import type { DashboardHistogramBin } from "../../types/api.ts";

type Props = {
  bins: DashboardHistogramBin[];
};

export function PowerHistogramChart({ bins }: Props) {
  if (bins.length === 0) {
    return (
      <section className="panel chart-panel">
        <h2>Power distribution</h2>
        <p className="muted">No power samples in this range.</p>
      </section>
    );
  }

  const dataset = bins.map((b) => ({
    label: `${Math.round(b.bin_start)}–${Math.round(b.bin_end)} W`,
    count: b.count,
  })) as Record<string, unknown>[];

  return (
    <section className="panel chart-panel">
      <h2>Power distribution (all OK samples)</h2>
      <div className="chart-wrap chart-wrap--tall">
        <BarChart
          dataset={dataset}
          height={340}
          skipAnimation
          grid={{ horizontal: true }}
          margin={{ top: 8, right: 12, left: 4, bottom: 72 }}
          xAxis={[
            {
              scaleType: "band",
              dataKey: "label",
              tickLabelStyle: {
                fill: "var(--muted, #8b949e)",
                fontSize: 9,
                angle: 35,
                textAnchor: "end",
              },
            },
          ]}
          yAxis={[{ label: "Samples", width: 44 }]}
          series={[
            {
              type: "bar",
              dataKey: "count",
              label: "Count",
              color: "#58a6ff",
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
