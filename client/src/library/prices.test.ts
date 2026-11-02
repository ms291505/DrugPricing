import { describe, expect, it } from "vitest";
import { compareUnitPrices, latestSummary, seriesByDate, splitByPricingUnit, summarizeByUnit, summarizePrices, type UnitPriceSummary } from "./prices";
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

  it("labels a series with its description on its latest date, whatever order prices arrive in", () => {
    // Newest first: the server's query has no ORDER BY.
    const [summary] = summarizePrices([
      { ...price("A", "2025-02-01", 2), ndcDescription: "NEW" },
      { ...price("A", "2025-01-01", 1), ndcDescription: "OLD" },
    ]);
    expect(summary.label).toBe("NEW");
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

  it("averages packages per date within each unit of a product priced in two units", () => {
    // The Prevalite case: packets per each and canisters per gram, several of each on one date.
    const summaries = summarizeByUnit([
      priceIn("P", "each", "2025-01-01", 1), priceIn("P", "each", "2025-01-01", 3),
      priceIn("P", "gram", "2025-01-01", 0.2), priceIn("P", "gram", "2025-01-01", 0.4),
      priceIn("P", "each", "2025-02-01", 4), priceIn("P", "each", "2025-02-01", 6),
      priceIn("P", "gram", "2025-02-01", 0.6),
    ]);
    expect(summaries.get("P")!.map(s => [s.pricingUnit, s.latest, s.min, s.max, s.packages])).toEqual([
      ["each", 5, 2, 5, 2],
      ["gram", 0.6, expect.closeTo(0.3), 0.6, 2],
    ]);
  });
});

describe("latestSummary", () => {
  const summary = (pricingUnit: string, iso: string) =>
    summarizeByUnit([{ ...price("P", iso, 1), pricingUnit }]).get("P")![0];

  it("is the summary priced most recently", () => {
    const newer = summary("gram", "2025-03-01");
    expect(latestSummary([summary("each", "2025-01-01"), newer])).toBe(newer);
  });

  it("is undefined without summaries", () => {
    expect(latestSummary<UnitPriceSummary>([])).toBeUndefined();
  });
});

describe("compareUnitPrices", () => {
  const each = (price: number) => ({ pricingUnit: "each", price });
  const ml = (price: number) => ({ pricingUnit: "milliliter", price });
  const sort = (prices: Array<{ pricingUnit: string, price: number } | undefined>, direction: "asc" | "desc") =>
    [...prices].sort((a, b) => compareUnitPrices(a, b, direction));

  it("sorts each before mL regardless of price, then by price", () => {
    expect(sort([ml(0.1), each(5), each(0.4)], "asc")).toEqual([each(0.4), each(5), ml(0.1)]);
  });

  it("reverses units and prices descending", () => {
    expect(sort([each(0.4), ml(0.1), each(5)], "desc")).toEqual([ml(0.1), each(5), each(0.4)]);
  });

  it("puts missing prices last in both directions", () => {
    expect(sort([undefined, each(2), undefined, each(1)], "asc")).toEqual([each(1), each(2), undefined, undefined]);
    expect(sort([undefined, each(1), undefined, each(2)], "desc")).toEqual([each(2), each(1), undefined, undefined]);
  });
});
