import { useQuery } from "@tanstack/react-query";
import { fetchCurrent } from "../api/solar.ts";
import { DATA_REFETCH_MS } from "./refetch.ts";

export function useCurrent() {
  return useQuery({
    queryKey: ["current"],
    queryFn: fetchCurrent,
    refetchInterval: DATA_REFETCH_MS,
  });
}
