import { describe, expect, it } from "vitest";
import { fdaPackageRows, fdaProductRows, nadacRows } from "./resultRows";
import { applyFdaResultFilter, createFdaResultFilter, type FdaPackageDetail, type FdaProductDetail, type NadacPrice } from "./types";

const nadacPrice = (ndc: string, iso: string, nadacPerUnit: number, pricingUnit = "each"): NadacPrice => ({
  id: 0, ndc, ndcDescription: `Drug ${ndc}`, nadacPerUnit, pricingUnit, asOfDate: new Date(iso),
  effectiveDate: new Date(iso), isOtc: false, explanationCode: [], classificationForRateSetting: "G",
  ndcDescriptionLower: `drug ${ndc}`, loadedAt: new Date(iso), createdAt: new Date(iso),
});

const fdaPackage = (ndcPackageCode: string, nadacPrices: NadacPrice[], samplePackage = false): FdaPackageDetail => ({
  id: 0, ndcPackageCode, packageDescription: `Package ${ndcPackageCode}`, startMarketingDate: new Date("2020-01-01"),
  samplePackage, ndcPackageCodeStripped: ndcPackageCode.replaceAll("-", ""), nadacPrices,
});

const product = (productNdc: string, fdaPackageDetails: FdaPackageDetail[]): FdaProductDetail => ({
  id: 0, productId: `${productNdc}_id`, productNdc, productTypeName: "HUMAN PRESCRIPTION DRUG",
  proprietaryName: `Brand ${productNdc}`, nonProprietaryName: ["generic"], dosageFormName: "TABLET",
  routeName: ["ORAL"], startMarketingDate: new Date("2020-01-01"), marketingCategoryName: "ANDA",
  labelerName: "Labeler", substanceName: [], strengthNumber: ["10"], strengthUnit: ["mg"], pharmClasses: [],
  fdaPackageDetails,
});

describe("nadacRows", () => {
  it("gives one row per NDC, described by its latest description", () => {
    const rows = nadacRows([
      { ...nadacPrice("1", "2025-02-01", 2), ndcDescription: "NEW" },
      { ...nadacPrice("1", "2025-01-01", 1), ndcDescription: "OLD" },
      nadacPrice("2", "2025-01-01", 5),
    ]);
    expect(rows.map(row => [row.ndc, row.ndcDescription, row.priceSummaries[0].latest])).toEqual([["1", "NEW", 2], ["2", "Drug 2", 5]]);
  });
});

describe("fdaProductRows", () => {
  it("prices a product from its priced packages only, averaged per date", () => {
    const [row] = fdaProductRows([product("1-1", [
      fdaPackage("1-1-1", [nadacPrice("111", "2025-01-01", 10)]),
      fdaPackage("1-1-2", [nadacPrice("112", "2025-01-01", 20)]),
      fdaPackage("1-1-3", []),
    ])]);
    expect(row.priceSummaries).toHaveLength(1);
    expect(row.priceSummaries[0]).toMatchObject({ ndc: "1-1", latest: 15, packages: 2 });
  });

  it("leaves a product with no priced packages without prices", () => {
    const [row] = fdaProductRows([product("1-1", [fdaPackage("1-1-1", [])])]);
    expect(row.priceSummaries).toEqual([]);
  });

  it("gives a product priced in two units one summary per unit", () => {
    const [row] = fdaProductRows([product("1-1", [
      fdaPackage("1-1-1", [nadacPrice("111", "2025-01-01", 1, "each")]),
      fdaPackage("1-1-2", [nadacPrice("112", "2025-02-01", 0.5, "gram")]),
    ])]);
    expect(row.priceSummaries.map(summary => [summary.pricingUnit, summary.latest])).toEqual([["each", 1], ["gram", 0.5]]);
  });

  it("drops the prices of packages the page filter excludes", () => {
    const data = { products: [product("1-1", [
      fdaPackage("1-1-1", [nadacPrice("111", "2025-01-01", 10)]),
      fdaPackage("1-1-2", [nadacPrice("112", "2025-01-01", 30)], true),
    ])] };
    const filter = { ...createFdaResultFilter(), excludeSamplePackages: true };
    expect(fdaProductRows(data.products)[0].priceSummaries[0].latest).toBe(20);
    expect(fdaProductRows(applyFdaResultFilter(data, filter).products)[0].priceSummaries[0].latest).toBe(10);
  });
});

describe("fdaPackageRows", () => {
  it("gives each package its own prices and its product's fields", () => {
    const rows = fdaPackageRows([product("1-1", [
      fdaPackage("1-1-1", [nadacPrice("111", "2025-01-01", 10)]),
      fdaPackage("1-1-2", []),
    ])]);
    expect(rows.map(row => [row.ndcPackageCode, row.productNdc, row.proprietaryName, row.priceSummaries.map(s => s.latest)]))
      .toEqual([["1-1-1", "1-1", "Brand 1-1", [10]], ["1-1-2", "1-1", "Brand 1-1", []]]);
  });

  it("keys prices by the package it holds them, whatever NDC the prices carry", () => {
    const [row] = fdaPackageRows([product("1-1", [fdaPackage("1-1-1", [nadacPrice("0001101", "2025-01-01", 10)])])]);
    expect(row.priceSummaries).toHaveLength(1);
  });
});
