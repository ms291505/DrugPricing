import { describe, expect, it } from "vitest";
import { FULL_WINDOW, type DateWindow } from "./dates";
import {
  applyFdaSearch, applyNadacSearch, clearFdaRefine, clearNadacRefine, createFdaCriteria, createNadacCriteria,
  fdaActiveFilterCount, fdaLoadRequest, nadacActiveFilterCount, nadacLoadRequest, nextLoad, refineFda, refineNadac,
  resolveSearchDates,
  type FdaCriteria, type NadacLoad,
} from "./searchCriteria";
import type { FdaPackageDetail, FdaProductDetail, NadacClassification, NadacPrice } from "./types";

const day = (iso: string) => Date.parse(iso);

const nadacPrice = (ndc: string, iso: string, options: Partial<NadacPrice> = {}): NadacPrice => ({
  id: 0, ndc, ndcDescription: `Drug ${ndc}`, nadacPerUnit: 1, pricingUnit: "each", asOfDate: new Date(iso),
  effectiveDate: new Date(iso), isOtc: false, explanationCode: [], classificationForRateSetting: "G",
  ndcDescriptionLower: `drug ${ndc}`, loadedAt: new Date(iso), createdAt: new Date(iso),
  ...options,
});

const fdaPackage = (ndcPackageCode: string, nadacPrices: NadacPrice[], samplePackage = false): FdaPackageDetail => ({
  id: 0, ndcPackageCode, packageDescription: `Package ${ndcPackageCode}`, startMarketingDate: new Date("2020-01-01"),
  samplePackage, ndcPackageCodeStripped: ndcPackageCode.replaceAll("-", ""), nadacPrices,
});

const product = (productNdc: string, fdaPackageDetails: FdaPackageDetail[], options: Partial<FdaProductDetail> = {}): FdaProductDetail => ({
  id: 0, productId: `${productNdc}_id`, productNdc, productTypeName: "HUMAN PRESCRIPTION DRUG",
  proprietaryName: `Brand ${productNdc}`, nonProprietaryName: ["generic"], dosageFormName: "TABLET",
  routeName: ["ORAL"], startMarketingDate: new Date("2020-01-01"), marketingCategoryName: "ANDA",
  labelerName: "Labeler", substanceName: [], strengthNumber: ["10"], strengthUnit: ["mg"], pharmClasses: [],
  fdaPackageDetails,
  ...options,
});

describe("loadRequest", () => {
  const last = day("2026-11-04");

  it("resolves presets against the last as-of date and keeps fixed dates", () => {
    expect(resolveSearchDates({ kind: "recent", months: 3 }, last)).toEqual({ start: day("2026-08-04"), end: last });
    const fixed: DateWindow = { start: day("2025-01-01"), end: null };
    expect(resolveSearchDates({ kind: "window", dateWindow: fixed }, last)).toEqual(fixed);
  });

  it("holds only the load fields, so refine changes never change it", () => {
    const criteria = { ...createNadacCriteria(), ndcDescription: "eliquis" };
    const refined = { ...criteria, includeOtc: true, brandGeneric: "brand" as const, excludedNdcDescriptions: ["X"], excludedUnits: ["each"] };
    expect(nadacLoadRequest(refined, last)).toEqual(nadacLoadRequest(criteria, last));
    expect(nadacLoadRequest(criteria, last)).toEqual({ ndcDescription: "eliquis", ndc: "", dates: { start: day("2025-11-04"), end: last } });

    const fda = { ...createFdaCriteria(), proprietaryName: "eliquis" };
    expect(fdaLoadRequest({ ...fda, includeOtc: true, includeSamplePackages: true, excludedRoutes: ["ORAL"] }, last))
      .toEqual(fdaLoadRequest(fda, last));
  });

  it("is null when the terms aren't enough to search on", () => {
    expect(nadacLoadRequest({ ...createNadacCriteria(), ndcDescription: "eli" }, last)).toBeNull();
    expect(nadacLoadRequest({ ...createNadacCriteria(), ndc: "30893" }, last)).not.toBeNull();
    expect(fdaLoadRequest({ ...createFdaCriteria(), proprietaryName: "  eli  " }, last)).toBeNull();
  });
});

