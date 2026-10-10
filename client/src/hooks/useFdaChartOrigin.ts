import { useMemo } from "react";
import { useFdaSearchContext } from "../Context/FdaSearchContext";
import { fdaProductsToNadacPrices } from "../library/fdaDataToNadacPrices";
import type { FdaResultDetailLevel } from "../library/types";
import type { ChartOrigin } from "../library/explorerItems";
import useFdaSearch from "./useFdaSearch";

const EMPTY: never[] = [];

/**
 * What a chart made on an FDA search tab comes from. `resultPrices` is the whole search result at
 * `level` (default: the tab's detail level) before page filters, so a new item can tell how much
 * of it the chart shows.
 */
export default function useFdaChartOrigin(level?: FdaResultDetailLevel): ChartOrigin {
  const { fdaSearchParams, fdaResultDetailLevel } = useFdaSearchContext();
  const { data } = useFdaSearch();
  const seriesLevel = level ?? fdaResultDetailLevel;

  const resultPrices = useMemo(
    () => data ? fdaProductsToNadacPrices(data.products, seriesLevel) : EMPTY,
    [data, seriesLevel]);

  const searchLabel = fdaSearchParams?.proprietaryName
    || fdaSearchParams?.nonProprietaryName
    || fdaSearchParams?.productNdc
    || "search";

  return { searchLabel, seriesKind: seriesLevel, resultPrices };
}
