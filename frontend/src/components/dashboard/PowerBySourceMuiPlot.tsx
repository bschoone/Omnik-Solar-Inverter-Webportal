import { LineChart } from "@mui/x-charts/LineChart";
import type { PowerChartDatum } from "../../lib/powerSeriesForChart.ts";
import {
  formatPowerChartAxisTick,
  formatPowerChartTooltipW,
  strokeForSeriesIndex,
} from "../../lib/powerChartConfig.ts";
import { formatSourceLabel } from "../../lib/sourceLabel.ts";

type Props = {
  data: PowerChartDatum[];
  sourceKeys: string[];
};

export function PowerBySourceMuiPlot({ data, sourceKeys }: Props) {
  const dataset = data as Record<string, unknown>[];

  return (
    <LineChart
      dataset={dataset}
      height={360}
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
      yAxis={[
        {
          width: 48,
          label: "W",
          labelStyle: { fill: "var(--muted, #8b949e)", fontSize: 12 },
        },
      ]}
      series={sourceKeys.map((key, i) => ({
        type: "line" as const,
        dataKey: key,
        label: formatSourceLabel(key),
        color: strokeForSeriesIndex(i),
        // Dots only where this source has a real bucket value (nulls are bridged by the line).
        showMark: ({ index }) => {
          const row = data[index];
          if (!row) return false;
          const v = row[key];
          return v != null && typeof v === "number" && Number.isFinite(v);
        },
        connectNulls: true,
        curve: "monotoneX" as const,
        valueFormatter: (v) => formatPowerChartTooltipW(v),
      }))}
      sx={{
        width: "100%",
        "& .MuiChartsAxis-line": { stroke: "var(--border, #30363d)" },
        "& .MuiChartsAxis-tick": { stroke: "var(--border, #30363d)" },
        "& .MuiChartsAxis-tickLabel": { fill: "var(--muted, #8b949e)", fontSize: 11 },
        "& .MuiChartsGrid-line": { strokeDasharray: "3 3", stroke: "var(--border, #30363d)" },
        "& .MuiMarkElement-root": { strokeWidth: 1.5, r: 3 },
      }}
    />
  );
}
