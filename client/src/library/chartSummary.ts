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

type Change = { ndc: string, ratio: number, date: number };

/** The largest change, and every series that made the same change (to the percent shown) on its date. */
export type LargestChange = Change & { ndcs: string[] };

const sameChange = (a: Change, b: Change) =>
  a.date === b.date && Math.sign(a.ratio) === Math.sign(b.ratio) && formatPercent(a.ratio) === formatPercent(b.ratio);

/**
 * The largest relative change between consecutive priced dates of one series, from the per-date
 * values the line draws (a product's average, not one of its packages). `date` is the first date
 * at the new price. Ties go to the earliest date. A manufacturer often reprices a whole line on one
 * date, so `ndcs` lists every series with the same change. Null when no series changed.
 */
export function largestChange(prices: ChartPrice[]): LargestChange | null {
  const { rows } = createLineVizData(prices);
  const changes: Change[] = [];
  for (const ndc of new Set(prices.map(price => price.ndc))) {
    let previous: number | undefined;
    for (const row of rows) {
      const value = row[ndc];
      if (typeof value !== "number") continue;
      if (previous !== undefined && previous > 0 && value !== previous) {
        changes.push({ ndc, ratio: (value - previous) / previous, date: row.asOfDate });
      }
      previous = value;
    }
  }
  let largest: Change | null = null;
  for (const change of changes) {
    const larger = !largest || Math.abs(change.ratio) > Math.abs(largest.ratio)
      || (Math.abs(change.ratio) === Math.abs(largest.ratio) && change.date < largest.date);
    if (larger) largest = change;
  }
  if (!largest) return null;
  const top = largest;
  return { ...top, ndcs: [top.ndc, ...changes.filter(c => c.ndc !== top.ndc && sameChange(c, top)).map(c => c.ndc)] };
}

/** "0003-3764", "0003-3764 and 2 others", "both series" or "all 3 series". */
function whichSeries(ndcs: string[], seriesCount: number): string {
  if (ndcs.length === 1) return ndcs[0];
  if (ndcs.length === seriesCount) return seriesCount === 2 ? "both series" : `all ${seriesCount} series`;
  const others = ndcs.length - 1;
  return `${ndcs[0]} and ${others} ${others === 1 ? "other" : "others"}`;
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
    sentences.push(`Largest change: ${direction} ${formatPercent(change.ratio)} for ${whichSeries(change.ndcs, summaries.length)} on ${formatDate(change.date)}.`);
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
    // Recharts reverses the arrow keys on a vertical chart.
    "Use the left arrow key to move down the rows and the right arrow key to move up.",
  ];
  return sentences.join(" ");
}
