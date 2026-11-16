import { describe, expect, it } from "vitest";
import { applyColumnBounds, COLUMN_BOUNDS, resolveBounds } from "./columnBounds";

describe("resolveBounds", () => {
  const bounds = { min: 100, max: 300, medium: { max: 200 }, narrow: { min: 90, max: 150 } };

  it("uses the base pair when wide, and each tier's changes over it", () => {
    expect(resolveBounds(bounds, "wide")).toEqual({ min: 100, max: 300 });
    expect(resolveBounds(bounds, "medium")).toEqual({ min: 100, max: 200 });
    expect(resolveBounds(bounds, "narrow")).toEqual({ min: 90, max: 150 });
  });

  it("never lets the maximum fall below the minimum", () => {
    expect(resolveBounds({ min: 120, max: 100 }, "wide")).toEqual({ min: 120, max: 120 });
    expect(resolveBounds({ min: 120, max: 200, narrow: { max: 80 } }, "narrow")).toEqual({ min: 120, max: 120 });
  });

  it("is consistent for every column, and narrower tiers never grow past wide", () => {
    for (const bounds of Object.values(COLUMN_BOUNDS)) {
      const wide = resolveBounds(bounds, "wide");
      for (const tier of ["narrow", "medium"] as const) {
        const resolved = resolveBounds(bounds, tier);
        expect(resolved.min).toBeGreaterThan(0);
        expect(resolved.max).toBeGreaterThanOrEqual(resolved.min);
        expect(resolved.min).toBeLessThanOrEqual(wide.min);
        expect(resolved.max).toBeLessThanOrEqual(wide.max);
      }
    }
  });
});

describe("applyColumnBounds", () => {
  const table = { a: { min: 50, max: 150, narrow: { max: 80 } } };
  const a = { field: "a", width: 999, headerName: "A" };
  const other = { field: "other", width: 77 };

  it("sets min, max and the starting width from the tier, keeping the rest", () => {
    expect(applyColumnBounds([a], "narrow", table)).toEqual([{ field: "a", headerName: "A", width: 80, minWidth: 50, maxWidth: 80 }]);
    expect(applyColumnBounds([a], "wide", table)[0]).toMatchObject({ width: 150, minWidth: 50, maxWidth: 150 });
  });

  it("returns a column without bounds as it is", () => {
    expect(applyColumnBounds([a, other], "wide", table)[1]).toBe(other);
  });
});
