import { CHART_SERIES_LIMIT, CHART_SERIES_WARNING } from "./constants";
import type { ChartPrice } from "./types";

/** Number of distinct series (NDCs) a set of prices would draw. */
export function countSeries(nadacPrices: ChartPrice[]): number {
  return new Set(nadacPrices.map(price => price.ndc)).size;
}

/**
 * The shown prices of the selected rows: what Line and Bar chart. A row's id is its prices' `ndc`
 * at the table's level, so a selected row that a filter hides has no shown prices and drops out
 * until the filter brings it back.
 */
export function selectedChartPrices(prices: ChartPrice[], selection: ReadonlySet<string | number>): ChartPrice[] {
  if (selection.size === 0) return [];
  const ndcs = new Set([...selection].map(String));
  return prices.filter(price => ndcs.has(price.ndc));
}

/** Whether a live chart of this many series is past the warning: slow and hard to read. */
export const manySeries = (seriesCount: number) => seriesCount > CHART_SERIES_WARNING;

/** Whether this many series is more than a live chart draws. */
export const overSeriesLimit = (seriesCount: number) => seriesCount > CHART_SERIES_LIMIT;

/** The toast when a live chart goes past `CHART_SERIES_WARNING` series. */
export const manySeriesWarning = (seriesCount: number) =>
  `Charting ${seriesCount} series. Charts with more than ${CHART_SERIES_WARNING} can be slow and hard to read.`;

/** The toast when the selection goes past `CHART_SERIES_LIMIT` series and the live charts close. */
export const seriesLimitNotice = (seriesCount: number) =>
  `Charts show up to ${CHART_SERIES_LIMIT} series, and ${seriesCount} are selected. Select fewer rows, then turn Line or Bar back on.`;

/**
 * The label in front of Line and Bar. It counts the selected rows that are shown, which a row's
 * series is at the table's level, and names the selected rows the dates or filters hide.
 */
export function chartControlLabel(shownCount: number, hiddenCount: number): string {
  const hidden = hiddenCount > 0 ? ` (${hiddenCount} hidden)` : "";
  if (shownCount === 0) return `Select rows to chart${hidden}`;
  if (overSeriesLimit(shownCount)) return `${shownCount} selected${hidden} · chart up to ${CHART_SERIES_LIMIT}`;
  return `Chart ${shownCount} selected${hidden}`;
}

export type LiveChartState<K extends string> = {
  on: Record<K, boolean>,
  /** The series count that closed the charts by passing `CHART_SERIES_LIMIT`, for its toast. */
  closedAtSeries: number | null,
};

/**
 * The live charts' state for a new selection, or null when it stands. Both turn off when nothing
 * is selected, shown or hidden, or when the shown selection passes `CHART_SERIES_LIMIT`; only the
 * limit records `closedAtSeries`. A selection the dates or filters hide entirely leaves a chart
 * on, with no card, so it comes back with them.
 */
export function liveChartsAfter<K extends string>(
  on: Record<K, boolean>, selectedCount: number, seriesCount: number,
): LiveChartState<K> | null {
  const anyOn = Object.values<boolean>(on).some(Boolean);
  if (!anyOn) return null;
  const off = Object.fromEntries(Object.keys(on).map(key => [key, false])) as Record<K, boolean>;
  if (selectedCount === 0) return { on: off, closedAtSeries: null };
  if (overSeriesLimit(seriesCount)) return { on: off, closedAtSeries: seriesCount };
  return null;
}
