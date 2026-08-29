import type { FdaProductDetail, NadacPrice, NadacPriceChange, FdaProductPriceChange } from "./types";

export function flagNadacPriceChange(
  nadacPrices: NadacPrice[],
  threshold: number = 0.10,
): NadacPriceChange[] {

  const priceChanges: NadacPriceChange[] = [];

  const sorted = nadacPrices.sort((a, b) => a.asOfDate.getTime() - b.asOfDate.getTime());

  for (let i = 0; i < sorted.length; i++) {
    const last = sorted[i - 1] ?? null;
    const current = sorted[i];

    if (!last) continue;

    if (last.ndc !== current.ndc) throw new Error("Tried to flag prices from different drug packages.");

    const difference = (current.nadacPerUnit - last.nadacPerUnit);

    const percentage = difference / last.nadacPerUnit;

    if (Math.abs(percentage) < threshold) continue;

    else priceChanges.push({
      packageNdc: current.ndc,
      startDate: last.asOfDate,
      endDate: current.asOfDate,
      difference: difference,
      percentage: percentage,
    })

  }

  return priceChanges;
}

export function flagNadacPriceChangeForFdaProducts(
  fdaProducts: FdaProductDetail[],
): FdaProductPriceChange[] {
  const productPriceChanges: FdaProductPriceChange[] = [];

  fdaProducts.map(product =>
    product.fdaPackageDetails.map(pkg => {
      const changes = flagNadacPriceChange(pkg.nadacPrices);

      changes.map(change => (productPriceChanges.push({
        productNdc: product.productNdc,
        packageNdc: pkg.ndcPackageCode,
        packageNdcStripped: pkg.ndcPackageCodeStripped,
        priceChange: change
      })))
    }))

  return productPriceChanges;
}

export function getAllPricesForFlaggedPackages(change: FdaProductPriceChange, prices: NadacPrice[]) {

  const values = [...prices.filter(n => n.ndc === change.packageNdc)];

  return values.length > 0 ? values : [];
};

export function percentageChangeToString(percentage: number) {
  return Intl.NumberFormat("default", {
    style: "percent",
    minimumFractionDigits: 1
  }).format(percentage);
}
