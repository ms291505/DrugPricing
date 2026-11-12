import { describe, expect, it } from "vitest";
import { fdaPackagePrices, flagPriceChanges, nadacPackagePrices } from "./flagNadacPriceChange";
import type { FdaProductDetail, NadacPrice } from "./types";

describe("flagPriceChanges", () => {
  const price = (ndc: string, iso: string, nadacPerUnit: number): NadacPrice =>
    ({ ndc, asOfDate: new Date(iso), nadacPerUnit, pricingUnit: "EA", ndcDescription: ndc } as NadacPrice);

  it("flags each NADAC package's changes against its own prices, whatever order they come in", () => {
    const prices = [
      price("A", "2026-01-14", 5.52), price("B", "2026-01-07", 2), price("A", "2026-01-07", 9.69),
      price("B", "2026-01-14", 2.05),
    ];
    const changes = flagPriceChanges(nadacPackagePrices(prices));
    expect(changes.map(c => [c.packageNdc, c.priceChange.oldPrice, c.priceChange.newPrice])).toEqual([["A", 9.69, 5.52]]);
    // The result isn't reordered in place.
    expect(prices.map(p => p.nadacPerUnit)).toEqual([5.52, 2, 9.69, 2.05]);
  });

  it("flags FDA packages under their dashed NDC without reordering their prices", () => {
    const nadacPrices = [price("3089321", "2026-01-14", 5.52), price("3089321", "2026-01-07", 9.69)];
    const products = [{ fdaPackageDetails: [{ ndcPackageCode: "00003-0893-21", nadacPrices }] }] as unknown as FdaProductDetail[];
    const changes = flagPriceChanges(fdaPackagePrices(products));
    expect(changes.map(c => [c.packageNdc, c.priceChange.packageNdc, c.priceChange.percentage < 0])).toEqual([["00003-0893-21", "3089321", true]]);
    expect(nadacPrices[0].nadacPerUnit).toBe(5.52);
  });

  it("ignores changes under the threshold, and flags one exactly at it", () => {
    const prices = (later: number) => [price("A", "2026-01-07", 10), price("A", "2026-01-14", later)];
    expect(flagPriceChanges([{ packageNdc: "A", prices: prices(10.99) }])).toEqual([]);
    expect(flagPriceChanges([{ packageNdc: "A", prices: prices(11) }])).toHaveLength(1);
  });
});
