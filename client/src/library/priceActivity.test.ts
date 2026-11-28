import { describe, expect, it } from "vitest";
import { ACTIVITY_CATEGORIES, activityCategoryLabel, activityCounts, activitySparklinePath, priceEventGroupLabel, comparePriceActivity, derivePriceEvents, eventKey, eventLabel, groupPriceEvents, packageActivity, parseScanThreshold, previousObservationNote, productActivity, signedChange } from "./priceActivity";
import { lineChangeCallouts } from "./lineChanges";
import { createChartItems, fromChartSeries } from "./explorerItems";
import { clipToWindow, FULL_WINDOW } from "./dates";
import type { ChartPrice } from "./types";
import type { PriceActivity } from "./priceActivity";

const series = (values: number[], ndc = "A", pricingUnit = "each", start = Date.parse("2026-01-07")): ChartPrice[] =>
  values.map((nadacPerUnit, i) => ({ ndc, pricingUnit, nadacPerUnit, asOfDate: new Date(start + i * 7 * 86400000), ndcDescription: ndc }));
const pkg = (values: number[], ndc = "A") => ({ packageNdc: ndc, prices: series(values, ndc) });

describe("price activity", () => {
  it("keeps each package event identifiable across lists", () => {
    const prices = [...series([0, 1]), ...series([10, 11], "B")];
    const [group] = groupPriceEvents(derivePriceEvents(prices, "package"));
    const [sameGroup] = groupPriceEvents(derivePriceEvents(prices, "package", 20));
    expect(group.events).toHaveLength(2);
    expect(sameGroup.events).toHaveLength(1);
    expect(eventKey(group, group.events[0])).toBe(eventKey(sameGroup, sameGroup.events[0]));
    expect(eventKey(group, group.events[0])).not.toBe(eventKey(group, group.events[1]));
    expect(packageActivity(series([0, 1])).label).toContain("from $0");
  });

  it("classifies the cutoff rounded to 0.1%, including floating-point 5% rises", () => {
    expect(packageActivity(series([0.2, 0.21])).state).toBe("changed");
    expect(packageActivity(series([1, 1.0494]))).toMatchObject({ state: "stable", label: "Stable · within 5%" });
    expect(packageActivity(series([1, 1.0496])).state).toBe("changed");
    expect(packageActivity(series([1, 1]))).toMatchObject({ state: "stable", label: "Stable · no change" });
  });
  it("ranks a drop and recovery by dollars, choosing the earlier tied change", () => {
    const activity = packageActivity(series([8, 6, 8]));
    expect(activity.state).toBe("significant");
    expect(activity.label).toContain("Dropped 25% ($2.00) on Jan 14, 2026 · 1 more");
  });
  it("recognizes drift and an excursion returning near its start", () => {
    expect(packageActivity(series([10, 10.4, 10.8, 11.2, 11.4])).label).toBe("Up 14% ($1.40) over 4 weeks");
    expect(packageActivity(series([10, 9.6, 9.2, 9.6, 10])).label).toBe("Dipped 8% ($0.80) in January 2026");
    expect(packageActivity(series([10, 10.4, 10.8, 10.4, 10])).label).toBe("Spiked 8% ($0.80) in January 2026");
  });
  it("keeps sub-cent significant changes and distinguishes missing history", () => {
    expect(packageActivity(series([0.004, 0.002]))).toMatchObject({ state: "significant", magnitude: 0.002 });
    expect(packageActivity(series([1]))).toMatchObject({ state: "insufficient", label: "1 observation · Jan 7, 2026" });
    expect(packageActivity([]).label).toBe("No price history");
  });
  it("names gaps and never compares two pricing units", () => {
    const prices = series([10, 5]); prices[1].asOfDate = new Date("2026-03-04");
    expect(packageActivity(prices).label).toContain("between Jan 7, 2026 and Mar 4, 2026");
    expect(packageActivity([...series([10, 10]), ...series([100, 100], "A", "gram")]).state).toBe("mixed");
    expect(derivePriceEvents([...series([10, 10]), ...series([100, 100], "A", "gram")], "package")).toEqual([]);
  });
  it("classifies products from packages and excludes single observations from stability", () => {
    expect(productActivity([pkg([8, 6]), pkg([8, 8], "B"), pkg([99], "C")])).toMatchObject({ state: "significant", points: [] });
    expect(productActivity([pkg([8, 8]), pkg([99], "C")])).toMatchObject({ state: "stable", label: "1 of 2 packages stable" });
    expect(productActivity([pkg([99]), pkg([1], "B")]).state).toBe("insufficient");
    expect(productActivity([pkg([8, 8]), { packageNdc: "B", prices: series([10, 10], "B", "gram") }]).state).toBe("mixed");
  });
  it("sorts significant, other changed, stable, then insufficient, largest first", () => {
    const activities = [[1], [10, 10], [10, 10.7], [8, 6], [80, 60]].map(values => packageActivity(series(values)));
    expect(activities.sort(comparePriceActivity).map(a => [a.state, a.magnitude])).toEqual([
      ["significant", 20], ["significant", 2], ["changed", expect.any(Number)], ["stable", 0], ["insufficient", 0],
    ]);
  });
});

