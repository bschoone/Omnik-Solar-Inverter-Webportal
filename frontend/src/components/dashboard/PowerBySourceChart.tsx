import { ThemeProvider } from "@mui/material/styles";
import { muiChartsDarkTheme } from "../../lib/muiChartTheme.ts";
import {
  POWER_CHART_SUBTITLE,
  POWER_CHART_TITLE,
} from "../../lib/powerChartConfig.ts";
import type { PowerChartDatum } from "../../lib/powerSeriesForChart.ts";
import { PowerBySourceMuiPlot } from "./PowerBySourceMuiPlot.tsx";

type Props = {
  data: PowerChartDatum[];
  sourceKeys: string[];
};

export function PowerBySourceChart({ data, sourceKeys }: Props) {
  const empty = data.length === 0 || sourceKeys.length === 0;

  if (empty) {
    return (
      <section className="panel chart-panel">
        <h2>{POWER_CHART_TITLE}</h2>
        <p className="muted">No bucketed samples in this range.</p>
      </section>
    );
  }

  return (
    <section className="panel chart-panel">
      <h2 className="chart-panel-heading">
        {POWER_CHART_TITLE}{" "}
        <span className="chart-subtitle muted">{POWER_CHART_SUBTITLE}</span>
      </h2>
      <div className="chart-wrap">
        <ThemeProvider theme={muiChartsDarkTheme}>
          <PowerBySourceMuiPlot data={data} sourceKeys={sourceKeys} />
        </ThemeProvider>
      </div>
    </section>
  );
}
