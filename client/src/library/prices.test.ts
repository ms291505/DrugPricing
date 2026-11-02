import { describe, expect, it } from "vitest";
import { seriesByDate, splitByPricingUnit, summarizeByUnit, summarizePrices } from "./prices";
import type { ChartPrice } from "./types";

const price = (ndc: string, iso: string, nadacPerUnit: number): ChartPrice =>
  ({ ndc, ndcDescription: `Drug ${ndc}`, pricingUnit: "each", nadacPerUnit, asOfDate: new Date(iso) });

describe("seriesByDate", () => {
  it("merges each series' prices on a date into their average and spread, oldest first", () => {
    const series = seriesByDate([
      price("P", "2025-02-01", 12),
      price("A", "2025-01-01", 1),
      price("P", "2025-01-01", 10), price("P", "2025-01-01", 30),
    ]);
    expect([...series.keys()]).toEqual(["P", "A"]);
    expect(series.get("P")).toEqual([
      { asOfDate: Date.parse("2025-01-01"), average: 20, min: 10, max: 30, count: 2 },
      { asOfDate: Date.parse("2025-02-01"), average: 12, min: 12, max: 12, count: 1 },
    ]);
  });
});

describe("splitByPricingUnit", () => {
  it("groups prices by unit in the order units first appear", () => {
    const ml = { ...price("B", "2025-01-01", 2), pricingUnit: "milliliter" };
    const groups = splitByPricingUnit([price("A", "2025-01-01", 1), ml, price("C", "2025-01-01", 3)]);
    expect(groups.map(g => [g.pricingUnit, g.nadacPrices.map(p => p.ndc)])).toEqual([["each", ["A", "C"]], ["milliliter", ["B"]]]);
  });
});

describe("summarizePrices", () => {
  it("summarizes a product from its per-date package averages, not raw rows", () => {
    const prices = [
      // Two packages on the first two dates, one on the last.
      price("P", "2025-01-01", 10), price("P", "2025-01-01", 20),
      price("P", "2025-02-01", 12), price("P", "2025-02-01", 22),
      price("P", "2025-03-01", 30),
    ];
    const [summary] = summarizePrices(prices);
    expect(summary).toMatchObject({ ndc: "P", latest: 30, latestDate: Date.parse("2025-03-01"), min: 15, max: 30, packages: 2 });
    // (15 + 17 + 30) / 3: each date counts once.
    expect(summary.average).toBeCloseTo(62 / 3);
  });

  it("gives one summary per series", () => {
    const summaries = summarizePrices([price("A", "2025-01-01", 1), price("B", "2025-01-01", 2)]);
    expect(summaries.map(s => [s.ndc, s.latest, s.packages])).toEqual([["A", 1, 1], ["B", 2, 1]]);
  });
});

describe("summarizeByUnit", () => {
  const priceIn = (ndc: string, pricingUnit: string, iso: string, nadacPerUnit: number): ChartPrice =>
    ({ ...price(ndc, iso, nadacPerUnit), pricingUnit });

  it("is empty without prices", () => {
    expect(summarizeByUnit([]).size).toBe(0);
  });

  it("summarizes each series with its pricing unit, in the order series first appear", () => {
    const summaries = summarizeByUnit([
      price("B", "2025-01-01", 5),
      price("P", "2025-01-01", 10), price("P", "2025-01-01", 20), price("P", "2025-02-01", 30),
    ]);
    expect([...summaries.keys()]).toEqual(["B", "P"]);
    expect(summaries.get("P")).toHaveLength(1);
    expect(summaries.get("P")![0]).toMatchObject({ latest: 30, average: 22.5, min: 15, max: 30, packages: 2, pricingUnit: "each" });
  });

  it("summarizes each unit of a series on its own, never averaging across units", () => {
    const summaries = summarizeByUnit([
      priceIn("P", "milliliter", "2025-01-01", 1), priceIn("P", "each", "2025-02-01", 100), priceIn("P", "milliliter", "2025-03-01", 3),
    ]);
    expect(summaries.get("P")!.map(s => [s.pricingUnit, s.latest, s.min, s.max, s.latestDate])).toEqual([
      ["milliliter", 3, 1, 3, Date.parse("2025-03-01")],
      ["each", 100, 100, 100, Date.parse("2025-02-01")],
    ]);
  });
});