describe("nextLoad", () => {
  const load = (start: number | null, end: number | null, ndcDescription = "eliquis"): NadacLoad =>
    ({ ndcDescription, ndc: "", dates: { start, end } });
  const loaded = load(day("2025-11-04"), day("2026-11-04"));

  it("keeps what's loaded for the same terms and narrower dates", () => {
    expect(nextLoad(loaded, load(day("2026-08-04"), day("2026-11-04")))).toBe(loaded);
    expect(nextLoad(loaded, load(day("2025-11-04"), day("2026-11-04")))).toBe(loaded);
  });

  it("loads anew for wider dates, an open end, or new terms", () => {
    const wider = load(day("2025-05-04"), day("2026-11-04"));
    expect(nextLoad(loaded, wider)).toBe(wider);
    const openStart = load(null, day("2026-11-04"));
    expect(nextLoad(loaded, openStart)).toBe(openStart);
    const otherTerms = load(day("2026-08-04"), day("2026-11-04"), "humira");
    expect(nextLoad(loaded, otherTerms)).toBe(otherTerms);
  });

  it("treats all dates loaded as covering any dates", () => {
    const all = load(null, null);
    expect(nextLoad(all, loaded)).toBe(all);
  });

  it("starts with the requested load, and has none without one", () => {
    expect(nextLoad(null, loaded)).toBe(loaded);
    expect(nextLoad(loaded, null)).toBeNull();
  });
});

describe("applying a search", () => {
  const applied = {
    ...createNadacCriteria(), ndcDescription: "eliquis", includeOtc: true, brandGeneric: "brand" as const,
    excludedNdcDescriptions: ["X"], excludedUnits: ["each"],
  };
  const threeMonths = { kind: "recent" as const, months: 3 };

  it("keeps every refine field for the same terms", () => {
    expect(applyNadacSearch(applied, { ndcDescription: "eliquis", ndc: "", dates: threeMonths }))
      .toEqual({ ...applied, dates: threeMonths });
  });

  it("clears the exclusion lists for new terms and keeps the fixed refine fields", () => {
    expect(applyNadacSearch(applied, { ndcDescription: "humira", ndc: "", dates: applied.dates })).toEqual({
      ...applied, ndcDescription: "humira", excludedNdcDescriptions: [], excludedUnits: [],
    });

    const fda: FdaCriteria = { ...createFdaCriteria(), proprietaryName: "eliquis", includeSamplePackages: true, excludedRoutes: ["ORAL"] };
    expect(applyFdaSearch(fda, { proprietaryName: "humira", dates: fda.dates }))
      .toEqual({ ...fda, proprietaryName: "humira", excludedRoutes: [] });
  });
});

