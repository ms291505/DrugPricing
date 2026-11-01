import { describe, expect, it } from "vitest";
import { isValidNadacSearch, nadacTabTitle } from "./nadacSearch";
import { MIN_NDC_DESCRIPTION_LENGTH } from "./constants";

describe("nadacTabTitle", () => {
  it("takes a description of exactly the minimum length", () => {
    const description = "a".repeat(MIN_NDC_DESCRIPTION_LENGTH);
    expect(nadacTabTitle(description, "")).toBe(description.toUpperCase());
  });

  it("trims the description before measuring and naming", () => {
    expect(nadacTabTitle("  eliquis ", "")).toBe("ELIQUIS");
    // Long enough only with its spaces.
    expect(nadacTabTitle("abcd ", "")).toBeNull();
    expect(nadacTabTitle("  abc  ", "3089321")).toBe("NDC 3089321");
  });

  it("prefers the description when both fields are filled", () => {
    expect(nadacTabTitle("eliquis", "3089321")).toBe("ELIQUIS");
  });

  it("falls back to the stored NDC", () => {
    expect(nadacTabTitle("", "3089321")).toBe("NDC 3089321");
  });
});

describe("isValidNadacSearch", () => {
  it("doesn't count spaces around the description", () => {
    expect(isValidNadacSearch("abcd ", "")).toBe(false);
    expect(isValidNadacSearch("abcde", "")).toBe(true);
    expect(isValidNadacSearch("", "3089321")).toBe(true);
  });

  it("is valid exactly when the tab gets a title", () => {
    for (const [description, ndc] of [["abcd ", ""], ["  abc  ", "308"], ["eliquis", ""], ["", "3089321"]]) {
      expect(isValidNadacSearch(description, ndc)).toBe(nadacTabTitle(description, ndc) !== null);
    }
  });
});
