import { describe, expect, it } from "vitest";
import {
  canDrillDownToPackages, chartDataBounds, createChartItem, createChartItems, createPriceChangeListItem, fitsPinLimit,
  formatItemSource, isScaleMatched, matchedPriceRange, packageLevelView, priceChangeListGroups, samePriceRanges,
  withLoadedDates, type ChartItem, type ChartOrigin, type ExplorerItem,
} from "./explorerItems";
import { chartTitle, seriesLabels } from "./chartTitles";
import { FULL_WINDOW } from "./dates";
import { derivePriceEvents, groupPriceEvents } from "./priceActivity";
import { PRICE_CHANGE_LIST_PIN_LIMIT } from "./constants";
import type { ChartPrice } from "./types";

const DATES = ["2025-01-01", "2025-02-01", "2025-03-01", "2025-04-01"];
const day = (iso: string) => Date.parse(iso);

/** One price per date for a series. Product-level series repeat an NDC once per package. */
const series = (ndc: string, nadacPerUnit: number, unit = "each"): ChartPrice[] =>
  DATES.map(iso => ({ ndc, ndcDescription: `Drug ${ndc}`, pricingUnit: unit, nadacPerUnit, asOfDate: new Date(iso) }));
const price = (ndc: string, nadacPerUnit: number, pricingUnit = "each", iso = "2025-01-01"): ChartPrice =>
  ({ ndc, ndcDescription: `Drug ${ndc}`, pricingUnit, nadacPerUnit, asOfDate: new Date(iso) });

// Product A has two packages (both priced under product NDC "A"); product B has one.
const packageA1 = series("A", 10);
const packageA2 = series("A", 12);
const productB = series("B", 5);
const result = [...packageA1, ...packageA2, ...productB];
const origin: ChartOrigin = { searchLabel: "humira", seriesKind: "product", resultPrices: result };

const make = (prices: ChartPrice[], dateWindow = FULL_WINDOW) =>
  createChartItem({ chartType: "line", prices, defaultTitle: "Test", origin, dateWindow });

