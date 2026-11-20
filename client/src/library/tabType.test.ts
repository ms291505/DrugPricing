import { describe, expect, it } from "vitest";
import { defaultTitleFor, titleAfterClear } from "./tabType";

describe("titleAfterClear", () => {
  it("restores the default title the search replaced", () => {
    expect(titleAfterClear({ id: "a", type: "fda", title: "ELIQUIS" }, "ELIQUIS")).toBe(defaultTitleFor("fda"));
    expect(titleAfterClear({ id: "a", type: "nadac", title: "NDC 3089321" }, "NDC 3089321")).toBe(defaultTitleFor("nadac"));
  });

  it("keeps a title the user chose", () => {
    expect(titleAfterClear({ id: "a", type: "fda", title: "Blood thinners" }, "ELIQUIS")).toBe("Blood thinners");
  });

  it("keeps the title when the search had none to give", () => {
    expect(titleAfterClear({ id: "a", type: "nadac", title: "New NADAC Search" }, null)).toBe("New NADAC Search");
  });
});
