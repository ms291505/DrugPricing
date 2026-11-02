import { fdaProductsToNadacPrices } from "./fdaDataToNadacPrices";
import { latestSummary, summarizeByUnit, type UnitPriceSummary } from "./prices";
import type { ChartPrice, FdaPackageDetail, FdaProductDetail } from "./types";

/*
 * The rows of the results tables (`Components/ResultTables`). Each row's prices are summarized from
 * the prices its chart would draw, keyed the same way, so a table and its charts agree.
 */

/** A results-table row with its prices summarized once per unit. Empty when the row has no prices. */
export type PricedRow = { priceSummaries: UnitPriceSummary[] };

export type NadacRow = PricedRow & {
  ndc: string,
  ndcDescription: string,
};

export type FdaProductRow = FdaProductDetail & PricedRow;

/** A package with the product fields its columns show. */
export type FdaPackageRow = FdaPackageDetail & PricedRow & {
  productNdc: string,
  proprietaryName: string,
  nonProprietaryName: string[],
  dosageFormName: string,
  routeName: string[],
  labelerName: string,
};

/** One row per NDC, described by its latest description. */
export function nadacRows(prices: ChartPrice[]): NadacRow[] {
  return [...summarizeByUnit(prices)].map(([ndc, priceSummaries]) => ({
    ndc,
    ndcDescription: latestSummary(priceSummaries)!.label,
    priceSummaries,
  }));
}

/**
 * One row per product, priced like its product-level chart: its packages averaged per date. Pass
 * the products after the page filter, so a filtered-out package doesn't count.
 */
export function fdaProductRows(products: FdaProductDetail[]): FdaProductRow[] {
  const summaries = summarizeByUnit(fdaProductsToNadacPrices(products, "product"));
  return products.map(product => ({ ...product, priceSummaries: summaries.get(product.productNdc) ?? [] }));
}

/** One row per package, priced like its package-level chart. */
export function fdaPackageRows(products: FdaProductDetail[]): FdaPackageRow[] {
  const summaries = summarizeByUnit(fdaProductsToNadacPrices(products, "package"));
  return products.flatMap(product => product.fdaPackageDetails.map(fdaPackage => ({
    ...fdaPackage,
    productNdc: product.productNdc,
    proprietaryName: product.proprietaryName,
    nonProprietaryName: product.nonProprietaryName,
    dosageFormName: product.dosageFormName,
    routeName: product.routeName,
    labelerName: product.labelerName,
    priceSummaries: summaries.get(fdaPackage.ndcPackageCode) ?? [],
  })));
}
