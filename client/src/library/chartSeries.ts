import { CHART_SERIES_LIMIT, CHART_SERIES_WARNING } from "./constants";
import type { ChartPrice } from "./types";

/** Number of distinct series (NDCs) a set of prices would draw. */
export function countSeries(nadacPrices: ChartPrice[]): number {
  return new Set(nadacPrices.map(price => price.ndc)).size;
}

/**
 * The shown prices of the selected rows, or of an added chart's rows: what Line and Bar chart. A
 * row's id is its prices' `ndc` at the table's level, so a row that a filter hides has no shown
 * prices and drops out until the filter brings it back.
 */
export function selectedChartPrices(prices: ChartPrice[], selection: ReadonlySet<string | number>): ChartPrice[] {
  if (selection.size === 0) return [];
  const ndcs = new Set([...selection].map(String));
  return prices.filter(price => ndcs.has(price.ndc));
}

/**
 * The pricing units of an added chart that Close hasn't removed: those it had when added and any
 * its shown prices have since, so a unit the dates or filters hide right now still counts, and
 * closing the last card on screen keeps the chart while one of these remains.
 */
export function openPricingUnits(addedUnits: readonly string[], shownPrices: ChartPrice[], closedUnits: readonly string[]): string[] {
  const units = new Set([...addedUnits, ...shownPrices.map(price => price.pricingUnit)]);
  return [...units].filter(unit => !closedUnits.includes(unit));
}

/** Whether a chart of this many series is past the warning: slow and hard to read. */
export const manySeries = (seriesCount: number) => seriesCount > CHART_SERIES_WARNING;

/** Whether this many series is more than Line and Bar chart. */
export const overSeriesLimit = (seriesCount: number) => seriesCount > CHART_SERIES_LIMIT;

/** The toast when Line or Bar adds a chart of more than `CHART_SERIES_WARNING` series. */
export const manySeriesWarning = (seriesCount: number) =>
  `Charting ${seriesCount} series. Charts with more than ${CHART_SERIES_WARNING} can be slow and hard to read.`;

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
