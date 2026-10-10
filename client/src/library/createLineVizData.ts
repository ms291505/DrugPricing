import type { NadacPrice } from "./types";

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
 * @param nadacPrices - an array of NadacPrices, all in one pricing unit
 * @returns rows sorted by date, plus the NDCs that have a spread on at least one date
 */
export function createLineVizData(nadacPrices: NadacPrice[]) {
  const byDate = nadacPrices.reduce<Accumulator>((acc, { asOfDate, ndc, nadacPerUnit }) => {
    const dateKey = asOfDate.getTime();
    acc[dateKey] ??= {};
    (acc[dateKey][ndc] ??= []).push(nadacPerUnit);
    return acc;
  }, {});

  const rangeNdcs = new Set<Ndc>();

  const rows = Object.entries(byDate)
    .map(([dateKey, pricesByNdc]) => {
      const row: LineVizRow = { asOfDate: Number(dateKey) };
      for (const [ndc, prices] of Object.entries(pricesByNdc)) {
        row[ndc] = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        if (prices.length > 1) {
          row[rangeKey(ndc)] = [Math.min(...prices), Math.max(...prices)];
          rangeNdcs.add(ndc);
        }
      }
      return row;
    })
    .sort((a, b) => a.asOfDate - b.asOfDate);

  return { rows, rangeNdcs };
}
