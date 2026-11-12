import { fdaSearchLabel } from "../library/searchCriteria";
import { useMemo } from "react";
import { useFdaSearchContext } from "../Context/FdaSearchContext";
import { fdaProductsToNadacPrices } from "../library/fdaDataToNadacPrices";
import type { FdaResultDetailLevel } from "../library/types";
import type { ChartOrigin } from "../library/explorerItems";
import useFdaSearch from "./useFdaSearch";

const EMPTY: never[] = [];

/**
 * What a chart made on an FDA search tab comes from. `resultPrices` is the whole loaded result at
 * `level` (default: the tab's detail level) before it's refined, so a new item can tell how much
 * of it the chart shows.
 */
export default function useFdaChartOrigin(level?: FdaResultDetailLevel): ChartOrigin {
  const { criteria, fdaResultDetailLevel } = useFdaSearchContext();
  const { data } = useFdaSearch();
  const seriesLevel = level ?? fdaResultDetailLevel;

  const resultPrices = useMemo(
    () => data ? fdaProductsToNadacPrices(data.products, seriesLevel) : EMPTY,
    [data, seriesLevel]);

  const searchLabel = fdaSearchLabel(criteria);

  return { searchLabel, seriesKind: seriesLevel, resultPrices };
}
