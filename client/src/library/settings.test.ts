import { describe, expect, it } from "vitest";
import { columnVisibilityModel, readHiddenColumns } from "./settings";

describe("column visibility", () => {
  it("stores only hidden fields so a newly added default column is visible", () => {
    const hidden = readHiddenColumns({ fdaProduct: ["minPrice", "maxPrice"], fdaPackage: [], nadac: [] });
    const model = columnVisibilityModel(hidden.fdaProduct);
    expect(model).toEqual({ minPrice: false, maxPrice: false });
    expect(model.priceActivity).toBeUndefined();
    expect(columnVisibilityModel(hidden.fdaPackage)).toEqual({});
  });
});
