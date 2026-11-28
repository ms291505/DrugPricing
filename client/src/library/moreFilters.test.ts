import { describe, expect, it } from "vitest";
import { moreFiltersLayout } from "./moreFilters";

describe("moreFiltersLayout", () => {
  it("puts groups side by side when that takes fewest rows, spare columns to the longest", () => {
    // FDA's five drug details and two pricing lists, on a wide panel: two rows.
    expect(moreFiltersLayout([5, 2], 4)).toEqual({ columns: 4, spans: [3, 1] });
  });

  it("gives each group its own rows when sharing a row would take more", () => {
    // The same lists on a medium panel: three rows and one, not five side by side.
    expect(moreFiltersLayout([5, 2], 2)).toEqual({ columns: 2, spans: [2, 2] });
  });

  it("uses no more columns than there are fields", () => {
    // NADAC's one Drug list and one Pricing unit list share a row, half the panel each.
    expect(moreFiltersLayout([1, 1], 4)).toEqual({ columns: 2, spans: [1, 1] });
    expect(moreFiltersLayout([1, 1], 2)).toEqual({ columns: 2, spans: [1, 1] });
    expect(moreFiltersLayout([3], 4)).toEqual({ columns: 3, spans: [3] });
  });

  it("stacks every group in one column on a narrow panel", () => {
    expect(moreFiltersLayout([5, 2], 1)).toEqual({ columns: 1, spans: [1, 1] });
    expect(moreFiltersLayout([1, 1], 1)).toEqual({ columns: 1, spans: [1, 1] });
  });

  it("has room for another field in a group", () => {
    expect(moreFiltersLayout([5, 3], 4)).toEqual({ columns: 4, spans: [3, 1] });
    expect(moreFiltersLayout([2, 2], 4)).toEqual({ columns: 4, spans: [2, 2] });
  });
});
