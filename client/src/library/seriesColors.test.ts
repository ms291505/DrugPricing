import { describe, expect, it } from "vitest";
import { assignSeriesColors, preferredSlots } from "./seriesColors";

const PALETTE = ["c0", "c1", "c2", "c3"];
const result = ["A", "B", "C", "D", "E", "F"];
const preferred = preferredSlots(result);

describe("assignSeriesColors", () => {
  it("gives each NDC its preferred color when nothing clashes", () => {
    const colors = assignSeriesColors(["A", "B", "C"], preferred, PALETTE);
    expect([...colors]).toEqual([["A", "c0"], ["B", "c1"], ["C", "c2"]]);
  });

  it("doesn't move colors when a filter hides a series in between", () => {
    const colors = assignSeriesColors(["A", "C"], preferred, PALETTE);
    expect(colors.get("C")).toBe("c2");
  });

  it("resolves a clash with the first free color, so no visible series share one", () => {
    // E prefers slot 4 % 4 = c0, which A holds.
    const colors = assignSeriesColors(["A", "C", "E"], preferred, PALETTE);
    expect(colors.get("E")).toBe("c1");
    expect(new Set(colors.values()).size).toBe(3);
  });

  it("lets the series earlier in the result keep its color, whatever order they're shown in", () => {
    expect(assignSeriesColors(["E", "A"], preferred, PALETTE).get("A")).toBe("c0");
  });

  it("falls back to preferred colors once the palette is used up", () => {
    const colors = assignSeriesColors(result, preferred, PALETTE);
    expect(colors.get("E")).toBe("c0");
    expect(colors.get("F")).toBe("c1");
  });
});