describe("createChartItem provenance", () => {
  it("captures the explicit source system when the search origin supplies it", () => {
    const fromFda = createChartItem({ chartType: "line", prices: productB, defaultTitle: "Test",
      origin: { ...origin, searchSource: "fda" }, dateWindow: FULL_WINDOW });
    expect(fromFda.source.searchSource).toBe("fda");
    expect(make(productB).source.searchSource).toBeUndefined();
  });

  it("is not filtered when the chart has every price of its series", () => {
    const item = make([...packageA1, ...packageA2]);
    expect(item.source).toMatchObject({ seriesCount: 1, resultSeriesCount: 2, filtered: false });
    expect(formatItemSource(item.source)).toBe("Products · 1 of 2 · from \u201chumira\u201d");
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

  it("keeps a change's date on line charts only, and only when given", () => {
    expect("eventDate" in make(productB)).toBe(false);
    const options = { prices: productB, defaultTitle: "T", origin, dateWindow: FULL_WINDOW, eventDate: day("2025-03-01") };
    expect(createChartItem({ ...options, chartType: "line" }).eventDate).toBe(day("2025-03-01"));
    expect("eventDate" in createChartItem({ ...options, chartType: "bar" })).toBe(false);
  });
});

describe("withLoadedDates", () => {
  const shown = (prices: ChartPrice[]) => prices.filter(price => price.asOfDate.getTime() >= day("2025-03-01"));

  it("takes every loaded date of the chart's series, and no other series", () => {
    const loaded = [...packageA1, ...productB, ...series("B", 5, "mL")];
    expect(withLoadedDates(shown(productB), loaded)).toEqual(productB);
    expect(withLoadedDates(shown([...packageA1, ...productB]), loaded)).toEqual([...packageA1, ...productB]);
  });

  it("makes a chart of a narrowed search unfiltered, as one made after a fetch would be", () => {
    const narrowed = make(shown(productB), { start: day("2025-03-01"), end: null });
    expect(narrowed.source.filtered).toBe(true);
    const item = make(withLoadedDates(shown(productB), result), { start: day("2025-03-01"), end: null });
    expect(item.source.filtered).toBe(false);
    expect(item.series[0].points).toHaveLength(DATES.length);
  });
});

describe("matchedPriceRange", () => {
  const matched = (item: ChartItem): ChartItem => ({ ...item, matchScale: true });
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

  it("matches only line charts the user matched (isScaleMatched)", () => {
    expect([lineA, bar, make(packageA1)].map(isScaleMatched)).toEqual([true, false, false]);
  });

  it("ignores prices outside each chart's window", () => {
    const spike = matched(make([...productB, { ...productB[0], nadacPerUnit: 99 }], { start: day("2025-02-01"), end: null }));
    expect(matchedPriceRange([spike]).get("each")).toEqual([5, 5]);
  });
});

describe("samePriceRanges", () => {
  const ranges = (...entries: [string, [number, number]][]) => new Map(entries);

  it("is true for equal ranges in new maps, in any order", () => {
    expect(samePriceRanges(ranges(["each", [1, 2]], ["milliliter", [3, 4]]), ranges(["milliliter", [3, 4]], ["each", [1, 2]]))).toBe(true);
    expect(samePriceRanges(ranges(), ranges())).toBe(true);
  });

  it("is false when a unit or a bound differs", () => {
    expect(samePriceRanges(ranges(["each", [1, 2]]), ranges(["each", [1, 3]]))).toBe(false);
    expect(samePriceRanges(ranges(["each", [1, 2]]), ranges(["gram", [1, 2]]))).toBe(false);
    expect(samePriceRanges(ranges(["each", [1, 2]]), ranges(["each", [1, 2]], ["gram", [1, 2]]))).toBe(false);
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

describe("createChartItems", () => {
  it("splits units without losing colors, history, dates or provenance", () => {
    const mixed = [...packageA1, ...series("A", 20, "milliliter"), ...productB];
    const items = createChartItems({ chartType: "line", prices: mixed, defaultTitle: "Compare",
      origin: { ...origin, resultPrices: [...mixed, ...series("C", 8)] }, dateWindow: FULL_WINDOW,
      colors: new Map([["A", "series-a"], ["B", "series-b"]]) });
    expect(items).toHaveLength(2);
    expect(items.map(item => new Set(item.series.map(s => s.unit)).size)).toEqual([1, 1]);
    expect(items.map(item => item.defaultTitle)).toEqual(["Compare · per each", "Compare · per mL"]);
    expect(items.map(item => item.source)).toEqual([
      { searchLabel: "humira", seriesKind: "product",
        seriesCount: 2, resultSeriesCount: 3, filtered: false },
      { searchLabel: "humira", seriesKind: "product", seriesCount: 1, resultSeriesCount: 3, filtered: false },
    ]);
    expect(items[1].series[0]).toMatchObject({ color: "series-a", points: series("A", 20, "milliliter").map(p => [p.asOfDate.getTime(), p.nadacPerUnit]) });
    expect(items[0].dateWindow).toEqual(FULL_WINDOW);
    expect(items[0].id).not.toBe(items[1].id);
  });

  it("keeps a single-unit title and identifies genuinely filtered packages", () => {
    const [item] = createChartItems({ chartType: "bar", prices: packageA1, defaultTitle: "Compare",
      origin, dateWindow: FULL_WINDOW, barValue: "average" });
    expect(item.defaultTitle).toBe("Compare");
    expect(item.source.filtered).toBe(true);
    expect(item.barValue).toBe("average");
  });
  it("generates titles from each unit's series rather than the whole selection", () => {
    const items = createChartItems({ chartType: "line", prices: [...productB, ...packageA1, ...series("C", 20, "milliliter"), ...series("D", 10, "milliliter"), ...series("E", 5, "milliliter")],
      defaultTitle: "5 products", origin, dateWindow: FULL_WINDOW },
    prices => chartTitle("line", "test", "product", seriesLabels(prices)));
    expect(items.map(item => item.defaultTitle)).toEqual(["Test: 2 products over time · per each", "Test: 3 products over time · per mL"]);
  });

  it("does not create empty cards", () => {
    expect(createChartItems({ chartType: "line", prices: [], defaultTitle: "Compare", origin, dateWindow: FULL_WINDOW })).toEqual([]);
  });
});

describe("pinned product package drilldown", () => {
  it("splits stored product points by package and unit, preserving prices and dates", () => {
    const original = createChartItem({ chartType: "line", defaultTitle: "Products", prices: [
      { ...price("P1", 10, "each", "2025-01-01"), packageNdc: "PKG-A" },
      { ...price("P1", 12, "each", "2025-01-01"), packageNdc: "PKG-B" },
      { ...price("P1", 20, "gram", "2025-01-08"), packageNdc: "PKG-A" },
      { ...price("P2", 30, "each", "2025-01-08"), packageNdc: "PKG-A" },
    ], origin, dateWindow: { start: day("2025-01-01"), end: day("2025-01-08") } });
    const view = packageLevelView(original)!;
    expect(view.source).toMatchObject({ searchLabel: "humira", seriesKind: "package", seriesCount: 2 });
    expect(view.dateWindow).toEqual(original.dateWindow);
    expect(view.series.map(({ ndc, unit, points }) => [ndc, unit, points])).toEqual([
      ["PKG-A", "each", [[day("2025-01-01"), 10], [day("2025-01-08"), 30]]],
      ["PKG-B", "each", [[day("2025-01-01"), 12]]],
      ["PKG-A", "gram", [[day("2025-01-08"), 20]]],
    ]);
    expect(original.series).toHaveLength(3);
    expect(original.source.seriesKind).toBe("product");
  });

  it("does not offer drilldown for legacy snapshots without complete package identities", () => {
    const legacy = createChartItem({ chartType: "line", defaultTitle: "Products", prices: [price("P1", 10)], origin, dateWindow: FULL_WINDOW });
    expect(canDrillDownToPackages(legacy)).toBe(false);
    expect(packageLevelView(legacy)).toBeNull();
    const incomplete = { ...legacy, series: [{ ...legacy.series[0], packageNdcs: ["PKG-A", "PKG-B"] }] };
    expect(canDrillDownToPackages(incomplete)).toBe(false);
    const partial = { ...legacy, series: [{ ...legacy.series[0], packageNdcs: [null] }] };
    expect(canDrillDownToPackages(partial)).toBe(false);
    expect(packageLevelView(partial)).toBeNull();
  });
});

describe("price change lists", () => {
  // Package prices over four weeks: A drops 20% then rises 25% (two groups); B only rises 10% in
  // grams; C never changes; D drops 6%.
  const week = (i: number) => new Date(Date.parse("2026-01-07") + i * 7 * 86400000);
  const pkg = (ndc: string, values: number[], pricingUnit = "each"): ChartPrice[] =>
    values.map((nadacPerUnit, i) => ({ ndc, ndcDescription: `Drug ${ndc}`, pricingUnit, nadacPerUnit, asOfDate: week(i) }));
  const prices = [...pkg("A", [10, 8, 8, 10]), ...pkg("B", [10, 10, 11, 11], "gram"), ...pkg("C", [5, 5, 5, 5]), ...pkg("D", [10, 9.4, 9.4, 9.4])];
  const listOrigin: ChartOrigin = { searchSource: "nadac", searchLabel: "metformin", seriesKind: "ndc", resultPrices: prices };
  const dateWindow = { start: week(0).getTime(), end: week(3).getTime() };
  const make = (thresholdPercent: number, shown = prices) => {
    const groups = groupPriceEvents(derivePriceEvents(shown, "package", thresholdPercent));
    const item = createPriceChangeListItem({ prices: shown, groups, thresholdPercent, defaultTitle: "List", origin: listOrigin, dateWindow });
    return { groups, item };
  };

  it("stores one history per listed package and unit, even when a package is in two groups", () => {
    const { groups, item } = make(10);
    expect(groups.filter(group => group.events.some(event => event.packageNdc === "A"))).toHaveLength(2);
    expect(item.histories.map(history => [history.ndc, history.unit, history.points.length])).toEqual([["A", "each", 4], ["B", "gram", 4]]);
    expect(item.source).toEqual({ searchSource: "nadac", searchLabel: "metformin", seriesKind: "ndc", seriesCount: 2, resultSeriesCount: 4, filtered: false });
  });

  it("derives the same groups from its stored histories as the live list it came from", () => {
    for (const threshold of [5, 10, 25]) {
      const { groups, item } = make(threshold);
      expect(priceChangeListGroups(item)).toEqual(groups);
    }
  });

  it("is filtered only when the page dropped some of a listed package's shown prices", () => {
    expect(make(10).item.source.filtered).toBe(false);
    expect(make(10, prices.filter(price => !(price.ndc === "A" && price.asOfDate.getTime() === week(1).getTime()))).item.source.filtered).toBe(true);
    // Dropping a package it doesn't list isn't a filter on the list.
    expect(make(10, prices.filter(price => price.ndc !== "C")).item.source.filtered).toBe(false);
  });

  it("is ignored by Match scale", () => {
    const { item } = make(10);
    expect(isScaleMatched(item)).toBe(false);
    expect(matchedPriceRange([item]).size).toBe(0);
  });

  it("fits the pin limit unless its JSON is too long", () => {
    const { item } = make(10);
    expect(fitsPinLimit(item)).toBe(true);
    const label = "x".repeat(PRICE_CHANGE_LIST_PIN_LIMIT);
    expect(fitsPinLimit({ ...item, histories: [{ ...item.histories[0], label }] })).toBe(false);
  });

  it("keeps a pinned item's source for a chart made from it, recounting only its series", () => {
    const source = { ...make(10).item.source, filtered: true };
    const chart = createChartItem({ chartType: "line", prices: pkg("A", [10, 8]), defaultTitle: "A", origin: { ...listOrigin, resultPrices: [] }, dateWindow, source });
    expect(chart.source).toEqual({ ...source, seriesCount: 1 });
  });
});

