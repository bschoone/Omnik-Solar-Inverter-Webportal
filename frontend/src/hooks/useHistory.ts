import { useQuery } from "@tanstack/react-query";
import { fetchHistory } from "../api/solar.ts";
import { DATA_REFETCH_MS } from "./refetch.ts";

export type HistoryQueryParams = {
  days: number;
  bucketSeconds: number;
};

export function useHistory(params: HistoryQueryParams) {
  const { days, bucketSeconds } = params;
  return useQuery({
    queryKey: ["history", days, bucketSeconds],
    queryFn: () => fetchHistory({ days, bucketSeconds }),
    refetchInterval: DATA_REFETCH_MS,
  });
}
