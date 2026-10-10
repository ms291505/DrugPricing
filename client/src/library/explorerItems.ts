import type { ChartPrice } from "./types";
import { inWindow, type DateBounds, type DateWindow } from "./dates";

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

/** What one chart series is. Stored as a kind, not display text, so wording can change later. */
export type SeriesKind = "product" | "package" | "ndc";

const SERIES_KIND_LABELS: Record<SeriesKind, { singular: string, plural: string, chip: string }> = {
  product: { singular: "product", plural: "products", chip: "Products" },
  package: { singular: "package", plural: "packages", chip: "Packages" },
  ndc: { singular: "NDC", plural: "NDCs", chip: "NDCs" },
};

/**
 * Where a pinned item came from, shown as its provenance chip. Computed from the item's data
 * compared with the full search result, never from page filter state, so it stays true once stored.
 */
export type ExplorerItemSource = {
  /** What was searched, e.g. "humira" or "NDC 3089321". */
  searchLabel: string,
  seriesKind: SeriesKind,
  seriesCount: number,
  /** Series of this kind in the whole search result, before page filters and selection. */
  resultSeriesCount: number,
  /** True when page filters dropped some prices from series the item shows. */
  filtered: boolean,
};

/**
 * What a new chart is made from: the search it came from, what a series is, and the full search
 * result at that level, unfiltered, to compare the chart's data against.
 */
export type ChartOrigin = {
  searchLabel: string,
  seriesKind: SeriesKind,
  resultPrices: ChartPrice[],
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

/** A stretch of a chart to shade and label, e.g. the week a price dropped 43%. */
export type ChartChangeSpan = {
  start: number,
  end: number,
  label: string,
};

export type ChartItem = ExplorerItemBase & {
  kind: "chart",
  chartType: ChartType,
  /** Every price of the chart's series, whatever `dateWindow` shows, so the window can widen later. */
  series: ChartSeriesSnapshot[],
  /** The dates the chart shows. */
  dateWindow: DateWindow,
  changeSpan?: ChartChangeSpan,
};

export type ExplorerItem = ChartItem;

export const itemTitle = (item: ExplorerItem) => item.title ?? item.defaultTitle;

const seriesKey = (ndc: string, unit: string) => ndc + "|" + unit;

/** Builds a chart snapshot from prices. Series are keyed by NDC and pricing unit. */
export function toChartSeries(prices: ChartPrice[]): ChartSeriesSnapshot[] {
  const series = new Map<string, ChartSeriesSnapshot>();
  for (const price of prices) {
    const key = seriesKey(price.ndc, price.pricingUnit);
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

const countNdcs = (series: ChartSeriesSnapshot[]) => new Set(series.map(s => s.ndc)).size;

type NewChartItem = {
  chartType: ChartType,
  prices: ChartPrice[],
  defaultTitle: string,
  origin: ChartOrigin,
  dateWindow: DateWindow,
  changeSpan?: ChartChangeSpan,
};

export function createChartItem({ chartType, prices, defaultTitle, origin, dateWindow, changeSpan }: NewChartItem): ChartItem {
  const series = toChartSeries(prices);
  const resultSeries = toChartSeries(origin.resultPrices);
  const resultPointCounts = new Map(resultSeries.map(s => [seriesKey(s.ndc, s.unit), s.points.length]));
  // Snapshots keep every date, so missing points come from page filters, never the window.
  const filtered = series.some(s => (resultPointCounts.get(seriesKey(s.ndc, s.unit)) ?? 0) > s.points.length);

  return {
    kind: "chart",
    id: crypto.randomUUID(),
    defaultTitle,
    createdAt: Date.now(),
    layout: { width: "half" },
    collapsed: false,
    chartType,
    series,
    dateWindow,
    ...(changeSpan && { changeSpan }),
    source: {
      searchLabel: origin.searchLabel,
      seriesKind: origin.seriesKind,
      seriesCount: countNdcs(series),
      resultSeriesCount: countNdcs(resultSeries),
      filtered,
    },
  };
}

/** Provenance chip text, e.g. "Products · 2 of 7 · from 'humira'" or "NDCs · 6 · from 'eliquis' · filtered". */
export function formatItemSource(source: ExplorerItemSource): string {
  const count = source.resultSeriesCount > source.seriesCount
    ? `${source.seriesCount} of ${source.resultSeriesCount}`
    : String(source.seriesCount);
  const parts = [SERIES_KIND_LABELS[source.seriesKind].chip, count, `from '${source.searchLabel}'`];
  if (source.filtered) parts.push("filtered");
  return parts.join(" · ");
}

const CHART_TYPE_LABELS: Record<ChartType, string> = { line: "Line chart", bar: "Bar chart" };

/** Title for a chart made with Add Chart, e.g. "Line chart: 2 packages". */
export function addedChartTitle(chartType: ChartType, seriesCount: number, seriesKind: SeriesKind): string {
  const { singular, plural } = SERIES_KIND_LABELS[seriesKind];
  return `${CHART_TYPE_LABELS[chartType]}: ${seriesCount} ${seriesCount === 1 ? singular : plural}`;
}

/** First and last date the chart has prices for, whatever its window shows. */
export function chartDataBounds(item: ChartItem): DateBounds | null {
  let first = Infinity;
  let last = -Infinity;
  for (const { points } of item.series) {
    for (const [time] of points) {
      if (time < first) first = time;
      if (time > last) last = time;
    }
  }
  return first <= last ? { first, last } : null;
}

/**
 * The highest visible price per pricing unit across the line charts, for "Match scale": matched
 * charts share an axis from 0 to it. Bar charts keep their own scale.
 */
export function matchedPriceMax(items: ExplorerItem[]): Map<string, number> {
  const maxByUnit = new Map<string, number>();
  for (const item of items) {
    if (item.kind !== "chart" || item.chartType !== "line") continue;
    for (const { unit, points } of item.series) {
      for (const [time, price] of points) {
        if (inWindow(time, item.dateWindow) && price > (maxByUnit.get(unit) ?? -Infinity)) {
          maxByUnit.set(unit, price);
        }
      }
    }
  }
  return maxByUnit;
}
