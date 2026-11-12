import { useMemo } from "react";
import { getAdvancedFdaSearchReqults, } from "../api/fdaEndpoints";
import { useFdaSearchContext } from "../Context/FdaSearchContext";
import { useQuery } from "@tanstack/react-query";
import { CONSTANT } from "../library/constants";
import { FULL_WINDOW } from "../library/dates";
import { refineFda } from "../library/searchCriteria";

/** The tab's loaded FDA result: everything `loaded` asked for, before it's clipped or refined. */
export default function useFdaSearch() {
  const { loaded, searchEnabled } = useFdaSearchContext();

  return useQuery({
    queryKey: ["fdaSearch", loaded],
    // Sample packages and packages without prices always load: the page hides them by default
    // (`refineFda`), so ticking their Include boxes doesn't fetch.
    queryFn: () => getAdvancedFdaSearchReqults({
      proprietaryName: loaded!.proprietaryName,
      includeSamplePackages: true,
      includeResultsWNoPrices: true,
    }),
    enabled: loaded !== null && searchEnabled,
    staleTime: CONSTANT.staleTime,
  });
}

/**
 * The loaded FDA result as the page shows it (`refineFda`), with the query it came from. Every
 * consumer of the page's results reads `refined`; chart provenance and colors read `query.data`.
 */
export function useRefinedFdaSearch() {
  const query = useFdaSearch();
  const { criteria, requested } = useFdaSearchContext();
  const dates = requested?.dates ?? FULL_WINDOW;
  const refined = useMemo(
    () => query.data ? refineFda(query.data, criteria, dates) : undefined,
    [query.data, criteria, dates]);
  return { query, refined };
}
