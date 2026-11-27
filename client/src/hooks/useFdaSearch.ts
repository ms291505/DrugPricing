import { useMemo } from "react";
import { getAdvancedFdaSearchReqults, } from "../api/fdaEndpoints";
import { useFdaSearchContext } from "../Context/FdaSearchContext";
import { useQuery } from "@tanstack/react-query";
import { CONSTANT, SEARCH_QUERY_KEYS } from "../library/constants";
import { FULL_WINDOW, toDateInput, type DateWindow } from "../library/dates";
import {
  fdaFilterOptions, fdaHiddenCounts, fdaShownDates, refineFda, widenToAsOfDates,
  type FdaListKey, type HiddenCounts,
} from "../library/searchCriteria";
import { fdaProductsToNadacPrices } from "../library/fdaDataToNadacPrices";
import type { FdaProductDetail, FdaResultDetailLevel, NadacPrice } from "../library/types";

/** The tab's loaded FDA result: everything `loaded` asked for, before it's clipped or refined. */
export default function useFdaSearch() {
  const { loaded, searchEnabled } = useFdaSearchContext();

  return useQuery({
    queryKey: [SEARCH_QUERY_KEYS.fda, loaded],
    // The signal aborts a search a new one replaces (React Query drops the old query).
    queryFn: ({ signal }) => {
      // The server keeps prices strictly inside the dates; widened, the result holds the as-of
      // dates the client snaps to (`refineFda`), as NADAC's server snaps them.
      const dates = widenToAsOfDates(loaded!.dates);
      return getAdvancedFdaSearchReqults({
        proprietaryName: loaded!.proprietaryName,
        nonProprietaryName: loaded!.nonProprietaryName,
        labelerCodes: loaded!.labelerCodes,
        // Sample packages and packages without prices always load: the page hides them by
        // default (`refineFda`), so ticking their Include boxes doesn't fetch.
        includeSamplePackages: true,
        includeResultsWNoPrices: true,
        priceAsOfDateStart: dates.start === null ? undefined : toDateInput(dates.start),
        priceAsOfDateEnd: dates.end === null ? undefined : toDateInput(dates.end),
      }, signal);
    },
    enabled: loaded !== null && searchEnabled,
    staleTime: CONSTANT.staleTime,
  });
}

const EMPTY_PRODUCTS: FdaProductDetail[] = [];

/** The FDA result as the page shows it, and what its filters need to say about it. */
export type FdaResultView = {
  /** `refineFda`'s products: what every consumer of the page's results reads. */
  products: FdaProductDetail[],
  /** The dates shown (`fdaShownDates`): the added charts' window, and new charts' dates. */
  dateWindow: DateWindow,
  /** The from-results lists' options (`fdaFilterOptions`). */
  options: Record<FdaListKey, string[]>,
  /** Rows at the table's detail level that the refine fields hide (`fdaHiddenCounts`). */
  hidden: HiddenCounts,
  /**
   * The refined result over every loaded date at a level, computed when called: what a new chart
   * takes its series' loaded dates from (`withLoadedDates`).
   */
  loadedPrices: (level: FdaResultDetailLevel) => NadacPrice[],
};

/**
 * The loaded FDA result as the page shows it (`refineFda`), with its dates, filter options and
 * hidden counts. Call it once per page and pass it down. Chart provenance and colors read the
 * loaded result (`useFdaChartOrigin`).
 */
export function useRefinedFdaSearch(): FdaResultView {
  const { data } = useFdaSearch();
  const { criteria, requested, fdaResultDetailLevel } = useFdaSearchContext();
  const dates = requested?.dates ?? FULL_WINDOW;
  // Everything but the hidden counts is the same at both detail levels. Keeping it, `products`
  // included, across a level switch keeps what reads its identity (price change scans and charts).
  const view = useMemo(() => {
    const result = data ?? { products: EMPTY_PRODUCTS };
    const refined = refineFda(result, criteria, dates);
    return {
      result, refined,
      products: refined.products,
      dateWindow: fdaShownDates(result, dates),
      options: fdaFilterOptions(result, criteria, dates),
      loadedPrices: (level: FdaResultDetailLevel) =>
        // Price activity judges packages over the shown dates, so this keeps the page's packages.
        fdaProductsToNadacPrices(refineFda(result, criteria, FULL_WINDOW, dates).products, level),
    };
  }, [data, criteria, dates]);
  return useMemo(() => {
    const { result, refined, ...shown } = view;
    return { ...shown, hidden: fdaHiddenCounts(result, refined, criteria, dates, fdaResultDetailLevel) };
  }, [view, criteria, dates, fdaResultDetailLevel]);
}
