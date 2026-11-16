import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toDateInput, type DateWindow } from "../library/dates";
import type { AsOfReference } from "../library/prices";
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
 * What a results table marks stale prices against (`currentAsOfDate`): the shown dates' end and
 * the last loaded as-of date, which is null until app-init answers (and if it fails).
 */
export function useAsOfReference(dateWindow: DateWindow | undefined): AsOfReference {
  const { data } = useAppInit();
  const lastLoaded = data?.nadacDates.last ?? null;
  const windowEnd = dateWindow?.end ?? null;
  return useMemo(() => ({ windowEnd, lastLoaded }), [windowEnd, lastLoaded]);
}

/**
 * The as-of date search date presets count back from: the last loaded NADAC as-of date, or today
 * when app-init failed.
 *
 * @returns `forSearch`, null while app-init is still loading (including its retries), so a search
 *   doesn't resolve its presets against a date that's about to change; and `forDisplay`, which
 *   falls back to today meanwhile, so a form always has dates to show.
 */
export function useLastAsOfDate(): { forSearch: number | null, forDisplay: number } {
  const { data, isPending } = useAppInit();
  const [today] = useState(() => Date.parse(toDateInput(Date.now())));
  if (data) return { forSearch: data.nadacDates.last, forDisplay: data.nadacDates.last };
  return { forSearch: isPending ? null : today, forDisplay: today };
}
