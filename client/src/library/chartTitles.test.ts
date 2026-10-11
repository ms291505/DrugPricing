import { describe, expect, it } from "vitest";
import { chartSubtitle, chartTitle, priceChangeTitle, seriesLabels } from "./chartTitles";
import { FULL_WINDOW } from "./dates";
import type { ChartPrice } from "./types";

const price = (ndc: string, iso: string): ChartPrice =>
  ({ ndc, ndcDescription: `HUMIRA ${ndc}`, pricingUnit: "each", nadacPerUnit: 1, asOfDate: new Date(iso) });

describe("chart titles", () => {
  it("names the search and how many series", () => {
    expect(chartTitle("line", "humira", "product", ["a", "b"])).toBe("Humira: 2 products over time");
    expect(chartTitle("bar", "NDC 3089321", "ndc", ["a", "b", "c"])).toBe("NDC 3089321: 3 NDCs compared");
  });

  it("names a single series by its own label", () => {
    expect(chartTitle("line", "humira", "package", ["HUMIRA KIT 40 mg"])).toBe("HUMIRA KIT 40 mg over time");
  });

  it("puts the change, its date and the package in a price-change title", () => {
    expect(priceChangeTitle("-43.0%", Date.parse("2026-01-14"), "0003-0893-21")).toBe("-43.0% on Jan 14, 2026 · 0003-0893-21");
  });

  it("subtitles with the count and the dates shown", () => {
    const prices = [price("A", "2022-01-05"), price("B", "2026-10-07")];
    expect(seriesLabels(prices)).toEqual(["HUMIRA A", "HUMIRA B"]);
    expect(chartSubtitle(2, "product", FULL_WINDOW, prices)).toBe("2 products · Jan 5, 2022 – Oct 7, 2026");
    expect(chartSubtitle(2, "product", { start: Date.parse("2026-01-01"), end: null }, prices))
      .toBe("2 products · Jan 1, 2026 – Oct 7, 2026");
  });
});
