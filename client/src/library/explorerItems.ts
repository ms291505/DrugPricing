import type { ChartPrice } from "./types";

/**
 * Explorer items are the cards in a search tab's Pinned section. *System* items (the results
 * table, auto charts) are derived from the current search on every render and never stored.
 * *User* items are pinned snapshots: they stay as they are across new searches and filter
 * changes until the user acts on them.
 *
 * Only charts exist today. Other kinds (notes, stat cards, snapshot tables, price-event lists)
 * join the `ExplorerItem` union with their own `kind`.
 */

export type ExplorerItemWidth = "half" | "full";

/** Where a pinned item came from, shown as its provenance chip. */
export type ExplorerItemSource = {
  /** What was searched, e.g. "humira" or "NDC 3089321". */
  searchLabel: string,
  /** What one series is: "Products", "Packages", or "NDCs". */
  seriesLabel: string,
  seriesCount: number,
  /** True when page filters hid part of the search result at the time it was pinned. */
  filtered: boolean,
};

type ExplorerItemBase = {
  id: string,
  /** Title generated when the item was created. */
  defaultTitle: string,
  /** User override of `defaultTitle`. */
  title?: string,
  createdAt: number,
  layout: { width: ExplorerItemWidth },
  collapsed: boolean,
  source: ExplorerItemSource,
};

export type ChartType = "line" | "bar";

/**
 * One series of a chart, trimmed to what the chart draws so it can be stored and restored.
 * `points` holds every price the series had when pinned, as `[asOfDate ms, price]`; a product-level
 * series can have several points per date (one per package), which the chart averages.
 */
export type ChartSeriesSnapshot = {
  ndc: string,
  label: string,
  unit: string,
  points: Array<[number, number]>,
};

export type ChartItem = ExplorerItemBase & {
  kind: "chart",
  chartType: ChartType,
  series: ChartSeriesSnapshot[],
};

export type ExplorerItem = ChartItem;

export const itemTitle = (item: ExplorerItem) => item.title ?? item.defaultTitle;

/** Builds a chart snapshot from prices. Series are keyed by NDC and pricing unit. */
export function toChartSeries(prices: ChartPrice[]): ChartSeriesSnapshot[] {
  const series = new Map<string, ChartSeriesSnapshot>();
  for (const price of prices) {
    const key = price.ndc + "|" + price.pricingUnit;
    let entry = series.get(key);
    if (!entry) {
      entry = { ndc: price.ndc, label: price.ndcDescription, unit: price.pricingUnit, points: [] };
      series.set(key, entry);
    }
    entry.points.push([price.asOfDate.getTime(), price.nadacPerUnit]);
  }
  return [...series.values()];
}

/** Expands a chart snapshot back into the prices `LineViz` and `BarViz` draw. */
export function fromChartSeries(series: ChartSeriesSnapshot[]): ChartPrice[] {
  return series.flatMap(({ ndc, label, unit, points }) =>
    points.map(([time, price]) => ({
      ndc,
      ndcDescription: label,
      pricingUnit: unit,
      nadacPerUnit: price,
      asOfDate: new Date(time),
    }))
  );
}

type NewChartItem = {
  chartType: ChartType,
  prices: ChartPrice[],
  defaultTitle: string,
  source: Omit<ExplorerItemSource, "seriesCount">,
};

export function createChartItem({ chartType, prices, defaultTitle, source }: NewChartItem): ChartItem {
  const series = toChartSeries(prices);
  return {
    kind: "chart",
    id: crypto.randomUUID(),
    defaultTitle,
    createdAt: Date.now(),
    layout: { width: "half" },
    collapsed: false,
    chartType,
    series,
    source: { ...source, seriesCount: new Set(series.map(s => s.ndc)).size },
  };
}

/** Provenance chip text, e.g. "Products · 7 · from 'humira' · filtered". */
export function formatItemSource(source: ExplorerItemSource): string {
  const parts = [source.seriesLabel, String(source.seriesCount), `from '${source.searchLabel}'`];
  if (source.filtered) parts.push("filtered");
  return parts.join(" · ");
}

const CHART_TYPE_LABELS: Record<ChartType, string> = { line: "Line chart", bar: "Bar chart" };

/** Title for a chart made with Add Chart, e.g. "Line chart: 2 packages". */
export function addedChartTitle(chartType: ChartType, seriesCount: number, seriesLabel: string): string {
  // "Products" reads as "products" mid-sentence; an acronym like "NDCs" stays as is.
  const noun = /^[A-Z]{2}/.test(seriesLabel) ? seriesLabel : seriesLabel.toLowerCase();
  return `${CHART_TYPE_LABELS[chartType]}: ${seriesCount} ${seriesCount === 1 ? noun.replace(/s$/, "") : noun}`;
}
