import { useCallback, useMemo } from "react";
import type { ChartSource } from "../library/explorerItems";
import { fdaProductsToNadacPrices } from "../library/fdaDataToNadacPrices";
import type { FdaResultDetailLevel } from "../library/types";
import type { FdaResultView } from "./useFdaSearch";
import useFdaChartOrigin from "./useFdaChartOrigin";
import useSeriesColors from "./useSeriesColors";

/**
 * What the FDA page's charts draw from at one series level: the table's detail level, or
 * packages (price change lists and their charts, at every detail level).
 */
export default function useFdaChartSource({ products, loadedPrices, dateWindow }: FdaResultView, level: FdaResultDetailLevel): ChartSource {
  const origin = useFdaChartOrigin(level);
  // Derived once per result, filter and level change, not on every render (e.g. each selection).
  const prices = useMemo(() => fdaProductsToNadacPrices(products, level), [products, level]);
  const colors = useSeriesColors(origin.resultPrices, prices);
  const levelLoadedPrices = useCallback(() => loadedPrices(level), [loadedPrices, level]);
  return useMemo(
    () => ({ prices, loadedPrices: levelLoadedPrices, origin, colors, dateWindow }),
    [prices, levelLoadedPrices, origin, colors, dateWindow]);
}
