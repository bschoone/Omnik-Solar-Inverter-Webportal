import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "../api/solar.ts";
import { DATA_REFETCH_MS } from "./refetch.ts";

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: DATA_REFETCH_MS,
  });
}
