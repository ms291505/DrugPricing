import { describe, expect, it } from "vitest";
import { applyColumnBounds, autosizeMaxWidths, COLUMN_BOUNDS, resolveBounds } from "./columnBounds";

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

  it("sets min and the starting width from the tier, keeping the rest", () => {
    expect(applyColumnBounds([a], "narrow", table)).toEqual([{ field: "a", headerName: "A", width: 80, minWidth: 50 }]);
    expect(applyColumnBounds([a], "wide", table)[0]).toMatchObject({ width: 150, minWidth: 50 });
  });

  it("leaves no maximum for a drag, even one a column def set", () => {
    expect(applyColumnBounds([{ ...a, maxWidth: 100 }], "wide", table)[0]).not.toHaveProperty("maxWidth");
  });

  it("returns a column without bounds as it is", () => {
    expect(applyColumnBounds([a, other], "wide", table)[1]).toBe(other);
  });
});

describe("autosizing's maximum", () => {
  const table = { a: { min: 50, max: 150, narrow: { max: 80 } }, b: { min: 60, max: 40 } };

  it("is each bounded column's tier max, by field", () => {
    expect(autosizeMaxWidths([{ field: "a" }, { field: "b" }, { field: "other" }], "wide", table)).toEqual({ a: 150, b: 60 });
    expect(autosizeMaxWidths([{ field: "a" }], "narrow", table)).toEqual({ a: 80 });
  });
});

describe("COLUMN_BOUNDS", () => {
  // The columns are defined in components, which a Node test can't import: read their field names.
  const sources = import.meta.glob<string>("../Components/ResultTables/*.tsx", { query: "?raw", import: "default", eager: true });
  const fields = new Set(Object.values(sources).flatMap(source => [...source.matchAll(/\bfield: "(\w+)"/g)].map(match => match[1])));

  it("has an entry for every result-table column, and none for a column that does not exist", () => {
    expect(fields.size).toBeGreaterThan(15);
    expect([...fields].filter(field => !(field in COLUMN_BOUNDS))).toEqual([]);
    expect(Object.keys(COLUMN_BOUNDS).filter(field => !fields.has(field))).toEqual([]);
  });
});
