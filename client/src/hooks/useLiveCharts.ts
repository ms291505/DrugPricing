import { useCallback, useState } from "react";
import type { ChartType } from "../library/explorerItems";
import { overSeriesLimit } from "../library/chartSeries";

export type LiveCharts = {
  /** Whether each chart's card is on. Never saved. */
  on: Record<ChartType, boolean>,
  toggle: (chartType: ChartType) => void,
  /**
   * The series count at which the selection last went past `CHART_SERIES_LIMIT` with a chart on,
   * turning it off, until a chart is turned on again: the toolbar toasts it once.
   */
  closedAtSeries: number | null,
};

const OFF: Record<ChartType, boolean> = { line: false, bar: false };

/**
 * The results' Line and Bar toggles, which the toolbar sets and the cards read.
 *
 * Both turn off when the selection empties (unchecking every row, a new search, Clear search, an
 * FDA detail level change) or charts more than `CHART_SERIES_LIMIT` series, and checking rows
 * again doesn't turn them back on. The selection changes in the table, the search context and the
 * detail level, so rather than reset the toggles in each, they reset here during render, as the
 * selection arrives: no effect, so the cards never draw a frame for a selection they don't chart.
 *
 * @param selectedCount - the rows checked, shown or not
 * @param seriesCount - the series the checked rows that are shown would draw
 */
export default function useLiveCharts(selectedCount: number, seriesCount: number): LiveCharts {
  const [on, setOn] = useState(OFF);
  const [closedAtSeries, setClosedAtSeries] = useState<number | null>(null);
  const anyOn = on.line || on.bar;
  if (anyOn && (selectedCount === 0 || overSeriesLimit(seriesCount))) {
    setOn(OFF);
    if (selectedCount > 0) setClosedAtSeries(seriesCount);
  }

  const toggle = useCallback((chartType: ChartType) => {
    setOn(prev => ({ ...prev, [chartType]: !prev[chartType] }));
    setClosedAtSeries(null);
  }, []);

  return { on, toggle, closedAtSeries };
}
