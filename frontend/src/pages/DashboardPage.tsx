import { useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { ApiStatusPill } from "../components/dashboard/ApiStatusPill.tsx";
import { ChartRangeToolbar } from "../components/dashboard/ChartRangeToolbar.tsx";
import { EnergyLineChart } from "../components/dashboard/EnergyLineChart.tsx";
import { HistoryPreview } from "../components/dashboard/HistoryPreview.tsx";
import { HourDowHeatmap } from "../components/dashboard/HourDowHeatmap.tsx";
import { IngestionLineChart } from "../components/dashboard/IngestionLineChart.tsx";
import { PowerBySourceChart } from "../components/dashboard/PowerBySourceChart.tsx";
import { PowerHistogramChart } from "../components/dashboard/PowerHistogramChart.tsx";
import { SamplePanel } from "../components/dashboard/SamplePanel.tsx";
import { buildPowerChartData } from "../lib/powerSeriesForChart.ts";
import type { DayPreset } from "../lib/chartRange.ts";
import { bucketSecondsForDays } from "../lib/chartRange.ts";
import { muiChartsDarkTheme } from "../lib/muiChartTheme.ts";
import { strokeForSeriesIndex } from "../lib/powerChartConfig.ts";
import { valuesForSparkline } from "../lib/sparkline.ts";
import { ErrorBanner } from "../components/common/ErrorBanner.tsx";
import { LoadingLine } from "../components/common/LoadingLine.tsx";
import { AppShell } from "../components/layout/AppShell.tsx";
import { useCurrent } from "../hooks/useCurrent.ts";
import { useDashboardAnalytics } from "../hooks/useDashboardAnalytics.ts";
import { useHealth } from "../hooks/useHealth.ts";
import { useHistory } from "../hooks/useHistory.ts";

export function DashboardPage() {
  const [dayPreset, setDayPreset] = useState<DayPreset>(7);
  const bucketSeconds = bucketSecondsForDays(dayPreset);

  const health = useHealth();
  const current = useCurrent();
  const history = useHistory({ days: dayPreset, bucketSeconds });
  const analytics = useDashboardAnalytics({ days: dayPreset, bucketSeconds });

  const errors = [health.error, current.error, history.error, analytics.error].filter(
    (e): e is Error => e != null,
  );
  const loading =
    health.isPending ||
    current.isPending ||
    (history.isPending && !history.data) ||
    (analytics.isPending && !analytics.data);

  const chartModel = history.data ? buildPowerChartData(history.data.source_series) : null;

  const sparkLatest = history.data
    ? valuesForSparkline(history.data.points.map((p) => p.power_w_avg))
    : [];
  const sparkPush = history.data
    ? valuesForSparkline(history.data.source_series.series.tcp_push)
    : [];
  const sparkPull = history.data
    ? valuesForSparkline(history.data.source_series.series.tcp_pull)
    : [];

  return (
    <AppShell title="Solar inverter">
      <ChartRangeToolbar
        days={dayPreset}
        onDaysChange={setDayPreset}
        bucketSeconds={bucketSeconds}
      />

      <div className="dashboard-toolbar">
        <ApiStatusPill ok={health.data?.ok} pending={health.isPending} />
        {loading && <LoadingLine label="Fetching data…" />}
      </div>

      {errors.length > 0 && (
        <ErrorBanner message={errors.map((e) => e.message).join(" · ") || "Request failed"} />
      )}

      <div className="dashboard-grid">
        <SamplePanel
          title="Latest sample"
          sample={current.data?.sample ?? null}
          sparkline={sparkLatest.length > 1 ? sparkLatest : undefined}
          sparklineColor={strokeForSeriesIndex(1)}
        />
        <SamplePanel
          title="TCP push"
          sample={current.data?.by_source.tcp_push ?? null}
          sparkline={sparkPush.length > 1 ? sparkPush : undefined}
          sparklineColor={strokeForSeriesIndex(0)}
        />
        <SamplePanel
          title="TCP pull"
          sample={current.data?.by_source.tcp_pull ?? null}
          sparkline={sparkPull.length > 1 ? sparkPull : undefined}
          sparklineColor={strokeForSeriesIndex(2)}
        />
      </div>

      <div className="dashboard-charts-flow">
        {history.data && chartModel && (
          <PowerBySourceChart data={chartModel.data} sourceKeys={chartModel.sourceKeys} />
        )}

        <ThemeProvider theme={muiChartsDarkTheme}>
          {analytics.data && (
            <>
              <EnergyLineChart energy={analytics.data.energy} />
              <IngestionLineChart ingestion={analytics.data.ingestion} />
              <PowerHistogramChart bins={analytics.data.power_histogram} />
            </>
          )}

          {analytics.data && <HourDowHeatmap cells={analytics.data.hourly_profile} />}
        </ThemeProvider>

        {history.data && (
          <HistoryPreview points={history.data.points} bucketSeconds={history.data.bucket_seconds} />
        )}
      </div>
    </AppShell>
  );
}
