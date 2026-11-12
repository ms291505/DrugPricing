import { useMemo } from "react";
import { useNadacSearchContext } from "../Context/NadacSearchContext";
import { useQuery } from "@tanstack/react-query";
import { getNadacSearchResults } from "../api/nadacEndpoints";
import { CONSTANT } from "../library/constants";
import { FULL_WINDOW } from "../library/dates";
import { nadacFilterOptions, nadacHiddenOtcCount, refineNadac } from "../library/searchCriteria";
import type { NadacPrice } from "../library/types";

const EMPTY: NadacPrice[] = [];

/** The NADAC result as the page shows it, and what its filters need to say about it. */
export type NadacResultView = {
  /** `refineNadac` of the loaded result: what every consumer of the page's results reads. */
  prices: NadacPrice[],
  /** The Drug filter's options (`nadacFilterOptions`). */
  ndcDescriptions: string[],
  /** NDCs the Include OTC box hides (`nadacHiddenOtcCount`). */
  hiddenOtcCount: number,
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
 * then filtered), with its filter options and hidden count. Call it once per page and pass it
 * down. Chart provenance and colors read the loaded result (`useNadacChartOrigin`).
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
      ndcDescriptions: nadacFilterOptions(prices, criteria, dates).ndcDescriptions,
      hiddenOtcCount: nadacHiddenOtcCount(prices, refined, criteria, dates),
    };
  }, [prices, criteria, dates]);
}
