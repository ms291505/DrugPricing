import { describe, expect, it } from "vitest";
import { fdaPackagePrices, flagPriceChanges, meetsThreshold } from "./flagNadacPriceChange";
import type { FdaProductDetail, NadacPrice } from "./types";

describe("flagPriceChanges", () => {
  const price = (ndc: string, iso: string, nadacPerUnit: number): NadacPrice =>
    ({ ndc, asOfDate: new Date(iso), nadacPerUnit, pricingUnit: "EA", ndcDescription: ndc } as NadacPrice);

  it("flags each NADAC package's changes against its own prices, whatever order they come in", () => {
    const prices = [
      price("A", "2026-01-14", 5.52), price("B", "2026-01-07", 2), price("A", "2026-01-07", 9.69),
      price("B", "2026-01-14", 2.05),
    ];
    const changes = flagPriceChanges(["A", "B"].map(packageNdc => ({ packageNdc, prices: prices.filter(p => p.ndc === packageNdc) })));
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

  it("keeps the package boundary guard and does not flag two zero observations", () => {
    expect(() => flagPriceChanges([{ packageNdc: "A", prices: [price("A", "2026-01-07", 10), price("B", "2026-01-14", 5)] }])).toThrow("different drug packages");
    expect(flagPriceChanges([{ packageNdc: "A", prices: [price("A", "2026-01-07", 0), price("A", "2026-01-14", 0)] }])).toEqual([]);
  });

  it("ignores changes under the threshold, and flags one exactly at it", () => {
    const prices = (later: number) => [price("A", "2026-01-07", 10), price("A", "2026-01-14", later)];
    expect(flagPriceChanges([{ packageNdc: "A", prices: prices(10.99) }])).toEqual([]);
    expect(flagPriceChanges([{ packageNdc: "A", prices: prices(11) }])).toHaveLength(1);
  });

  it("takes its threshold as a percent", () => {
    const prices = [price("A", "2026-01-07", 10), price("A", "2026-01-14", 10.6)];
    expect(flagPriceChanges([{ packageNdc: "A", prices }])).toEqual([]);
    expect(flagPriceChanges([{ packageNdc: "A", prices }], 5)).toHaveLength(1);
  });

  it("averages a date's duplicate prices before comparing them", () => {
    // 10 then (10.5 + 11.5) / 2 = 11: a 10% rise, though neither duplicate alone is one.
    const prices = [price("A", "2026-01-07", 10), price("A", "2026-01-14", 10.5), price("A", "2026-01-14", 11.5)];
    const changes = flagPriceChanges([{ packageNdc: "A", prices }], 10);
    expect(changes.map(c => c.priceChange.newPrice)).toEqual([11]);
  });

  it("flags each package and pricing unit separately", () => {
    const changes = flagPriceChanges([
      { packageNdc: "A", prices: [price("A", "2026-01-07", 10), { ...price("A", "2026-01-14", 20), pricingUnit: "ML" }] },
      { packageNdc: "B", prices: [price("B", "2026-01-07", 10), price("B", "2026-01-14", 20)] },
    ]);
    expect(changes.map(c => c.packageNdc)).toEqual(["B"]);
  });
});

describe("meetsThreshold", () => {
  it("compares in tenths of a percent", () => {
    // (0.9 - 1) / 1 is -0.09999999999999998 in floating point.
    expect(meetsThreshold(1, 0.9, 10)).toBe(true);
    expect(meetsThreshold(1, 0.901, 10)).toBe(false);
    expect(meetsThreshold(10, 11, 10)).toBe(true);
    expect(meetsThreshold(10, 10.74, 7.5)).toBe(false);
    expect(meetsThreshold(10, 10.75, 7.5)).toBe(true);
  });

  it("reaches past 100% for rises and exactly 100% for a drop to $0", () => {
    expect(meetsThreshold(2, 5, 150)).toBe(true);
    expect(meetsThreshold(2, 4.99, 150)).toBe(false);
    expect(meetsThreshold(2, 0, 100)).toBe(true);
  });

  it("counts a change from $0 at every threshold, and no change at none", () => {
    expect(meetsThreshold(0, 1, 500)).toBe(true);
    expect(meetsThreshold(0, 0, 5)).toBe(false);
    expect(meetsThreshold(3, 3, 5)).toBe(false);
  });
});