describe("event groups and callouts", () => {
  it("groups a date, unit and direction while preserving different exact prices", () => {
    const prices = [...series([10, 5]), ...series([20, 11], "B"), ...series([1, 2], "C"), ...series([3, 1], "D", "gram")];
    const groups = groupPriceEvents(derivePriceEvents(prices, "package"));
    expect(groups).toHaveLength(3);
    const drop = groups.find(g => g.pricingUnit === "each" && g.direction === "drop")!;
    expect(drop.events.map(e => [e.packageNdc, e.change.oldPrice, e.change.newPrice])).toEqual([["A", 10, 5], ["B", 20, 11]]);
  });
  it("gives each package's change as signed percent and amount", () => {
    const [drop] = derivePriceEvents(series([9.69, 5.52]), "package");
    expect(signedChange(drop.change)).toEqual({ percent: "−43%", amount: "−$4.17" });
    const [rise] = derivePriceEvents(series([0.2, 0.225]), "package");
    expect(signedChange(rise.change)).toEqual({ percent: "+12.5%", amount: "+$0.025" });
  });
  it("notes a package's previous observation only when the group label can't give it for all", () => {
    const gap = series([10, 5]); gap[0].asOfDate = new Date("2025-12-03"); gap[1].asOfDate = new Date("2026-01-14");
    const weekly = series([10, 5], "B", "each", Date.parse("2026-01-07"));
    const [mixed] = groupPriceEvents(derivePriceEvents([...gap, ...weekly], "package"));
    expect(mixed.events).toHaveLength(2);
    expect(mixed.events.map(e => previousObservationNote(e, mixed))).toEqual(["Previous price Dec 3, 2025", null]);
    const [alone] = groupPriceEvents(derivePriceEvents(gap, "package"));
    expect(previousObservationNote(alone.events[0], alone)).toBeNull();
  });
  it("limits events to the dates actually shown", () => {
    const shown = clipToWindow(series([8, 6, 6]), { start: Date.parse("2026-01-14"), end: null });
    expect(derivePriceEvents(shown, "package")).toEqual([]);
  });
  it("makes one label per date and retains all exact series spans", () => {
    expect(lineChangeCallouts([...series([8, 6]), ...series([8, 6], "B")], "package")[0])
      .toHaveProperty("label", "$8.00 → $6.00");
    const [callout] = lineChangeCallouts([...series([8, 6]), ...series([10, 5], "B")], "package");
    expect(callout.label).toBe("2 changes"); expect(callout.spans).toHaveLength(2);
  });
  it("does not manufacture product events when packages join or leave", () => {
    const prices = [...series([10, 10]).map(p => ({ ...p, packageNdc: "P1" })),
      ...series([100]).map(p => ({ ...p, packageNdc: "P2" }))];
    expect(lineChangeCallouts(prices, "product")).toEqual([]);
    expect(lineChangeCallouts(series([10, 100]), "product")).toEqual([]);
  });
  it("marks a real package event on the product average without claiming that average changed", () => {
    const prices = [...series([10, 5]).map(p => ({ ...p, packageNdc: "P1" })),
      ...series([10, 10]).map(p => ({ ...p, packageNdc: "P2" }))];
    const [callout] = lineChangeCallouts(prices, "product");
    expect(callout).toMatchObject({ label: "1 of 2 packages changed", spans: [], markers: [{ ndc: "A", price: 7.5 }] });
    const [item] = createChartItems({ chartType: "line", prices,
      origin: { searchLabel: "test", seriesKind: "product", resultPrices: prices }, dateWindow: FULL_WINDOW }, () => "Test");
    expect(lineChangeCallouts(fromChartSeries(item.series), "product")).toEqual([callout]);
  });
  it("formats a gap as a span in both event labels and callouts", () => {
    const prices = series([10, 5]); prices[1].asOfDate = new Date("2026-03-04");
    expect(lineChangeCallouts(prices, "package")[0].label).toContain("Jan 7, 2026–Mar 4, 2026");
    expect(eventLabel(derivePriceEvents(prices, "package")[0].change)).toContain("between");
  });
});

describe("activity sparkline", () => {
  it("uses proportional dates and a bounded scale for small changes", () => {
    const path = activitySparklinePath([{ asOfDate: 0, price: 10 }, { asOfDate: 1, price: 10.05 }, { asOfDate: 4, price: 10 }]);
    expect(path).toContain("H15 V");
    expect(path).toContain("H54 V");
    const ys = [...path.matchAll(/(?:M[^ ]+ |V)([-.\d]+)/g)].map(match => Number(match[1]));
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(0.4);
    expect(activitySparklinePath([{ asOfDate: 0, price: 10 }])).toBe("");
  });
  it("names gaps in grouped summaries as well as individual details", () => {
    const prices = series([10, 5]); prices[1].asOfDate = new Date("2026-03-04");
    const [group] = groupPriceEvents(derivePriceEvents(prices, "package"));
    expect(priceEventGroupLabel(group)).toContain("between Jan 7, 2026 and Mar 4, 2026");
  });
});

