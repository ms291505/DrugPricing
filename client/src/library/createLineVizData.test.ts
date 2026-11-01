import { describe, expect, it } from "vitest";
import { averagedLineCaption, createLineVizData, rangeKey, visibleBandNdcs } from "./createLineVizData";
import type { ChartPrice } from "./types";

const price = (ndc: string, iso: string, nadacPerUnit: number): ChartPrice =>
  ({ ndc, ndcDescription: `Drug ${ndc}`, pricingUnit: "each", nadacPerUnit, asOfDate: new Date(iso) });

describe("createLineVizData", () => {
  it("averages a product's packages per date and keeps their range", () => {
    const { rows, rangeNdcs, packageCounts } = createLineVizData([
      price("P", "2025-01-01", 10), price("P", "2025-01-01", 20), price("P", "2025-01-01", 30),
      price("P", "2025-02-01", 12),
    ]);
    expect(rows).toEqual([
      { asOfDate: Date.parse("2025-01-01"), P: 20, [rangeKey("P")]: [10, 30] },
      { asOfDate: Date.parse("2025-02-01"), P: 12 },
    ]);
    expect([...rangeNdcs]).toEqual(["P"]);
    // The most packages priced on one date.
    expect(packageCounts.get("P")).toBe(3);
  });

  it("draws no band for packages that cost the same at the precision shown", () => {
    const { rows, rangeNdcs, packageCounts } = createLineVizData([
      price("P", "2025-01-01", 5.5128), price("P", "2025-01-01", 5.5131),
      price("A", "2025-01-01", 1),
    ]);
    // The range is still kept for View data and the CSV.
    expect(rows[0][rangeKey("P")]).toEqual([5.5128, 5.5131]);
    expect(rangeNdcs.size).toBe(0);
    expect(packageCounts.get("P")).toBe(2);
    expect(packageCounts.get("A")).toBe(1);
  });

  it("keeps a series with a printable spread on any one date", () => {
    const { rangeNdcs } = createLineVizData([
      // Too small to print on the first date, a real spread on the second.
      price("P", "2025-01-01", 5.5128), price("P", "2025-01-01", 5.5131),
      price("P", "2025-02-01", 5), price("P", "2025-02-01", 6),
    ]);
    expect([...rangeNdcs]).toEqual(["P"]);
  });
});

describe("averagedLineCaption", () => {
  const counts = new Map([["P", 3], ["Q", 2]]);

  it("names the package count for a chart of one series", () => {
    expect(averagedLineCaption(["P"], 1, counts))
      .toBe("Line: average of 3 packages · shaded: their lowest to highest price on each date");
  });

  it("names the series that averages when the chart shows several", () => {
    expect(averagedLineCaption(["P"], 7, counts)).toMatch(/^P: average of 3 packages · /);
    expect(averagedLineCaption(["P", "Q"], 7, counts)).toMatch(/^Lines with shading: average of each product's packages · /);
  });

  it("says nothing without a band", () => {
    expect(averagedLineCaption([], 3, counts)).toBeNull();
  });
});

describe("visibleBandNdcs", () => {
  const { rows } = createLineVizData([
    // A $9 spread around $6,740, and a $1,000 spread around $3,000.
    price("A", "2025-01-01", 6736), price("A", "2025-01-01", 6745),
    price("B", "2025-01-01", 2500), price("B", "2025-01-01", 3500),
  ]);

  it("drops bands too thin to see on the axis", () => {
    expect(visibleBandNdcs(rows, ["A", "B"], [2000, 7000])).toEqual(["B"]);
  });

  it("keeps them on an axis fitted close enough", () => {
    expect(visibleBandNdcs(rows, ["A"], [6700, 6760])).toEqual(["A"]);
  });

  it("keeps a band visible on any one date", () => {
    const { rows } = createLineVizData([
      // A visible spread, a thin one, and a date with one package and no range.
      price("C", "2025-01-01", 2500), price("C", "2025-01-01", 3500),
      price("C", "2025-02-01", 3000), price("C", "2025-02-01", 3009),
      price("C", "2025-03-01", 3000),
    ]);
    expect(visibleBandNdcs(rows, ["C"], [2000, 7000])).toEqual(["C"]);
  });

  it("drops a series whose only dates without a range sit beside thin spreads", () => {
    const { rows } = createLineVizData([
      price("D", "2025-01-01", 3000), price("D", "2025-01-01", 3009),
      price("D", "2025-02-01", 3000),
    ]);
    expect(visibleBandNdcs(rows, ["D"], [2000, 7000])).toEqual([]);
  });
});
