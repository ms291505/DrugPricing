import { packageActivity, productActivity, type PriceActivity } from "./priceActivity";
import { fdaPackagePrices } from "./flagNadacPriceChange";
import { fdaProductsToNadacPrices } from "./fdaDataToNadacPrices";
import { latestSummary, summarizeByUnit, type AsOfReference, type UnitPriceSummary } from "./prices";
import type { ChartPrice, FdaPackageDetail, FdaProductDetail } from "./types";

/*
 * The rows of the results tables (`Components/ResultTables`). Each row's prices are summarized from
 * the prices its chart would draw, keyed the same way, so a table and its charts agree. Each
 * builder takes the dates shown (`AsOfReference`), against which each unit's latest price is
 * marked stale (`currentAsOfDate`).
 */

/** A results-table row with its prices summarized once per unit. Empty when the row has no prices. */
export type PricedRow = { priceSummaries: UnitPriceSummary[], priceActivity: PriceActivity };

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
  strengthNumber: string[],
  strengthUnit: string[],
  productTypeName: string,
};

/** One row per NDC, described by its latest description. */
export function nadacRows(prices: ChartPrice[], reference: AsOfReference): NadacRow[] {
  const packages = new Map<string, ChartPrice[]>();
  for (const price of prices) {
    const pkg = packages.get(price.ndc);
    if (pkg) pkg.push(price); else packages.set(price.ndc, [price]);
  }
  return [...summarizeByUnit(prices, reference)].map(([ndc, priceSummaries]) => ({
    ndc,
    ndcDescription: latestSummary(priceSummaries)!.label,
    priceSummaries,
    priceActivity: packageActivity(packages.get(ndc) ?? []),
  }));
}

/**
 * One row per product, priced like its product-level chart: its packages averaged per date. Pass
 * the products after the page filter, so a filtered-out package doesn't count.
 */
export function fdaProductRows(products: FdaProductDetail[], reference: AsOfReference): FdaProductRow[] {
  const summaries = summarizeByUnit(fdaProductsToNadacPrices(products, "product"), reference);
  return products.map(product => ({ ...product, priceSummaries: summaries.get(product.productNdc) ?? [], priceActivity: productActivity(fdaPackagePrices([product])) }));
}

/** One row per package, priced like its package-level chart. */
export function fdaPackageRows(products: FdaProductDetail[], reference: AsOfReference): FdaPackageRow[] {
  const summaries = summarizeByUnit(fdaProductsToNadacPrices(products, "package"), reference);
  return products.flatMap(product => product.fdaPackageDetails.map(fdaPackage => ({
    ...fdaPackage,
    priceActivity: packageActivity(fdaPackage.nadacPrices),
    productNdc: product.productNdc,
    proprietaryName: product.proprietaryName,
    nonProprietaryName: product.nonProprietaryName,
    dosageFormName: product.dosageFormName,
    routeName: product.routeName,
    labelerName: product.labelerName,
    strengthNumber: product.strengthNumber,
    strengthUnit: product.strengthUnit,
    productTypeName: product.productTypeName,
    priceSummaries: summaries.get(fdaPackage.ndcPackageCode) ?? [],
  })));
}

/** Strength text shared by FDA product and package columns, including multi-ingredient drugs. */
export function formatStrength(product: Pick<FdaProductDetail, "strengthNumber" | "strengthUnit">): string {
  return product.strengthNumber.map((strength, i) => {
    const unit = product.strengthUnit[i];
    return unit ? `${strength} ${unit}` : strength;
  }).join(", ");
}
