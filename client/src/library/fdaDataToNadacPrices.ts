import { type NadacPrice, type FdaResultDetailLevel, type FdaProductDetail } from "./types";

function createProductDescription(prod: FdaProductDetail): string {
  const proprietaryName = (prod.proprietaryName ?? " ") + " ";
  const dosageFormName = (prod.dosageFormName ?? " ") + " ";
  const strength = (prod.strengthNumber[0] ?? " ") + " ";
  const strengthUnit = (prod.strengthUnit[0] ?? " ") + " ";

  const ndcDescription = proprietaryName + dosageFormName + strength + strengthUnit;

  return ndcDescription.trim();
}

/** Prices of these products, keyed at the given level: product NDC or package NDC. */
export function fdaProductsToNadacPrices(
  products: FdaProductDetail[],
  fdaResultDetailLevel: FdaResultDetailLevel
): NadacPrice[] {
  return products.flatMap(fdaProduct => fdaProduct
    .fdaPackageDetails.flatMap(fdaPackage => (
      fdaPackage.nadacPrices.map(price =>
        fdaResultDetailLevel === "product"
          ? { ...price, ndc: fdaProduct.productNdc, ndcDescription: createProductDescription(fdaProduct) }
          : { ...price, ndc: fdaPackage.ndcPackageCode, ndcDescription: fdaPackage.packageDescription }
      )
    )));
}