describe("scan thresholds", () => {
  it("passes the threshold through to the events", () => {
    expect(derivePriceEvents(series([10, 10.6]), "package")).toEqual([]);
    expect(derivePriceEvents(series([10, 10.6]), "package", 5)).toHaveLength(1);
    expect(derivePriceEvents(series([1, 0.9]), "package", 10)).toHaveLength(1);
  });
  it("labels a change from $0 without a percent", () => {
    const events = derivePriceEvents(series([0, 1]), "package", 500);
    expect(events).toHaveLength(1);
    const [group] = groupPriceEvents(events);
    expect(group.direction).toBe("rise");
    const labels = [eventLabel(events[0].change), priceEventGroupLabel(group), ...Object.values(signedChange(events[0].change))];
    expect(labels).toEqual(["Rose from $0 to $1.00 on Jan 14, 2026", "1 package rose from $0 on Jan 14, 2026 · per each", "from $0", "+$1.00"]);
    for (const label of labels) expect(label).not.toMatch(/Infinity|NaN|%/);
  });
  it("leaves changes from $0 out of a group's percent range", () => {
    const [group] = groupPriceEvents(derivePriceEvents([...series([0, 1]), ...series([10, 12], "B")], "package"));
    expect(group.events).toHaveLength(2);
    expect(priceEventGroupLabel(group)).toBe("2 packages rose about 20% on Jan 14, 2026 · per each");
  });
  it("accepts a percent of at least 5 with at most one decimal", () => {
    expect(["5", "7.5", "150", " 10 "].map(parseScanThreshold)).toEqual([{ percent: 5 }, { percent: 7.5 }, { percent: 150 }, { percent: 10 }]);
    for (const text of ["", "abc", "0", "-5", "4.9", "7.55", "Infinity", "1".repeat(400), "1e2", "7."])
      expect(parseScanThreshold(text)).toEqual({ error: "Enter a percent of 5 or more, with at most one decimal." });
  });
});

describe("activityCounts", () => {
  const activities = (...states: PriceActivity["state"][]) => states.map(state => ({ state }) as PriceActivity);

  it("lists only the states that have rows, naming what changed", () => {
    expect(activityCounts(activities("significant", "significant", "significant", "stable")))
      .toBe("3 with significant price changes, 1 with stable prices");
    expect(activityCounts(activities("mixed", "changed", "insufficient")))
      .toBe("1 with other price changes, 1 with insufficient price history, 1 with mixed pricing units");
    expect(activityCounts([])).toBe("");
  });
});

describe("activity categories", () => {
  const category = (values: number[]) => packageActivity(series(values)).category;
  // Each category is the word the row's label starts with.
  it.each([
    { values: [8, 6], label: "Dropped", expected: "dropped" },
    { values: [10, 9.6, 9.2, 8.8], label: "Down", expected: "dropped" },
    { values: [6, 8], label: "Rose", expected: "rose" },
    { values: [10, 10.4, 10.8, 11.2, 11.4], label: "Up", expected: "rose" },
    { values: [10, 9.6, 9.2, 9.6, 10], label: "Dipped", expected: "dippedOrSpiked" },
    { values: [10, 10.4, 10.8, 10.4, 10], label: "Spiked", expected: "dippedOrSpiked" },
    { values: [10, 10.2], label: "Stable", expected: "stable" },
    { values: [10], label: "1 observation", expected: "insufficient" },
  ])("puts a row labeled $label in $expected", ({ values, label, expected }) => {
    const activity = packageActivity(series(values));
    expect(activity.label.startsWith(label)).toBe(true);
    expect(activity.category).toBe(expected);
  });
  it("goes by the largest change, as the label does", () => {
    const activity = packageActivity(series([8, 6, 10]));
    expect(activity.label).toMatch(/^Rose/);
    expect(activity.category).toBe("rose");
  });
  it("counts a change from $0 as a rise", () => {
    expect(category([0, 1])).toBe("rose");
  });
  it("has none for mixed units or no price history", () => {
    expect(packageActivity([]).category).toBeNull();
    expect(packageActivity([...series([10, 10]), ...series([100, 100], "A", "gram")]).category).toBeNull();
    expect(productActivity([pkg([8, 8]), { packageNdc: "B", prices: series([10, 10], "B", "gram") }]).category).toBeNull();
  });
  it("labels categories in the filter's order", () => {
    expect(ACTIVITY_CATEGORIES.map(c => c.label)).toEqual(["Dropped", "Rose", "Dipped or spiked", "Stable", "Insufficient history"]);
    expect(activityCategoryLabel("dippedOrSpiked")).toBe("Dipped or spiked");
  });
});
