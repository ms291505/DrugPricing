import { splitByPricingUnit, seriesByDate } from "./prices";
import type { ChartPrice, FdaProductDetail, NadacPriceChange, PackagePriceChange } from "./types";

/** One package's prices, under its displayed NDC. */
export type PackagePrices = {
  /** As shown: dashed from the FDA, NADAC's stored form on a NADAC search. */
  packageNdc: string,
  prices: ChartPrice[],
};

/**
 * Whether a change from `oldPrice` to `newPrice` is at least `thresholdPercent` (e.g. 10 or 7.5),
 * compared in tenths of a percent so that $1.00 → $0.90 is 10%, not 9.999…%. A change from $0 is
 * an infinite rise and meets every threshold; a drop to $0 is −100%.
 */
export function meetsThreshold(oldPrice: number, newPrice: number, thresholdPercent: number): boolean {
  if (oldPrice === newPrice) return false;
  if (oldPrice === 0) return true;
  return Math.round(Math.abs((newPrice - oldPrice) / oldPrice) * 1000) >= Math.round(thresholdPercent * 10);
}

/**
 * The changes of at least `thresholdPercent` between one package's consecutive prices. Leaves
 * `prices` as it is: it may be React Query's cached result. A change from $0 has `percentage`
 * `Infinity`, which is never stored or shown.
 */
function flagPackagePriceChanges(prices: ChartPrice[], thresholdPercent: number): NadacPriceChange[] {
  const sorted = [...prices].sort((a, b) => a.asOfDate.getTime() - b.asOfDate.getTime());
  const priceChanges: NadacPriceChange[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const last = sorted[i - 1];
    const current = sorted[i];

    if (last.ndc !== current.ndc) throw new Error("Tried to flag prices from different drug packages.");

    if (!meetsThreshold(last.nadacPerUnit, current.nadacPerUnit, thresholdPercent)) continue;
    const percentage = last.nadacPerUnit === 0 ? Infinity : (current.nadacPerUnit - last.nadacPerUnit) / last.nadacPerUnit;

    priceChanges.push({
      packageNdc: current.ndc,
      startDate: last.asOfDate,
      endDate: current.asOfDate,
      oldPrice: last.nadacPerUnit,
      newPrice: current.nadacPerUnit,
      percentage,
    });
  }

  return priceChanges;
}

/** Flags each package's price changes of at least `thresholdPercent` against its own prices. Both search pages use it. */
export function flagPriceChanges(packages: PackagePrices[], thresholdPercent: number = 10): PackagePriceChange[] {
  return packages.flatMap(({ packageNdc, prices }) => {
    if (new Set(prices.map(price => price.ndc)).size > 1) throw new Error("Tried to flag prices from different drug packages.");
    return splitByPricingUnit(prices).flatMap(group => {
      // A package/date may repeat in old snapshots; use the shared per-date math.
      const points = [...seriesByDate(group.nadacPrices).values()].flat();
      const normalized = points.map(point => ({ ...group.nadacPrices[0], asOfDate: new Date(point.asOfDate), nadacPerUnit: point.average }));
      return flagPackagePriceChanges(normalized, thresholdPercent).map(priceChange => ({ packageNdc, priceChange }));
    });
  });
}

/** FDA products' prices, package by package, under each package's dashed NDC. */
export function fdaPackagePrices(products: FdaProductDetail[]): PackagePrices[] {
  return products.flatMap(product => product.fdaPackageDetails.map(pkg => ({
    packageNdc: pkg.ndcPackageCode,
    prices: pkg.nadacPrices,
  })));
}
