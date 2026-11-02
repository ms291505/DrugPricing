import { MAX_AUTO_CHART_SERIES } from "./constants";
import type { ChartPrice } from "./types";

/** Number of distinct series (NDCs) a set of prices would draw. */
export function countSeries(nadacPrices: ChartPrice[]): number {
  return new Set(nadacPrices.map(price => price.ndc)).size;
}

/** Whether a result should get auto-added charts: at least one series, and not too many to read. */
export function shouldAutoChart(nadacPrices: ChartPrice[]): boolean {
  const seriesCount = countSeries(nadacPrices);
  return seriesCount > 0 && seriesCount <= MAX_AUTO_CHART_SERIES;
}
