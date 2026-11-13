import { useNadacSearchContext } from "../Context/NadacSearchContext";
import type { ChartOrigin } from "../library/explorerItems";
import { nadacSearchLabel } from "../library/searchCriteria";
import { useNadacSearch } from "./useNadacSearch";

const EMPTY: never[] = [];

/**
 * What a chart made on a NADAC search tab comes from. `resultPrices` is the whole loaded result,
 * before it's clipped to the search's dates or filtered, so a new item can tell how much of it
 * the chart shows.
 */
export default function useNadacChartOrigin(): ChartOrigin {
  const { criteria } = useNadacSearchContext();
  const { data } = useNadacSearch();

  return { searchLabel: nadacSearchLabel(criteria), seriesKind: "ndc", resultPrices: data?.prices ?? EMPTY };
}
