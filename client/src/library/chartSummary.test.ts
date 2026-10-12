import { describe, expect, it } from "vitest";
import { barChartSummary, largestChange, lineChartSummary } from "./chartSummary";
import type { ChartPrice } from "./types";

const price = (ndc: string, iso: string, nadacPerUnit: number): ChartPrice =>
  ({ ndc, ndcDescription: `Drug ${ndc}`, pricingUnit: "each", nadacPerUnit, asOfDate: new Date(iso) });

const HINT = "Use the left and right arrow keys to move through dates.";

describe("lineChartSummary", () => {
  it("gives the count, dates, latest prices and largest change", () => {
    const prices = [
      price("A", "2025-01-01", 10), price("A", "2025-02-01", 10), price("A", "2025-03-01", 11),
      price("B", "2025-01-01", 4), price("B", "2025-02-01", 2), price("B", "2025-03-01", 2),
    ];
    expect(lineChartSummary(prices)).toBe(
      "2 series, Jan 1, 2025 to Mar 1, 2025. "
      + "Highest latest price: A at $11.00; lowest: B at $2.00. "
      + "Largest change: down 50.0% for B on Feb 1, 2025. "
      + HINT);
  });

  it("says when a series stopped before the chart's last date", () => {
    const prices = [price("A", "2025-01-01", 10), price("B", "2025-01-01", 4), price("B", "2025-03-01", 4)];
    expect(lineChartSummary(prices)).toContain("Highest latest price: A at $10.00 (last priced Jan 1, 2025); lowest: B at $4.00.");
  });

  it("states a single series' latest price and leaves out an unchanged price", () => {
    const prices = [price("A", "2025-01-01", 0.5), price("A", "2025-02-01", 0.5)];
    expect(lineChartSummary(prices)).toBe(`1 series, Jan 1, 2025 to Feb 1, 2025. Latest price: $0.50 on Feb 1, 2025. ${HINT}`);
  });

  it("formats dates in UTC", () => {
    // TZ is America/Chicago in tests, where local formatting would say Dec 31.
    expect(lineChartSummary([price("A", "2025-01-01", 1)])).toContain("Jan 1, 2025");
  });

  it("leads a price-change card with the change", () => {
    const prices = [price("A", "2026-01-07", 9.69), price("A", "2026-01-14", 5.52)];
    const span = { start: Date.parse("2026-01-07"), end: Date.parse("2026-01-14"), label: "-43.0%", from: 9.69, to: 5.52 };
    expect(lineChartSummary(prices, span)).toBe(
      "Price dropped 43.0% from $9.69 to $5.52 on Jan 14, 2026. "
      + "1 series, Jan 7, 2026 to Jan 14, 2026. Latest price: $5.52 on Jan 14, 2026. " + HINT);
  });

  it("falls back to the label for spans pinned without prices", () => {
    const prices = [price("A", "2026-01-07", 9.69), price("A", "2026-01-14", 5.52)];
    const span = { start: Date.parse("2026-01-07"), end: Date.parse("2026-01-14"), label: "-43.0%" };
    expect(lineChartSummary(prices, span)).toMatch(/^Price changed -43.0% on Jan 14, 2026\. /);
  });
});

describe("largestChange", () => {
  it("uses a product's averaged line, not one of its packages", () => {
    // One package halves; the other holds, so the average drops 25%.
    const prices = [
      price("P", "2025-01-01", 10), price("P", "2025-01-01", 10),
      price("P", "2025-02-01", 5), price("P", "2025-02-01", 10),
    ];
    expect(largestChange(prices)).toEqual({ ndc: "P", ratio: -0.25, date: Date.parse("2025-02-01"), ndcs: ["P"] });
  });

  it("compares consecutive priced dates, skipping gaps, and takes the earliest on a tie", () => {
    const prices = [
      price("A", "2025-01-01", 10), price("B", "2025-02-01", 1), price("A", "2025-03-01", 20),
      price("A", "2025-04-01", 40),
    ];
    expect(largestChange(prices)).toMatchObject({ ndc: "A", ratio: 1, date: Date.parse("2025-03-01") });
  });

  it("names every series that made the same change on that date", () => {
    const prices = [
      price("A", "2026-01-07", 9.69), price("A", "2026-01-14", 5.52),
      price("B", "2026-01-07", 9.70), price("B", "2026-01-14", 5.53),
      price("C", "2026-01-07", 9.70), price("C", "2026-01-14", 9.70),
    ];
    // A: -43.03%, B: -42.99%; both print as 43.0%.
    expect(largestChange(prices)?.ndcs).toEqual(["A", "B"]);
    expect(lineChartSummary(prices)).toContain("Largest change: down 43.0% for A and 1 other on Jan 14, 2026.");
    expect(lineChartSummary(prices.filter(p => p.ndc !== "C"))).toContain("down 43.0% for both series");
  });

  it("is null when nothing changed", () => {
    expect(largestChange([price("A", "2025-01-01", 3), price("A", "2025-02-01", 3)])).toBeNull();
  });
});

describe("barChartSummary", () => {
  const prices = [
    price("A", "2025-01-01", 10), price("A", "2025-02-01", 12),
    price("B", "2025-01-01", 4), price("B", "2025-02-01", 2),
  ];

  it("gives the basis, the highest and lowest rows, and the range", () => {
    expect(barChartSummary(prices, "latest")).toBe(
      "Rows show each series' latest price, highest first. 2 series, Jan 1, 2025 to Feb 1, 2025. "
      + "Highest: A at $12.00; lowest: B at $2.00. Range over these dates: $2.00 to $12.00. "
      + "Use the left arrow key to move down the rows and the right arrow key to move up.");
  });

  it("follows the bar value", () => {
    expect(barChartSummary(prices, "average")).toContain("Highest: A at $11.00; lowest: B at $3.00.");
  });
});
