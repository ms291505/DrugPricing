import { useSearchContext } from "../Context/SearchContext";
import type { ChartOrigin } from "../library/explorerItems";
import { useNadacSearch } from "./useNadacSearch";

const EMPTY: never[] = [];

/**
 * What a chart made on a NADAC search tab comes from. `resultPrices` is the whole search result,
 * before the Drug page filter, so a new item can tell how much of it the chart shows.
 */
export default function useNadacChartOrigin(): ChartOrigin {
  const { searchParams } = useSearchContext();
  const { data } = useNadacSearch();

  const searchLabel = searchParams?.ndcDescription
    || (searchParams?.ndc ? `NDC ${searchParams.ndc}` : "search");

  return { searchLabel, seriesKind: "ndc", resultPrices: data?.prices ?? EMPTY };
}
