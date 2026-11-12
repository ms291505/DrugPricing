import { useMemo } from "react";
import { useNadacSearchContext } from "../Context/NadacSearchContext";
import { useQuery } from "@tanstack/react-query";
import { getNadacSearchResults } from "../api/nadacEndpoints";
import { CONSTANT } from "../library/constants";
import { FULL_WINDOW } from "../library/dates";
import { refineNadac } from "../library/searchCriteria";
import type { NadacPrice } from "../library/types";

const EMPTY: NadacPrice[] = [];

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
 * then filtered), with the query it came from. Call it once per page and pass `refined` down:
 * every consumer of the page's results reads it. Chart provenance and colors read the loaded
 * result (`useNadacChartOrigin`).
 */
export function useRefinedNadacSearch() {
  const query = useNadacSearch();
  const { criteria, requested } = useNadacSearchContext();
  const dates = requested?.dates ?? FULL_WINDOW;
  const prices = query.data?.prices;
  const refined = useMemo(
    () => prices ? refineNadac(prices, criteria, dates) : EMPTY,
    [prices, criteria, dates]);
  return { query, refined };
}
