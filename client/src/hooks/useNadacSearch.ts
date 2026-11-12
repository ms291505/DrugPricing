import { useMemo } from "react";
import { useNadacSearchContext } from "../Context/NadacSearchContext";
import { useQuery } from "@tanstack/react-query";
import { getNadacSearchResults } from "../api/nadacEndpoints";
import { CONSTANT } from "../library/constants";
import { FULL_WINDOW, type DateWindow } from "../library/dates";
import {
  nadacFilterOptions, nadacHiddenCounts, refineNadac, snapToAsOfDates,
  type HiddenCounts, type NadacExclusionKey,
} from "../library/searchCriteria";
import type { NadacPrice } from "../library/types";

const EMPTY: NadacPrice[] = [];

/** The NADAC result as the page shows it, and what its filters need to say about it. */
export type NadacResultView = {
  /** `refineNadac` of the loaded result: what every consumer of the page's results reads. */
  prices: NadacPrice[],
  /**
   * The dates shown: the search's, snapped to as-of dates. The auto charts' window, and the
   * dates a new chart starts with.
   */
  dateWindow: DateWindow,
  /** The from-results lists' options (`nadacFilterOptions`). */
  options: Record<NadacExclusionKey, string[]>,
  /** NDCs the refine fields hide (`nadacHiddenCounts`). */
  hidden: HiddenCounts,
  /**
   * The refined result over every loaded date, computed when called: what a new chart takes its
   * series' history from (`withLoadedHistory`).
   */
  history: () => NadacPrice[],
};

/** The tab's loaded NADAC result: everything `loaded` asked for, before it's clipped or refined. */
export function useNadacSearch() {
  const { loaded, searchEnabled } = useNadacSearchContext();
  return useQuery({
    queryKey: ["nadacSearch", loaded],
    queryFn: async () => getNadacSearchResults(loaded!),
    enabled: loaded !== null && searchEnabled,
    staleTime: CONSTANT.staleTime,
  });
}

/**
 * The loaded NADAC result as the page shows it (`refineNadac`: clipped to the search's dates,
 * then filtered), with its dates, filter options and hidden counts. Call it once per page and
 * pass it down. Chart provenance and colors read the loaded result (`useNadacChartOrigin`).
 */
export function useRefinedNadacSearch(): NadacResultView {
  const { data } = useNadacSearch();
  const { criteria, requested } = useNadacSearchContext();
  const dates = requested?.dates ?? FULL_WINDOW;
  const prices = data?.prices ?? EMPTY;
  return useMemo(() => {
    const refined = refineNadac(prices, criteria, dates);
    return {
      prices: refined,
      dateWindow: snapToAsOfDates(dates, prices),
      options: nadacFilterOptions(prices, criteria, dates),
      hidden: nadacHiddenCounts(prices, refined, criteria, dates),
      history: () => refineNadac(prices, criteria, FULL_WINDOW),
    };
  }, [prices, criteria, dates]);
}
