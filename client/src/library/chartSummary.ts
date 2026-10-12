import { createLineVizData } from "./createLineVizData";
import { formatPrice } from "./chartScale";
import { dateBounds, formatDate } from "./dates";
import { summarizeSeries, type BarValue, type SeriesSummary } from "./seriesSummary";
import type { ChartChangeSpan } from "./explorerItems";
import type { ChartPrice } from "./types";

/*
 * Text alternatives for the charts, read by screen readers as the chart's description. A few
 * sentences on what stands out; the View data table is where completeness lives.
 */

const formatPercent = (ratio: number) => `${(Math.abs(ratio) * 100).toFixed(1)}%`;

const seriesDates = (count: number, prices: ChartPrice[]) => {
  const bounds = dateBounds(prices);
  const dates = bounds ? `, ${formatDate(bounds.first)} to ${formatDate(bounds.last)}` : "";
  return `${count} series${dates}.`;
};

/** "0074-4339 at $6,745.00", with the date when the series stopped before the chart's last date. */
function latestOf(summary: SeriesSummary, lastDate: number): string {
  const stopped = summary.latestDate < lastDate ? ` (last priced ${formatDate(summary.latestDate)})` : "";
  return `${summary.ndc} at ${formatPrice(summary.latest)}${stopped}`;
}

export type LargestChange = { ndc: string, ratio: number, date: number };

/**
 * The largest relative change between consecutive priced dates of one series, from the per-date
 * values the line draws (a product's average, not one of its packages). `date` is the first date
 * at the new price. Ties go to the earliest date. Null when no series changed.
 */
export function largestChange(prices: ChartPrice[]): LargestChange | null {
  const { rows } = createLineVizData(prices);
  const ndcs = new Set(prices.map(price => price.ndc));
  let largest: LargestChange | null = null;
  for (const ndc of ndcs) {
    let previous: number | undefined;
    for (const row of rows) {
      const value = row[ndc];
      if (typeof value !== "number") continue;
      if (previous !== undefined && previous > 0 && value !== previous) {
        const ratio = (value - previous) / previous;
        const larger = !largest || Math.abs(ratio) > Math.abs(largest.ratio)
          || (Math.abs(ratio) === Math.abs(largest.ratio) && row.asOfDate < largest.date);
        if (larger) largest = { ndc, ratio, date: row.asOfDate };
      }
      previous = value;
    }
  }
  return largest;
}

/** "Price dropped 43.0% from $9.69 to $5.52 on Jan 14, 2026.": the callout pill, in words. */
function changeSentence(span: ChartChangeSpan): string {
  const { from, to } = span;
  if (from === undefined || to === undefined || from <= 0) return `Price changed ${span.label} on ${formatDate(span.end)}.`;
  const verb = to < from ? "dropped" : "rose";
  return `Price ${verb} ${formatPercent((to - from) / from)} from ${formatPrice(from)} to ${formatPrice(to)} on ${formatDate(span.end)}.`;
}

/**
 * A line chart's summary: the change it calls out (price-change cards), the series count and
 * dates, the latest prices, and the largest change, then how to use the keyboard.
 *
 * @param prices - one pricing unit, already clipped to the chart's dates
 */
export function lineChartSummary(prices: ChartPrice[], changeSpan?: ChartChangeSpan): string {
  const summaries = summarizeSeries(prices);
  const lastDate = Math.max(...summaries.map(summary => summary.latestDate));
  const sentences: string[] = [];

  if (changeSpan) sentences.push(changeSentence(changeSpan));
  sentences.push(seriesDates(summaries.length, prices));

  if (summaries.length === 1) {
    const [only] = summaries;
    sentences.push(`Latest price: ${formatPrice(only.latest)} on ${formatDate(only.latestDate)}.`);
  } else if (summaries.length > 1) {
    const byLatest = [...summaries].sort((a, b) => b.latest - a.latest);
    sentences.push(`Highest latest price: ${latestOf(byLatest[0], lastDate)}; lowest: ${latestOf(byLatest[byLatest.length - 1], lastDate)}.`);
  }

  // A price-change card already leads with its change.
  const change = changeSpan ? null : largestChange(prices);
  if (change) {
    const direction = change.ratio < 0 ? "down" : "up";
    sentences.push(`Largest change: ${direction} ${formatPercent(change.ratio)} for ${change.ndc} on ${formatDate(change.date)}.`);
  }

  sentences.push("Use the left and right arrow keys to move through dates.");
  return sentences.join(" ");
}

/**
 * A bar chart's summary: what a row shows, the highest and lowest rows, and the overall range,
 * from the same rows the chart draws.
 *
 * @param prices - one pricing unit, already clipped to the chart's dates
 */
export function barChartSummary(prices: ChartPrice[], barValue: BarValue): string {
  const rows = summarizeSeries(prices).sort((a, b) => b[barValue] - a[barValue]);
  if (rows.length === 0) return "";
  const basis = barValue === "latest" ? "latest price" : "average price";
  const row = (summary: SeriesSummary) => `${summary.ndc} at ${formatPrice(summary[barValue])}`;
  const sentences = [
    `Rows show each series' ${basis}, highest first. ${seriesDates(rows.length, prices)}`,
    rows.length === 1
      ? `${row(rows[0])}.`
      : `Highest: ${row(rows[0])}; lowest: ${row(rows[rows.length - 1])}.`,
    `Range over these dates: ${formatPrice(Math.min(...rows.map(r => r.min)))} to ${formatPrice(Math.max(...rows.map(r => r.max)))}.`,
    "Use the left and right arrow keys to move through rows.",
  ];
  return sentences.join(" ");
}
