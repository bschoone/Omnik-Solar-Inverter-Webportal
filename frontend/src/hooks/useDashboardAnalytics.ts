import { useQuery } from "@tanstack/react-query";
import { fetchDashboardAnalytics } from "../api/analytics.ts";
import { DATA_REFETCH_MS } from "./refetch.ts";

export type DashboardAnalyticsParams = {
  days: number;
  bucketSeconds: number;
  histogramBins?: number;
};

export function useDashboardAnalytics(params: DashboardAnalyticsParams) {
  const { days, bucketSeconds, histogramBins } = params;
  return useQuery({
    queryKey: ["dashboardAnalytics", days, bucketSeconds, histogramBins ?? "default"],
    queryFn: () => fetchDashboardAnalytics({ days, bucketSeconds, histogramBins }),
    refetchInterval: DATA_REFETCH_MS,
  });
}
