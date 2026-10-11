import { useQuery } from "@tanstack/react-query";
import { getAppInit } from "../api/appInitEndpoints";

// The ETL loads new data weekly, so an hour-old answer is fine.
const APP_INIT_STALE_TIME = 1000 * 60 * 60;

/**
 * The range of loaded NADAC dates (and the FDA lookup lists). Callers must work without it:
 * it is undefined while loading or if the request failed.
 */
export default function useAppInit() {
  return useQuery({
    queryKey: ["appInit"],
    queryFn: getAppInit,
    staleTime: APP_INIT_STALE_TIME,
  });
}
