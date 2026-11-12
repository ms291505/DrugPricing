import { useSearchContext } from "../Context/NadacSearchContext";
import type { ChartOrigin } from "../library/explorerItems";
import { useNadacSearch } from "./useNadacSearch";

const EMPTY: never[] = [];

/**
 * What a chart made on a NADAC search tab comes from. `resultPrices` is the whole loaded result,
 * before it's clipped to the search's dates or filtered, so a new item can tell how much of it
 * the chart shows.
 */
export default function useNadacChartOrigin(): ChartOrigin {
  const { criteria } = useSearchContext();
  const { data } = useNadacSearch();

  const searchLabel = criteria.ndcDescription
    || (criteria.ndc ? `NDC ${criteria.ndc}` : "search");

  return { searchLabel, seriesKind: "ndc", resultPrices: data?.prices ?? EMPTY };
}
