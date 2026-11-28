import { SERIES_KIND_LABELS, type ChartType, type SeriesKind } from "./explorerItems";
import { clipToWindow, dateBounds, formatDate, formatWindow, type DateWindow } from "./dates";
import { pricingUnitLabel } from "./prices";
import type { ChartPrice } from "./types";

/*
 * Chart titles are generated from the data: the title says what is common to the series (the
 * search, and the pricing unit that sets its card apart), the subtitle how many and over which
 * dates, and the legend what differs.
 */

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "2 products", "1 NDC" */
export function seriesCountLabel(count: number, seriesKind: SeriesKind): string {
  const { singular, plural } = SERIES_KIND_LABELS[seriesKind];
  return `${count} ${count === 1 ? singular : plural}`;
}

/** "USD per mL": the currency and pricing unit of a chart's prices. */
export const unitHeading = (pricingUnit: string) => `USD per ${pricingUnitLabel(pricingUnit)}`;

/**
 * "Humira · USD per mL", for a card of one pricing unit's series, so that the cards a search
 * splits into by unit differ by their headings. One series is named by its own label instead:
 * "HUMIRA KIT 40 mg · USD per each". Without a unit (a card whose units are all hidden), just
 * the name.
 */
export function chartTitle(searchLabel: string, seriesLabels: string[], pricingUnit?: string): string {
  const subject = seriesLabels.length === 1 ? seriesLabels[0] : capitalize(searchLabel);
  return pricingUnit === undefined ? subject : `${subject} · ${unitHeading(pricingUnit)}`;
}

/**
 * Whether a chart's title already gives its currency and unit, as generated titles do. Older pins
 * and titles the user chose may not; their charts say it themselves (`UnitSplit`).
 */
export const titleNamesUnit = (title: string, pricingUnit: string) => title.includes(unitHeading(pricingUnit));

/** A unit chart's accessible name: its title, with the currency and unit unless the title gives them. */
export const unitChartLabel = (title: string, pricingUnit: string) =>
  titleNamesUnit(title, pricingUnit) ? title : `${title}, ${unitHeading(pricingUnit)}`;

/** One label per series (NDC), in order of appearance. */
export function seriesLabels(prices: ChartPrice[]): string[] {
  const labels = new Map<string, string>();
  for (const price of prices) if (!labels.has(price.ndc)) labels.set(price.ndc, price.ndcDescription);
  return [...labels.values()];
}

/** "7 products · Jan 5, 2022 – Oct 7, 2026": how many series, and the dates shown (open ends from the data). */
export function chartSubtitle(seriesCount: number, seriesKind: SeriesKind, dateWindow: DateWindow, prices: ChartPrice[]): string {
  const dates = formatWindow(dateWindow, dateBounds(clipToWindow(prices, dateWindow)) ?? dateBounds(prices));
  return [seriesCountLabel(seriesCount, seriesKind), dates].filter(Boolean).join(" · ");
}

/** "Price changes of 25% or more": a scan card's title. */
export const priceChangeListTitle = (thresholdPercent: number) => `Price changes of ${thresholdPercent}% or more`;

/** "Package changes of 25% or more in these dates and filters.": every list card's subtitle. */
export const priceChangeListSubtitle = (thresholdPercent: number) =>
  `Package changes of ${thresholdPercent}% or more in these dates and filters.`;

/**
 * What a scan found, for the status line beside Scan price changes: "Found 3 package changes of
 * 25% or more in these dates and filters.", or that it found none.
 */
export const scanReportMessage = (changeCount: number, thresholdPercent: number) => changeCount === 0
  ? `No package changes of ${thresholdPercent}% or more in these dates and filters.`
  : `Found ${changeCount} package ${changeCount === 1 ? "change" : "changes"} of ${thresholdPercent}% or more in these dates and filters.`;

/**
 * What Line or Bar added, for the status line under the results toolbar: "Added a line chart of
 * 3 packages.", saying when its pricing units split it into several cards.
 */
export function addedChartMessage(chartType: ChartType, seriesCount: number, seriesKind: SeriesKind, unitCount: number): string {
  const chart = `Added a ${chartType} chart of ${seriesCountLabel(seriesCount, seriesKind)}`;
  return unitCount > 1 ? `${chart}, one card for each of its ${unitCount} pricing units.` : `${chart}.`;
}

/** An added chart's subtitle note when the dates or filters hide some of its rows: "2 hidden". */
export const hiddenSeriesNote = (hiddenCount: number) => hiddenCount > 0 ? `${hiddenCount} hidden` : "";

/** "Metformin: price changes of 25% or more": a pinned list's title. */
export const pinnedPriceChangeListTitle = (searchLabel: string, thresholdPercent: number) =>
  `${capitalize(searchLabel)}: price changes of ${thresholdPercent}% or more`;

/** "Price change · Oct 21, 2026 · 3089321 · USD per each": a package's Chart this change card. */
export const eventChartTitle = (date: number, packageNdc: string, pricingUnit: string) =>
  `Price change · ${formatDate(date)} · ${packageNdc} · ${unitHeading(pricingUnit)}`;
