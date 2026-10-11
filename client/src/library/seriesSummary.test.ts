import { describe, expect, it } from "vitest";
import { summarizeSeries } from "./seriesSummary";
import type { ChartPrice } from "./types";

const price = (ndc: string, iso: string, nadacPerUnit: number): ChartPrice =>
  ({ ndc, ndcDescription: `Drug ${ndc}`, pricingUnit: "each", nadacPerUnit, asOfDate: new Date(iso) });

describe("summarizeSeries", () => {
  it("summarizes a product from its per-date package averages, not raw rows", () => {
    const prices = [
      // Two packages on the first two dates, one on the last.
      price("P", "2025-01-01", 10), price("P", "2025-01-01", 20),
      price("P", "2025-02-01", 12), price("P", "2025-02-01", 22),
      price("P", "2025-03-01", 30),
    ];
    const [summary] = summarizeSeries(prices);
    expect(summary).toMatchObject({ ndc: "P", latest: 30, latestDate: Date.parse("2025-03-01"), min: 15, max: 30, packages: 2 });
    // (15 + 17 + 30) / 3: each date counts once.
    expect(summary.average).toBeCloseTo(62 / 3);
  });

  it("gives one summary per series", () => {
    const summaries = summarizeSeries([price("A", "2025-01-01", 1), price("B", "2025-01-01", 2)]);
    expect(summaries.map(s => [s.ndc, s.latest, s.packages])).toEqual([["A", 1, 1], ["B", 2, 1]]);
  });
});