describe("refineNadac", () => {
  const prices = [
    nadacPrice("1", "2026-01-07"),
    nadacPrice("1", "2026-01-14"),
    nadacPrice("2", "2026-01-14", { isOtc: true }),
    nadacPrice("3", "2026-01-14", { classificationForRateSetting: "B_ANDA", pricingUnit: "gram" }),
  ];
  const criteria = { ...createNadacCriteria(), includeOtc: true };
  const ndcs = (result: NadacPrice[]) => [...new Set(result.map(price => price.ndc))];

  it("hides OTC NDCs by default", () => {
    expect(ndcs(refineNadac(prices, createNadacCriteria(), FULL_WINDOW))).toEqual(["1", "3"]);
    expect(refineNadac(prices, criteria, FULL_WINDOW)).toBe(prices);
  });

  it("clips to the dates", () => {
    expect(refineNadac(prices, criteria, { start: day("2026-01-14"), end: null })).toHaveLength(3);
    expect(refineNadac(prices, criteria, { start: null, end: day("2026-01-10") })).toEqual([prices[0]]);
  });

  it("picks brand or generic, every B classification counting as brand", () => {
    const classed = (classificationForRateSetting: NadacClassification) =>
      nadacPrice(classificationForRateSetting, "2026-01-14", { classificationForRateSetting });
    const all = (["G", "B", "B_ANDA", "B_BIO", "unknown"] as const).map(classed);
    expect(ndcs(refineNadac(all, { ...criteria, brandGeneric: "brand" }, FULL_WINDOW))).toEqual(["B", "B_ANDA", "B_BIO"]);
    expect(ndcs(refineNadac(all, { ...criteria, brandGeneric: "generic" }, FULL_WINDOW))).toEqual(["G"]);
    expect(refineNadac(all, criteria, FULL_WINDOW)).toHaveLength(5);
  });

  it("classifies an NDC by its latest price in the dates", () => {
    const changed = [
      nadacPrice("1", "2026-01-07", { classificationForRateSetting: "B", isOtc: true }),
      nadacPrice("1", "2026-01-14", { classificationForRateSetting: "G" }),
    ];
    expect(refineNadac(changed, { ...createNadacCriteria(), brandGeneric: "generic" }, FULL_WINDOW)).toEqual(changed);
    expect(refineNadac(changed, { ...createNadacCriteria(), brandGeneric: "generic" }, { start: null, end: day("2026-01-10") })).toEqual([]);
  });

  it("excludes descriptions and units, and combines with the other fields", () => {
    expect(ndcs(refineNadac(prices, { ...criteria, excludedNdcDescriptions: ["Drug 1"] }, FULL_WINDOW))).toEqual(["2", "3"]);
    expect(ndcs(refineNadac(prices, { ...criteria, excludedUnits: ["gram"] }, FULL_WINDOW))).toEqual(["1", "2"]);
    expect(ndcs(refineNadac(prices, { ...createNadacCriteria(), excludedUnits: ["gram"] }, FULL_WINDOW))).toEqual(["1"]);
    expect(refineNadac(prices, { ...createNadacCriteria(), brandGeneric: "brand", excludedUnits: ["gram"] }, FULL_WINDOW)).toEqual([]);
  });

  it("returns nothing for an empty result", () => {
    expect(refineNadac([], createNadacCriteria(), FULL_WINDOW)).toEqual([]);
  });
});

