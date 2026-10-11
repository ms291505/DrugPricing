import { createLineVizData } from "./createLineVizData";
import type { ChartPrice } from "./types";

/** What a bar shows: the latest price, or the average over the chart's dates. */
export type BarValue = "latest" | "average";

export type SeriesSummary = {
  ndc: string,
  label: string,
  latest: number,
  latestDate: number,
  average: number,
  min: number,
  max: number,
  /** Most prices on one date: more than 1 when a product averages several packages. */
  packages: number,
};

/**
 * Summarizes each series from the same per-date values the line chart draws: at product level, a
 * date's value is the average of the product's packages. So `min`/`max` are the range of that line
 * over the given prices' dates, never the spread between packages, and `average` weighs every
 * date equally however many packages priced it.
 *
 * @param prices - prices in one pricing unit, already clipped to the chart's dates
 */
export function summarizeSeries(prices: ChartPrice[]): SeriesSummary[] {
  const { rows } = createLineVizData(prices);
  const labels = new Map<string, string>();
  const packagesPerDate = new Map<string, Map<number, number>>();
  for (const price of prices) {
    labels.set(price.ndc, price.ndcDescription);
    const perDate = packagesPerDate.get(price.ndc) ?? new Map<number, number>();
    const time = price.asOfDate.getTime();
    perDate.set(time, (perDate.get(time) ?? 0) + 1);
    packagesPerDate.set(price.ndc, perDate);
  }

  return [...labels].map(([ndc, label]) => {
    const values = rows.flatMap(row => typeof row[ndc] === "number" ? [[row.asOfDate, row[ndc]] as const] : []);
    const [latestDate, latest] = values[values.length - 1];
    const prices = values.map(([, value]) => value);
    return {
      ndc,
      label,
      latest,
      latestDate,
      average: prices.reduce((sum, value) => sum + value, 0) / prices.length,
      min: Math.min(...prices),
      max: Math.max(...prices),
      packages: Math.max(...packagesPerDate.get(ndc)!.values()),
    };
  });
}
