import { useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import { assignSeriesColors, preferredSlots } from "../library/seriesColors";
import type { ChartPrice } from "../library/types";

/**
 * The page's series colors: preferences from the whole search result, clashes resolved over the
 * series shown. Every chart on the page and every new pinned chart uses this one map.
 *
 * @param resultPrices - the unfiltered search result (`ChartOrigin.resultPrices`)
 * @param visiblePrices - what the page shows after its filters
 */
export default function useSeriesColors(resultPrices: ChartPrice[], visiblePrices: ChartPrice[]): Map<string, string> {
  const palette = useTheme().palette.chart.series;
  const preferred = useMemo(() => preferredSlots(resultPrices.map(price => price.ndc)), [resultPrices]);
  return useMemo(
    () => assignSeriesColors(visiblePrices.map(price => price.ndc), preferred, palette),
    [visiblePrices, preferred, palette]);
}
