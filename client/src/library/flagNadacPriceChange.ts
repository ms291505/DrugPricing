import type { FdaProductDetail, NadacPrice, NadacPriceChange, PackagePriceChange } from "./types";
import { inWindow, type DateWindow } from "./dates";

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
      oldPrice: last.nadacPerUnit,
      newPrice: current.nadacPerUnit,
      percentage: percentage,
    })

  }

  return priceChanges;
}

export function flagNadacPriceChangeForFdaProducts(
  fdaProducts: FdaProductDetail[],
): PackagePriceChange[] {
  const productPriceChanges: PackagePriceChange[] = [];

  fdaProducts.map(product =>
    product.fdaPackageDetails.map(pkg => {
      const changes = flagNadacPriceChange(pkg.nadacPrices);

      changes.map(change => (productPriceChanges.push({
        packageNdc: pkg.ndcPackageCode,
        priceChange: change
      })))
    }))

  return productPriceChanges;
}

/** Flags the price changes in a NADAC search result, package by package. */
export function flagNadacPriceChangesByPackage(prices: NadacPrice[]): PackagePriceChange[] {
  const byNdc = new Map<string, NadacPrice[]>();
  for (const price of prices) {
    const packagePrices = byNdc.get(price.ndc);
    if (packagePrices) packagePrices.push(price);
    else byNdc.set(price.ndc, [price]);
  }
  // Each group is a new array, so the sort inside `flagNadacPriceChange` leaves `prices` alone.
  return [...byNdc].flatMap(([ndc, packagePrices]) =>
    flagNadacPriceChange(packagePrices).map(priceChange => ({ packageNdc: ndc, priceChange })));
}

export function getAllPricesForFlaggedPackages(change: PackagePriceChange, prices: NadacPrice[]) {

  const values = [...prices.filter(n => n.ndc === change.packageNdc)];

  return values.length > 0 ? values : [];
};

export function percentageChangeToString(percentage: number) {
  return Intl.NumberFormat("default", {
    style: "percent",
    minimumFractionDigits: 1
  }).format(percentage);
}

/**
 * The changes whose date (the first as-of date at the new price) is inside the chart dates, so
 * the price-change cards follow the page's "Chart dates" like the other auto charts.
 */
export function priceChangesInWindow(changes: PackagePriceChange[], dateWindow: DateWindow): PackagePriceChange[] {
  return changes.filter(change => inWindow(change.priceChange.endDate.getTime(), dateWindow));
}
