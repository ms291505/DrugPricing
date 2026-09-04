import type { NadacPrice } from "./types";

type DateNumber = number;
type Ndc = string;
type Price = number;
type NadacPriceRow = Record<Ndc, Price>;
type NadacPriceAccumulator = Record<DateNumber, NadacPriceRow>;

/**
 * Transforms NADAC pricing rows into the shape the LineViz chart component expects.
 *
 * @param nadacPrices - an array of NadacPrices
 * @returns Array of chart-ready data points, sorted by date
 */
export function createLineVizData(nadacPrices: NadacPrice[]) {
  return Object.values(
    nadacPrices.reduce<NadacPriceAccumulator>((acc, { asOfDate, ndc, nadacPerUnit }) => {
      const dateKey = asOfDate.getTime();
      acc[dateKey] = acc[dateKey] || { asOfDate: dateKey };
      acc[dateKey][ndc] = nadacPerUnit;
      return acc;
    }, {})
  ).sort((a, b) => (a.asOfDate) - (b.asOfDate));
}
