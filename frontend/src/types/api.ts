/** Matches backend `SampleRow` JSON shape. */
export type SampleDto = {
  id?: number;
  ts: number;
  fetch_ok: number;
  power_w: number | null;
  energy_today_kwh: number | null;
  energy_total_kwh: number | null;
  serial: string | null;
  model: string | null;
  alarm_raw: string | null;
  version: string | null;
  m2m_mid: string | null;
  wan_ip: string | null;
  rssi: string | null;
  data_source: string | null;
};

export type HealthResponse = { ok: boolean };

export type CurrentResponse = {
  sample: SampleDto | null;
  by_source: {
    tcp_push: SampleDto | null;
    tcp_pull: SampleDto | null;
  };
};

export type HistoryPoint = {
  bucket_start: number;
  power_w_avg: number;
  power_w_max: number;
  n: number;
};

export type HistorySourceSeries = {
  bucket_starts: number[];
  series: Record<string, (number | null)[]>;
};

export type HistoryResponse = {
  days: number;
  bucket_seconds: number;
  points: HistoryPoint[];
  source_series: HistorySourceSeries;
};

export type DashboardEnergyPoint = {
  bucket_start: number;
  energy_today_kwh: number | null;
  energy_total_kwh: number | null;
};

export type DashboardIngestionPoint = {
  bucket_start: number;
  n: number;
  n_ok: number;
  n_fail: number;
  power_w_avg_ok: number | null;
};

export type DashboardHistogramBin = {
  bin_start: number;
  bin_end: number;
  count: number;
};

export type DashboardHourlyCell = {
  dow: number;
  hour: number;
  avg_power_w: number;
  n: number;
};

export type DashboardAnalyticsResponse = {
  days: number;
  bucket_seconds: number;
  histogram_bins: number;
  energy: DashboardEnergyPoint[];
  ingestion: DashboardIngestionPoint[];
  power_histogram: DashboardHistogramBin[];
  hourly_profile: DashboardHourlyCell[];
};
