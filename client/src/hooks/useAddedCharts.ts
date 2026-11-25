import { useCallback, useState } from "react";
import type { ChartType, SeriesKind } from "../library/explorerItems";

/**
 * A card that Line or Bar added: the rows it charts (their ids, a series' `ndc` at the table's
 * level), fixed when it was made. It draws those rows' shown prices, so it redraws with the dates
 * and filters.
 */
export type AddedChart = {
  id: string,
  chartType: ChartType,
  ndcs: string[],
  /** Each row's label when it was added, for the title while the dates or filters hide them all. */
  labels: string[],
  seriesKind: SeriesKind,
};

/** What the last Line or Bar press added, for the status line under the toolbar (`ResultsReport`). */
export type ChartReport = {
  message: string,
  chartId: string,
  /** When it was made (`performance.now()`), so the status line shows the newer of this and a scan's. */
  order: number,
};

export type AddedCharts = {
  /** Oldest first. */
  charts: AddedChart[],
  /** Adds a card and reports it. */
  add: (chart: Omit<AddedChart, "id">, message: string) => void,
  close: (id: string) => void,
  /** What the last add made; null until the first, and again once the charts reset. */
  report: ChartReport | null,
};

/**
 * The cards the results toolbar's Line and Bar added. Each press adds one, which keeps its rows
 * while the selection changes. A new search, Clear search or an FDA detail level change makes the
 * rows another result's, so the caller passes those as `resetKeys` and a change to any removes
 * every card and the report. The reset happens during render, as for scans, so the cards never
 * draw a frame for rows that are gone. Nothing here is saved.
 */
export default function useAddedCharts(...resetKeys: unknown[]): AddedCharts {
  const [charts, setCharts] = useState<AddedChart[]>([]);
  const [report, setReport] = useState<ChartReport | null>(null);
  const [keys, setKeys] = useState(resetKeys);
  if (keys.length !== resetKeys.length || keys.some((key, index) => key !== resetKeys[index])) {
    setKeys(resetKeys);
    setCharts([]);
    setReport(null);
  }

  const add = useCallback((chart: Omit<AddedChart, "id">, message: string) => {
    const id = crypto.randomUUID();
    setCharts(prev => [...prev, { ...chart, id }]);
    setReport({ message, chartId: id, order: performance.now() });
  }, []);
  const close = useCallback((id: string) => setCharts(prev => prev.filter(chart => chart.id !== id)), []);

  return { charts, add, close, report };
}
