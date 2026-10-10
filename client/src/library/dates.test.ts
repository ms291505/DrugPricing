import { describe, expect, it } from "vitest";
import {
  chartDatesSubtitle, clipToWindow, formatDate, formatWindow, fromDateInput, FULL_WINDOW, toDateInput, windowAround,
  windowEndingAt,
} from "./dates";
import type { ChartPrice } from "./types";

const day = (iso: string) => Date.parse(iso);
const price = (iso: string): ChartPrice =>
  ({ ndc: "1", ndcDescription: "X", pricingUnit: "each", nadacPerUnit: 1, asOfDate: new Date(iso) });

describe("clipToWindow", () => {
  const prices = ["2025-01-01", "2025-02-01", "2025-03-01"].map(price);

  it("keeps everything for the full window", () => {
    expect(clipToWindow(prices, FULL_WINDOW)).toBe(prices);
  });

  it("includes both ends", () => {
    const clipped = clipToWindow(prices, { start: day("2025-02-01"), end: day("2025-03-01") });
    expect(clipped.map(p => toDateInput(p.asOfDate.getTime()))).toEqual(["2025-02-01", "2025-03-01"]);
  });

  it("treats a null end as open", () => {
    expect(clipToWindow(prices, { start: day("2025-01-15"), end: null })).toHaveLength(2);
    expect(clipToWindow(prices, { start: null, end: day("2025-01-15") })).toHaveLength(1);
  });
});

describe("date inputs", () => {
  it("round-trips a calendar day", () => {
    expect(toDateInput(fromDateInput("2026-01-13"))).toBe("2026-01-13");
  });

  it("reads blank or invalid input as an open end", () => {
    expect(fromDateInput("")).toBeNull();
    expect(fromDateInput("not a date")).toBeNull();
    expect(toDateInput(null)).toBe("");
  });
});

describe("formatting", () => {
  it("shows the API's calendar day, not the local day before", () => {
    // "2025-12-31" parses as UTC midnight, which is Dec 30 in Chicago.
    expect(formatDate(day("2025-12-31"))).toContain("31");
  });

  it("fills open ends from the data", () => {
    const bounds = { first: day("2022-01-05"), last: day("2026-10-07") };
    expect(formatWindow({ start: day("2025-01-01"), end: null }, bounds))
      .toBe(`${formatDate(day("2025-01-01"))} – ${formatDate(bounds.last)}`);
    expect(formatWindow(FULL_WINDOW, null)).toBeNull();
  });

  it("subtitles only windows that cut something off", () => {
    expect(chartDatesSubtitle(FULL_WINDOW)).toBeUndefined();
    expect(chartDatesSubtitle({ start: day("2025-01-01"), end: null })).toMatch(/onward$/);
    expect(chartDatesSubtitle({ start: null, end: day("2025-01-01") })).toMatch(/^Through /);
  });
});

describe("window builders", () => {
  it("puts whole months either side of a change", () => {
    const w = windowAround(day("2026-01-06"), day("2026-01-13"), 3);
    expect(toDateInput(w.start)).toBe("2025-10-06");
    expect(toDateInput(w.end)).toBe("2026-04-13");
  });

  it("counts back from the last date", () => {
    const w = windowEndingAt(day("2026-10-07"), 12);
    expect(toDateInput(w.start)).toBe("2025-10-07");
    expect(toDateInput(w.end)).toBe("2026-10-07");
  });
});
