import { describe, expect, it } from "vitest";
import { defaultTitleFor, titleAfterClear, titleFollowsSearch } from "./tabType";

describe("titleFollowsSearch", () => {
  it("follows while the title is the default or the on-screen search's", () => {
    expect(titleFollowsSearch({ id: "a", type: "fda", title: defaultTitleFor("fda") }, null)).toBe(true);
    expect(titleFollowsSearch({ id: "a", type: "fda", title: "ELIQUIS" }, "ELIQUIS")).toBe(true);
  });

  it("stops once the user names the tab", () => {
    expect(titleFollowsSearch({ id: "a", type: "fda", title: "Blood thinners" }, "ELIQUIS")).toBe(false);
  });
});

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
