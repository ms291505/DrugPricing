import { describe, expect, it } from "vitest";
import { countMessage } from "./searchToasts";

describe("countMessage", () => {
  const products: [string, string] = ["product", "products"];

  it("says none, one, or the count", () => {
    expect(countMessage(0, products, "found")).toBe("No products found");
    expect(countMessage(1, products, "found")).toBe("1 product found");
    expect(countMessage(12, products, "found")).toBe("12 products found");
  });
});
