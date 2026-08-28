import { applyFdaResultFilter, type NadacPrice, type FdaProductSearchResult, type FdaResultFilter, type FdaResultDetailLevel } from "./types";

export default function fdaSearchResulsToNadacPrices(
  data: FdaProductSearchResult | undefined,
  fdaResultFilter: FdaResultFilter,
  fdaResultDetailLevel: FdaResultDetailLevel
) {
  const nadacPrices: NadacPrice[] =
    data
      ? applyFdaResultFilter(data, fdaResultFilter)
        .products.flatMap(fdaProduct => fdaProduct
          .fdaPackageDetails.flatMap(fdaPackage => (
            fdaPackage.nadacPrices.flatMap(price => {
              if (fdaResultDetailLevel === "product")
                return {
                  ...price,
                  ndc: fdaProduct.productNdc,
                  ndcDescription: fdaProduct.proprietaryName
                }
              else if (fdaResultDetailLevel === "package")
                return {
                  ...price,
                  ndc: fdaPackage.ndcPackageCode,
                  ndcDescription: fdaPackage.packageDescription
                }
              else return price;
            })
          )))
      : [];

  return nadacPrices;
}
