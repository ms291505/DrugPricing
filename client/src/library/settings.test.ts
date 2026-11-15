import { describe, expect, it } from "vitest";
import { columnOverridesFromModel, columnVisibilityModel, readColumnOverrides, RESULT_SELECTION_FIELD } from "./settings";

describe("column visibility overrides", () => {
  it("records both hiding a default column and showing an optional column", () => {
    const defaults = ["minPrice", "maxPrice"];
    const model = { minPrice: true, maxPrice: false, proprietaryName: false, latestPrice: true };
    const overrides = columnOverridesFromModel(defaults, model);
    expect(overrides).toEqual({ minPrice: true, proprietaryName: false });
    expect(columnVisibilityModel(defaults, overrides)).toEqual({ minPrice: true, maxPrice: false, proprietaryName: false });
  });

  it("handles Show all's empty model, Hide all, and Reset", () => {
    const defaults = ["minPrice", "maxPrice"];
    expect(columnOverridesFromModel(defaults, {})).toEqual({ minPrice: true, maxPrice: true });
    expect(columnOverridesFromModel(defaults, { latestPrice: false, minPrice: false, maxPrice: false }))
      .toEqual({ latestPrice: false });
    expect(columnOverridesFromModel(defaults, columnVisibilityModel(defaults, {}))).toEqual({});
  });

  it("never saves the selection checkbox from input or from a grid change", () => {
    expect(readColumnOverrides({ nadac: { [RESULT_SELECTION_FIELD]: false, latestPrice: false } }).nadac)
      .toEqual({ latestPrice: false });
    expect(columnOverridesFromModel([], { [RESULT_SELECTION_FIELD]: false, latestPrice: false }))
      .toEqual({ latestPrice: false });
  });
});
