import { useMemo } from "react";
import { useExplorerItems } from "../Context/ExplorerItemsContext";
import { dateBounds, resolveChartDates } from "../library/dates";
import type { ChartPrice } from "../library/types";

/**
 * The page's chart dates resolved against the current search result. On both pages, presets
 * count back from the result's last date, and the date inputs are limited to its range.
 *
 * @param resultPrices - the whole search result (`ChartOrigin.resultPrices`)
 * @returns the window auto charts show and new charts start with, plus the setting and bounds
 *   for `ChartDatesControl`
 */
export default function useChartWindow(resultPrices: ChartPrice[]) {
  const { chartDates, setChartDates } = useExplorerItems();
  const bounds = useMemo(() => dateBounds(resultPrices), [resultPrices]);
  const chartWindow = useMemo(() => resolveChartDates(chartDates, bounds), [chartDates, bounds]);
  return { chartDates, setChartDates, chartWindow, bounds };
}
