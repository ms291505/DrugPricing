import { describe, expect, it } from "vitest";
import {
  chartDataBounds, createChartItem, formatItemSource, matchedPriceRange, type ChartOrigin, type ExplorerItem,
} from "./explorerItems";
import { FULL_WINDOW } from "./dates";
import type { ChartPrice } from "./types";

const DATES = ["2025-01-01", "2025-02-01", "2025-03-01", "2025-04-01"];
const day = (iso: string) => Date.parse(iso);

/** One price per date for a series. Product-level series repeat an NDC once per package. */
const series = (ndc: string, nadacPerUnit: number, unit = "each"): ChartPrice[] =>
  DATES.map(iso => ({ ndc, ndcDescription: `Drug ${ndc}`, pricingUnit: unit, nadacPerUnit, asOfDate: new Date(iso) }));

// Product A has two packages (both priced under product NDC "A"); product B has one.
const packageA1 = series("A", 10);
const packageA2 = series("A", 12);
const productB = series("B", 5);
const result = [...packageA1, ...packageA2, ...productB];
const origin: ChartOrigin = { searchLabel: "humira", seriesKind: "product", resultPrices: result };

const make = (prices: ChartPrice[], dateWindow = FULL_WINDOW) =>
  createChartItem({ chartType: "line", prices, defaultTitle: "Test", origin, dateWindow });

describe("createChartItem provenance", () => {
  it("is not filtered when the chart has every price of its series", () => {
    const item = make([...packageA1, ...packageA2]);
    expect(item.source).toMatchObject({ seriesCount: 1, resultSeriesCount: 2, filtered: false });
    expect(formatItemSource(item.source)).toBe("Products · 1 of 2 · from 'humira'");
  });

  it("is not filtered just because the window shows fewer dates", () => {
    const item = make(result, { start: day("2025-02-01"), end: day("2025-03-01") });
    expect(item.source.filtered).toBe(false);
    expect(item.dateWindow).toEqual({ start: day("2025-02-01"), end: day("2025-03-01") });
  });

  it("is filtered when a page filter dropped a package from a series, whatever the window", () => {
    const item = make([...packageA1, ...productB], { start: day("2025-02-01"), end: null });
    expect(item.source.filtered).toBe(true);
    expect(formatItemSource(item.source)).toMatch(/· filtered$/);
  });

  it("keeps every date in the snapshot so the window can widen later", () => {
    const item = make(productB, { start: day("2025-03-01"), end: null });
    expect(item.series[0].points).toHaveLength(DATES.length);
    expect(chartDataBounds(item)).toEqual({ first: day(DATES[0]), last: day(DATES[3]) });
  });

  it("stores a change span only when given", () => {
    expect("changeSpan" in make(productB)).toBe(false);
    const span = { start: day("2025-02-01"), end: day("2025-03-01"), label: "-43.0%" };
    const item = createChartItem({
      chartType: "line", prices: productB, defaultTitle: "T", origin, dateWindow: FULL_WINDOW, changeSpan: span,
    });
    expect(item.changeSpan).toEqual(span);
  });
});

describe("matchedPriceRange", () => {
  const matched = (item: ExplorerItem): ExplorerItem => ({ ...item, matchScale: true });
  const lineA = matched(make(packageA1));
  const lineB = matched(make(productB, { start: day("2025-03-01"), end: null }));
  const mL = matched(make(series("C", 300, "milliliter")));
  const bar: ExplorerItem = matched({ ...make(series("D", 1000)), chartType: "bar" });

  it("spans the visible prices of matched line charts per unit, ignoring bar charts", () => {
    const ranges = matchedPriceRange([lineA, lineB, mL, bar]);
    expect(ranges.get("each")).toEqual([5, 10]);
    expect(ranges.get("milliliter")).toEqual([300, 300]);
  });

  it("leaves out charts the user didn't match, however their prices compare", () => {
    const unmatched = make(series("E", 6745));
    expect(matchedPriceRange([lineA, lineB, unmatched]).get("each")).toEqual([5, 10]);
  });

  it("ignores prices outside each chart's window", () => {
    const spike = matched(make([...productB, { ...productB[0], nadacPerUnit: 99 }], { start: day("2025-02-01"), end: null }));
    expect(matchedPriceRange([spike]).get("each")).toEqual([5, 5]);
  });
});

describe("createChartItem colors and bar value", () => {
  it("keeps the page's color with each series it has one for", () => {
    const item = createChartItem({
      chartType: "line", prices: [...packageA1, ...productB], defaultTitle: "T", origin, dateWindow: FULL_WINDOW,
      colors: new Map([["A", "#56B4E9"]]),
    });
    expect(item.series.map(s => s.color)).toEqual(["#56B4E9", undefined]);
  });

  it("stores the bar value on bar charts only", () => {
    const bar = createChartItem({ chartType: "bar", prices: productB, defaultTitle: "T", origin, dateWindow: FULL_WINDOW, barValue: "average" });
    const line = createChartItem({ chartType: "line", prices: productB, defaultTitle: "T", origin, dateWindow: FULL_WINDOW, barValue: "average" });
    expect(bar.barValue).toBe("average");
    expect("barValue" in line).toBe(false);
  });
});
