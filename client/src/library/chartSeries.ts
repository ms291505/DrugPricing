import type { NadacPrice } from "./types";

/** Number of distinct series (NDCs) a set of prices would draw. */
export function countSeries(nadacPrices: NadacPrice[]): number {
  return new Set(nadacPrices.map(price => price.ndc)).size;
}

export type PricingUnitGroup = {
  pricingUnit: string,
  nadacPrices: NadacPrice[],
};

/**
 * Splits prices by pricing unit so $/each and $/mL never share an axis.
 * Groups keep the order in which each unit first appears.
 */
export function splitByPricingUnit(nadacPrices: NadacPrice[]): PricingUnitGroup[] {
  const groups = new Map<string, NadacPrice[]>();
  for (const price of nadacPrices) {
    const group = groups.get(price.pricingUnit);
    if (group) group.push(price);
    else groups.set(price.pricingUnit, [price]);
  }
  return [...groups].map(([pricingUnit, prices]) => ({ pricingUnit, nadacPrices: prices }));
}

const PRICING_UNIT_ABBREVIATIONS: Record<string, string> = {
  each: "each",
  milliliter: "mL",
  gram: "g",
};

/** Short unit for axis captions and tooltips: "each", "mL", "g". */
export function pricingUnitLabel(pricingUnit: string): string {
  return PRICING_UNIT_ABBREVIATIONS[pricingUnit] ?? pricingUnit;
}
