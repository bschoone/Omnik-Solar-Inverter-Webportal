import { ThemeProvider } from "@mui/material/styles";
import { SparkLineChart } from "@mui/x-charts/SparkLineChart";
import type { SampleDto } from "../../types/api.ts";
import { muiChartsDarkTheme } from "../../lib/muiChartTheme.ts";
import { MetricGrid } from "./MetricGrid.tsx";

function formatTs(ts: number): string {
  return new Date(ts * 1000).toLocaleString();
}

function sampleRows(s: SampleDto | null): { label: string; value: string }[] {
  if (!s) {
    return [{ label: "Status", value: "No sample yet" }];
  }
  return [
    { label: "Timestamp", value: formatTs(s.ts) },
    { label: "Power", value: s.power_w != null ? `${s.power_w} W` : "—" },
    {
      label: "Energy today",
      value: s.energy_today_kwh != null ? `${s.energy_today_kwh} kWh` : "—",
    },
    {
      label: "Energy total",
      value: s.energy_total_kwh != null ? `${s.energy_total_kwh} kWh` : "—",
    },
    { label: "Source", value: s.data_source ?? "—" },
    { label: "Serial", value: s.serial ?? "—" },
    { label: "Fetch OK", value: s.fetch_ok ? "yes" : "no" },
  ];
}

type Props = {
  title: string;
  sample: SampleDto | null;
  sparkline?: readonly number[];
  sparklineColor?: string;
};

export function SamplePanel({ title, sample, sparkline, sparklineColor }: Props) {
  const showSpark = sparkline != null && sparkline.length > 1;

  return (
    <section className="panel">
      <h2>{title}</h2>
      {showSpark && (
        <div className="sample-sparkline">
          <ThemeProvider theme={muiChartsDarkTheme}>
            <SparkLineChart
              data={[...sparkline!]}
              height={44}
              color={sparklineColor ?? "#3fb950"}
              area
              showTooltip
              curve="monotoneX"
            />
          </ThemeProvider>
        </div>
      )}
      <MetricGrid rows={sampleRows(sample)} />
    </section>
  );
}