describe("refineFda", () => {
  const priced = (code: string, iso = "2026-01-14", pricingUnit = "each") =>
    fdaPackage(code, [nadacPrice(code, iso, { pricingUnit })]);
  const result = {
    products: [
      product("1", [priced("1-1"), fdaPackage("1-2", []), fdaPackage("1-3", [nadacPrice("13", "2026-01-14")], true)]),
      product("2", [priced("2-1")], { productTypeName: "HUMAN OTC DRUG", dosageFormName: "CAPSULE" }),
      product("3", [fdaPackage("3-1", [])], { routeName: ["ORAL", "TOPICAL"], labelerName: "Other" }),
      product("4", [priced("4-1", "2025-01-07"), priced("4-2", "2026-01-14", "milliliter")]),
    ],
  };
  const everything: FdaCriteria = {
    ...createFdaCriteria(), includeOtc: true, includeSamplePackages: true, includeResultsWithoutPrices: true,
  };
  const shown = (criteria: FdaCriteria, dates: DateWindow = FULL_WINDOW) =>
    refineFda(result, criteria, dates).products.map(p => [p.productNdc, p.fdaPackageDetails.map(pkg => pkg.ndcPackageCode)]);

  it("hides OTC products, sample packages, and packages without prices by default", () => {
    expect(shown(createFdaCriteria())).toEqual([["1", ["1-1"]], ["4", ["4-1", "4-2"]]]);
    expect(shown(everything)).toEqual(result.products.map(p => [p.productNdc, p.fdaPackageDetails.map(pkg => pkg.ndcPackageCode)]));
  });

  it("shows each kind once its Include box is ticked", () => {
    const defaults = createFdaCriteria();
    expect(shown({ ...defaults, includeOtc: true }).map(([ndc]) => ndc)).toEqual(["1", "2", "4"]);
    expect(shown({ ...defaults, includeSamplePackages: true })[0]).toEqual(["1", ["1-1", "1-3"]]);
    expect(shown({ ...defaults, includeResultsWithoutPrices: true })).toEqual([["1", ["1-1", "1-2"]], ["3", ["3-1"]], ["4", ["4-1", "4-2"]]]);
  });

  it("clips prices to the dates, so a package priced only outside them counts as without prices", () => {
    const dates = { start: day("2026-01-01"), end: null };
    expect(shown(createFdaCriteria(), dates)).toEqual([["1", ["1-1"]], ["4", ["4-2"]]]);
    const withoutPrices = refineFda(result, { ...createFdaCriteria(), includeResultsWithoutPrices: true }, dates);
    expect(withoutPrices.products.find(p => p.productNdc === "4")?.fdaPackageDetails[0].nadacPrices).toEqual([]);
  });

  it("excludes product NDCs, dosage forms, routes and labelers", () => {
    expect(shown({ ...everything, excludedProductNdcs: ["1", "4"] }).map(([ndc]) => ndc)).toEqual(["2", "3"]);
    expect(shown({ ...everything, excludedDosageForms: ["TABLET"] }).map(([ndc]) => ndc)).toEqual(["2"]);
    // A product shows while any of its routes is still included.
    expect(shown({ ...everything, excludedRoutes: ["ORAL"] }).map(([ndc]) => ndc)).toEqual(["3"]);
    expect(shown({ ...everything, excludedLabelers: ["Labeler"] }).map(([ndc]) => ndc)).toEqual(["3"]);
  });

  it("hides packages priced only in excluded units, even when packages without prices show", () => {
    expect(shown({ ...everything, excludedUnits: ["milliliter"] }).at(-1)).toEqual(["4", ["4-1"]]);
    expect(shown({ ...createFdaCriteria(), excludedUnits: ["each"] })).toEqual([["4", ["4-2"]]]);
  });

  it("leaves the loaded result as it is", () => {
    refineFda(result, { ...createFdaCriteria(), excludedUnits: ["each"] }, { start: day("2026-01-01"), end: null });
    expect(result.products[3].fdaPackageDetails[0].nadacPrices).toHaveLength(1);
    expect(result.products[0].fdaPackageDetails).toHaveLength(3);
  });

  it("returns no products for an empty result", () => {
    expect(refineFda({ products: [] }, createFdaCriteria(), FULL_WINDOW)).toEqual({ products: [] });
  });
});

describe("filter state", () => {
  it("counts the refine fields set away from their defaults", () => {
    expect(nadacActiveFilterCount(createNadacCriteria())).toBe(0);
    expect(nadacActiveFilterCount({ ...createNadacCriteria(), includeOtc: true, excludedUnits: ["each"], ndcDescription: "x" })).toBe(2);
    expect(fdaActiveFilterCount({ ...createFdaCriteria(), includeSamplePackages: true, excludedRoutes: ["ORAL"], excludedLabelers: ["L"] })).toBe(3);
  });

  it("clears the refine fields and keeps the search", () => {
    const nadac = { ...createNadacCriteria(), ndcDescription: "eliquis", ndc: "3089321", dates: { kind: "recent" as const, months: 3 } };
    expect(clearNadacRefine({ ...nadac, includeOtc: true, brandGeneric: "brand", excludedNdcDescriptions: ["X"] })).toEqual(nadac);
    const fda = { ...createFdaCriteria(), proprietaryName: "eliquis" };
    expect(clearFdaRefine({ ...fda, includeResultsWithoutPrices: true, excludedDosageForms: ["TABLET"] })).toEqual(fda);
  });
});
