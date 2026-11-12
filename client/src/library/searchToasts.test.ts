import { describe, expect, it } from "vitest";
import { countMessage, foundMessage, hiddenResultsMessage, type Noun } from "./searchToasts";

const products: Noun = ["product", "products"];

describe("countMessage", () => {
  it("says none, one, or the count", () => {
    expect(countMessage(0, products, "found")).toBe("No products found");
    expect(countMessage(1, products, "found")).toBe("1 product found");
    expect(countMessage(12, products, "found")).toBe("12 products found");
  });
});

describe("foundMessage", () => {
  it("adds how many are hidden, when any are", () => {
    expect(foundMessage(10, 72, products)).toBe("10 products found (72 hidden)");
    expect(foundMessage(0, 3, products)).toBe("No products found (3 hidden)");
    expect(foundMessage(1, 0, products)).toBe("1 product found");
  });
});

describe("hiddenResultsMessage", () => {
  it("names what one Include box hides, and offers it", () => {
    expect(hiddenResultsMessage({ kind: "include", key: "includeOtc", count: 12 }, products))
      .toEqual({ message: "12 OTC products hidden.", action: "Include OTC" });
    expect(hiddenResultsMessage({ kind: "include", key: "includeResultsWithoutPrices", count: 1 }, products))
      .toEqual({ message: "1 product without prices hidden.", action: "Include results without prices" });
    expect(hiddenResultsMessage({ kind: "include", key: "includeSamplePackages", count: 2 }, ["package", "packages"]))
      .toEqual({ message: "2 sample packages hidden.", action: "Include sample packages" });
  });

  it("offers to clear the filters, or to show all", () => {
    expect(hiddenResultsMessage({ kind: "clear", count: 8 }, ["package", "packages"]))
      .toEqual({ message: "8 packages hidden by filters.", action: "Clear filters" });
    expect(hiddenResultsMessage({ kind: "all", count: 8 }, products))
      .toEqual({ message: "8 products hidden by filters.", action: "Show all" });
  });
});
