import type { ChartPrice } from "./types";

/*
 * Price math shared by the charts and the results tables, so both show the same numbers. Charts
 * and tables shape these results for display; they don't aggregate prices themselves.
 */

type Ndc = string;

/**
 * One series' price on one date. At FDA product level several packages share a series and a
 * date, so the price is their average, with their spread in `min`/`max` and their number in `count`.
 */
export type DatePrice = { asOfDate: number, average: number, min: number, max: number, count: number };

/**
 * Each series' prices per date, oldest first. Series keep the order they first appear in.
 *
 * @param prices - prices in one pricing unit
 */
export function seriesByDate(prices: ChartPrice[]): Map<Ndc, DatePrice[]> {
  const grouped = new Map<Ndc, Map<number, number[]>>();
  for (const { ndc, asOfDate, nadacPerUnit } of prices) {
    let byDate = grouped.get(ndc);
    if (!byDate) grouped.set(ndc, byDate = new Map<number, number[]>());
    const time = asOfDate.getTime();
    const onDate = byDate.get(time);
    if (onDate) onDate.push(nadacPerUnit);
    else byDate.set(time, [nadacPerUnit]);
  }
  return new Map([...grouped].map(([ndc, byDate]) => [
    ndc,
    [...byDate]
      .map(([asOfDate, values]) => ({
        asOfDate,
        average: values.reduce((sum, value) => sum + value, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length,
      }))
      .sort((a, b) => a.asOfDate - b.asOfDate),
  ]));
}

const PRICING_UNIT_ABBREVIATIONS: Record<string, string> = {
  each: "each",
  milliliter: "mL",
  gram: "g",
};

/** Short unit for axis captions, tooltips and table cells: "each", "mL", "g". */
export function pricingUnitLabel(pricingUnit: string): string {
  return PRICING_UNIT_ABBREVIATIONS[pricingUnit] ?? pricingUnit;
}

export type PricingUnitGroup = {
  pricingUnit: string,
  nadacPrices: ChartPrice[],
};

/**
 * Splits prices by pricing unit so $/each and $/mL are never averaged or drawn together.
 * Groups keep the order in which each unit first appears.
 */
export function splitByPricingUnit(nadacPrices: ChartPrice[]): PricingUnitGroup[] {
  const groups = new Map<string, ChartPrice[]>();
  for (const price of nadacPrices) {
    const group = groups.get(price.pricingUnit);
    if (group) group.push(price);
    else groups.set(price.pricingUnit, [price]);
  }
  return [...groups].map(([pricingUnit, prices]) => ({ pricingUnit, nadacPrices: prices }));
}

export type PriceSummary = {
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
 * Summarizes each series from its per-date prices (`seriesByDate`), the values the line chart
 * draws: at product level, a date's value is the average of the product's packages. So `min`/`max`
 * are the range of that line over the given prices' dates, never the spread between packages, and
 * `average` weighs every date equally however many packages priced it.
 *
 * @param prices - prices in one pricing unit, already clipped to the dates wanted
 */
export function summarizePrices(prices: ChartPrice[]): PriceSummary[] {
  const series = seriesByDate(prices);
  // NADAC sometimes renames an NDC, and prices arrive in no set order: label each series with its
  // description on its latest date (the first one seen on that date).
  const labels = new Map<string, { label: string, asOfDate: number }>();
  for (const price of prices) {
    const asOfDate = price.asOfDate.getTime();
    const current = labels.get(price.ndc);
    if (!current || asOfDate > current.asOfDate) labels.set(price.ndc, { label: price.ndcDescription, asOfDate });
  }

  return [...labels].map(([ndc, { label }]) => {
    const datePrices = series.get(ndc)!;
    const values = datePrices.map(datePrice => datePrice.average);
    const last = datePrices[datePrices.length - 1];
    return {
      ndc,
      label,
      latest: last.average,
      latestDate: last.asOfDate,
      average: values.reduce((sum, value) => sum + value, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      packages: Math.max(...datePrices.map(datePrice => datePrice.count)),
    };
  });
}

/** One series summarized in a single pricing unit. */
export type UnitPriceSummary = PriceSummary & { pricingUnit: string };

/**
 * Summarizes each series per pricing unit, since units never mix. Almost every series has one
 * unit, but a few FDA products have packages priced in different units (cholestyramine packets
 * per each, its canisters per gram).
 *
 * @returns each series' summaries, one per unit, keyed by NDC in the order series first appear
 */
export function summarizeByUnit(prices: ChartPrice[]): Map<Ndc, UnitPriceSummary[]> {
  const summaries = new Map<Ndc, UnitPriceSummary[]>(prices.map(price => [price.ndc, []]));
  for (const { pricingUnit, nadacPrices } of splitByPricingUnit(prices)) {
    for (const summary of summarizePrices(nadacPrices)) {
      summaries.get(summary.ndc)!.push({ ...summary, pricingUnit });
    }
  }
  return summaries;
}

/**
 * The summary priced most recently: a series' latest price date and description when it has
 * several units. Undefined without summaries.
 */
export function latestSummary<S extends PriceSummary>(summaries: S[]): S | undefined {
  return summaries.reduce<S | undefined>((latest, summary) =>
    !latest || summary.latestDate > latest.latestDate ? summary : latest, undefined);
}

/** A price with its unit, for sorting prices in different units. */
export type UnitPrice = { pricingUnit: string, price: number };

/**
 * Orders prices by unit, then by price, so a sort never ranks $/each against $/mL. A missing price
 * sorts first, as MUI's number sort puts empty cells.
 */
export function compareUnitPrices(a: UnitPrice | undefined, b: UnitPrice | undefined): number {
  if (!a || !b) return (a ? 1 : 0) - (b ? 1 : 0);
  return a.pricingUnit.localeCompare(b.pricingUnit) || a.price - b.price;
}
