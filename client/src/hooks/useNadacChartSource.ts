import { useMemo } from "react";
import type { ChartSource } from "../library/explorerItems";
import type { NadacResultView } from "./useNadacSearch";
import useNadacChartOrigin from "./useNadacChartOrigin";
import useSeriesColors from "./useSeriesColors";

/** What the NADAC page's charts draw from: its refined result, by package. */
export default function useNadacChartSource({ prices, loadedPrices, dateWindow }: NadacResultView): ChartSource {
  const origin = useNadacChartOrigin();
  // Live comparisons show the whole refined result, so it is also the visible set.
  const colors = useSeriesColors(origin.resultPrices, prices);
  return useMemo(() => ({ prices, loadedPrices, origin, colors, dateWindow }), [prices, loadedPrices, origin, colors, dateWindow]);
}
