import type { DrugSummary, NadacPrice } from "./types";

export default function nadacPriceToDrugSummary(nadacPrices: NadacPrice[]): DrugSummary[] {
  return Object.entries(
    nadacPrices.reduce((acc, item) => {
      if (!acc[item.ndc]) {
        acc[item.ndc] = {
          total: 0, count: 0, ndcDescription: item.ndcDescription, pricingUnit: item.pricingUnit, minPrice: Infinity, maxPrice: 0
        };
      }
      acc[item.ndc].total += item.nadacPerUnit;
      acc[item.ndc].count += 1;

      acc[item.ndc].minPrice = Math.min(acc[item.ndc].minPrice, item.nadacPerUnit);
      acc[item.ndc].maxPrice = Math.max(acc[item.ndc].maxPrice, item.nadacPerUnit);

      return acc;
    }, {} as Record<string, { total: number; count: number; ndcDescription: string; pricingUnit: string; minPrice: number; maxPrice: number; }>)
  ).map(([ndc, { total, count, ndcDescription, pricingUnit, minPrice, maxPrice }]) => ({
    ndc,
    averagePrice: total / count,
    ndcDescription,
    pricingUnit,
    minPrice,
    maxPrice
  }));
}
