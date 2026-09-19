import { applyFdaResultFilter, type NadacPrice, type FdaProductSearchResult, type FdaResultFilter, type FdaResultDetailLevel, type FdaProductDetail } from "./types";

function createProductDescription(prod: FdaProductDetail): string {
  const proprietaryName = (prod.proprietaryName ?? " ") + " ";
  const dosageFormName = (prod.dosageFormName ?? " ") + " ";
  const strength = (prod.strengthNumber[0] ?? " ") + " ";
  const strengthUnit = (prod.strengthUnit[0] ?? " ") + " ";

  const ndcDescription = proprietaryName + dosageFormName + strength + strengthUnit;

  return ndcDescription.trim();
}

export default function fdaSearchResulsToNadacPrices(
  data: FdaProductSearchResult | undefined,
  fdaResultFilter: FdaResultFilter,
  fdaResultDetailLevel: FdaResultDetailLevel
) {

  if (!data) return [];

  const nadacPrices: NadacPrice[] =
    applyFdaResultFilter(data, fdaResultFilter)
      .products.flatMap(fdaProduct => fdaProduct
        .fdaPackageDetails.flatMap(fdaPackage => (
          fdaPackage.nadacPrices.flatMap(price => {
            if (fdaResultDetailLevel === "product")
              return {
                ...price,
                ndc: fdaProduct.productNdc,
                ndcDescription: createProductDescription(fdaProduct)
              }
            else if (fdaResultDetailLevel === "package")
              return {
                ...price,
                ndc: fdaPackage.ndcPackageCode,
                ndcDescription: fdaPackage.packageDescription
              }
            else return price;
          })
        )));

  return nadacPrices;
}

export function fdaProductsToNadacPrices(
  products: FdaProductDetail[],
) {
  const nadacPrices: NadacPrice[] = products
    .flatMap(product => product.fdaPackageDetails.flatMap(fdaPackage => (
      fdaPackage.nadacPrices.flatMap(price => ({ ...price, ndc: product.productNdc, ndcDescription: createProductDescription(product) }))
    )))

  return nadacPrices;
}
