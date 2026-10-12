import { describe, expect, it } from "vitest";
import { priceChangesInWindow } from "./flagNadacPriceChange";
import { FULL_WINDOW } from "./dates";
import type { FdaProductPriceChange } from "./types";

const day = (iso: string) => Date.parse(iso);
const change = (start: string, end: string): FdaProductPriceChange => ({
  productNdc: "0003-0893", packageNdc: "0003-0893-21", packageNdcStripped: "3089321",
  priceChange: { packageNdc: "0003-0893-21", startDate: new Date(start), endDate: new Date(end), oldPrice: 9.69, newPrice: 5.52, percentage: -0.43 },
});

describe("priceChangesInWindow", () => {
  const changes = [change("2026-01-07", "2026-01-14"), change("2024-01-03", "2024-01-10")];

  it("keeps every change for all dates", () => {
    expect(priceChangesInWindow(changes, FULL_WINDOW)).toEqual(changes);
  });

  it("keeps changes whose new price starts inside the dates, including on an edge", () => {
    expect(priceChangesInWindow(changes, { start: day("2026-01-14"), end: null })).toEqual([changes[0]]);
    expect(priceChangesInWindow(changes, { start: day("2026-04-07"), end: day("2026-10-07") })).toEqual([]);
  });
});
