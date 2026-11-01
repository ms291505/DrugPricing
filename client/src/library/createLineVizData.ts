import { distinctRange } from "./chartScale";
import type { ChartPrice } from "./types";

type DateNumber = number;
type Ndc = string;
type Price = number;
type PriceRange = [Price, Price];
export type LineVizRow = { asOfDate: DateNumber } & Record<Ndc, Price | PriceRange>;

type Accumulator = Record<DateNumber, Record<Ndc, Price[]>>;

const RANGE_KEY_SUFFIX = "__range";

/** dataKey for the min–max band drawn behind a series that averages several packages. */
export const rangeKey = (ndc: Ndc) => ndc + RANGE_KEY_SUFFIX;

/**
 * Transforms NADAC pricing rows into the shape the LineViz chart component expects.
 *
 * Several rows can share an NDC on one date (product level merges a product's packages under
 * the product NDC). Those are averaged into one point, and their min–max spread is kept under
 * `rangeKey(ndc)` so the chart can show it instead of hiding it.
 *
 * @param nadacPrices - prices, all in one pricing unit
 * @returns rows sorted by date; the NDCs whose packages differ at the precision shown on at least
 * one date (a band worth drawing); and per NDC, the most prices on one date (its package count)
 */
export function createLineVizData(nadacPrices: ChartPrice[]) {
  const byDate = nadacPrices.reduce<Accumulator>((acc, { asOfDate, ndc, nadacPerUnit }) => {
    const dateKey = asOfDate.getTime();
    acc[dateKey] ??= {};
    (acc[dateKey][ndc] ??= []).push(nadacPerUnit);
    return acc;
  }, {});

  const rangeNdcs = new Set<Ndc>();
  const packageCounts = new Map<Ndc, number>();

  const rows = Object.entries(byDate)
    .map(([dateKey, pricesByNdc]) => {
      const row: LineVizRow = { asOfDate: Number(dateKey) };
      for (const [ndc, prices] of Object.entries(pricesByNdc)) {
        row[ndc] = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        packageCounts.set(ndc, Math.max(packageCounts.get(ndc) ?? 0, prices.length));
        if (prices.length > 1) {
          const range: PriceRange = [Math.min(...prices), Math.max(...prices)];
          row[rangeKey(ndc)] = range;
          // Packages that all cost the same leave a band with no height: nothing to explain.
          if (distinctRange(range)) rangeNdcs.add(ndc);
        }
      }
      return row;
    })
    .sort((a, b) => a.asOfDate - b.asOfDate);

  return { rows, rangeNdcs, packageCounts };
}

/** The smallest band worth drawing, as a share of the price axis: about 3px on a 300px plot. */
const MIN_BAND_SHARE = 0.01;

/**
 * The series whose package band would be visible on a price axis: a $9 spread on a $2K–$7K axis
 * is under a pixel, and a caption about shading nobody can see only confuses. The tooltip and
 * View data still give every series' package range.
 *
 * @param rows - from `createLineVizData`
 * @param bandNdcs - the series to check, e.g. the shown ones in `rangeNdcs`
 * @param domain - the price axis
 */
export function visibleBandNdcs(rows: LineVizRow[], bandNdcs: Ndc[], domain: [number, number]): Ndc[] {
  const minSpread = (domain[1] - domain[0]) * MIN_BAND_SHARE;
  return bandNdcs.filter(ndc => rows.some(row => {
    const range = row[rangeKey(ndc)];
    return Array.isArray(range) && range[1] - range[0] >= minSpread;
  }));
}

/**
 * The caption under a line chart that averages packages, said once rather than in every tooltip
 * row: what the line is, and what the band behind it is. With several lines, it names the one
 * that averages, so the caption isn't read as being about every line.
 *
 * @param bandNdcs - the shown series with a band (see `rangeNdcs`)
 * @param shownCount - how many series the chart shows
 * @param packageCounts - from `createLineVizData`
 */
export function averagedLineCaption(bandNdcs: Ndc[], shownCount: number, packageCounts: Map<Ndc, number>): string | null {
  if (bandNdcs.length === 0) return null;
  const band = "shaded: their lowest to highest price on each date";
  if (bandNdcs.length > 1) return `Shaded lines: average of each product's packages · ${band}`;
  const [ndc] = bandNdcs;
  const line = shownCount === 1 ? "Line" : ndc;
  return `${line}: average of ${packageCounts.get(ndc)} packages · ${band}`;
}
