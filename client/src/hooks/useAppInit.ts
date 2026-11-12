import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toDateInput } from "../library/dates";
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

/**
 * The as-of date search date presets count back from: the last loaded NADAC as-of date, or today
 * when app-init failed. Null while app-init is still loading (including its retries).
 */
export function useLastAsOfDate(): number | null {
  const { data, isPending } = useAppInit();
  const [today] = useState(() => Date.parse(toDateInput(Date.now())));
  if (data) return data.nadacDates.last;
  return isPending ? null : today;
}
