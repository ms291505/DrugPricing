import { SERIES_KIND_LABELS, type ChartType, type SeriesKind } from "./explorerItems";
import { clipToWindow, dateBounds, formatDate, formatWindow, type DateWindow } from "./dates";
import { pricingUnitLabel } from "./prices";
import type { ChartPrice } from "./types";

/*
 * Chart titles are generated from the data: the title says what is common to the series (the
 * search, how many, what kind), the legend says what differs.
 */

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "2 products", "1 NDC" */
export function seriesCountLabel(count: number, seriesKind: SeriesKind): string {
  const { singular, plural } = SERIES_KIND_LABELS[seriesKind];
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * "Humira: 7 products over time" (line) or "Humira: 7 products compared" (bar). One series is
 * named by its own label instead: "HUMIRA KIT 40 mg over time".
 */
export function chartTitle(chartType: ChartType, searchLabel: string, seriesKind: SeriesKind, seriesLabels: string[]): string {
  const subject = seriesLabels.length === 1
    ? seriesLabels[0]
    : `${capitalize(searchLabel)}: ${seriesCountLabel(seriesLabels.length, seriesKind)}`;
  return chartType === "line" ? `${subject} over time` : `${subject} compared`;
}

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

/** "Metformin: price changes of 25% or more": a pinned list's title. */
export const pinnedPriceChangeListTitle = (searchLabel: string, thresholdPercent: number) =>
  `${capitalize(searchLabel)}: price changes of ${thresholdPercent}% or more`;

/** "Price change · Oct 21, 2026 · 3089321 · per each": a package's Chart this change card. */
export const eventChartTitle = (date: number, packageNdc: string, pricingUnit: string) =>
  `Price change · ${formatDate(date)} · ${packageNdc} · per ${pricingUnitLabel(pricingUnit)}`;
