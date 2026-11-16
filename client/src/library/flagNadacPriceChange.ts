import { splitByPricingUnit, seriesByDate } from "./prices";
import type { ChartPrice, FdaProductDetail, NadacPrice, NadacPriceChange, PackagePriceChange } from "./types";

/** One package's prices, under the NDC its price-change cards show. */
export type PackagePrices = {
  /** As shown: dashed from the FDA, NADAC's stored form on a NADAC search. */
  packageNdc: string,
  prices: ChartPrice[],
};

/**
 * The changes of at least `threshold` between one package's consecutive prices. Leaves `prices`
 * as it is: it may be React Query's cached result.
 */
function flagPackagePriceChanges(prices: ChartPrice[], threshold: number): NadacPriceChange[] {
  const sorted = [...prices].sort((a, b) => a.asOfDate.getTime() - b.asOfDate.getTime());
  const priceChanges: NadacPriceChange[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const last = sorted[i - 1];
    const current = sorted[i];

    if (last.ndc !== current.ndc) throw new Error("Tried to flag prices from different drug packages.");

    if (current.nadacPerUnit === last.nadacPerUnit) continue;
    const percentage = (current.nadacPerUnit - last.nadacPerUnit) / last.nadacPerUnit;
    if (Math.abs(percentage) < threshold) continue;

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

/** Flags each package's price changes against its own prices. Both search pages use it. */
export function flagPriceChanges(packages: PackagePrices[], threshold: number = 0.10): PackagePriceChange[] {
  return packages.flatMap(({ packageNdc, prices }) => {
    if (new Set(prices.map(price => price.ndc)).size > 1) throw new Error("Tried to flag prices from different drug packages.");
    return splitByPricingUnit(prices).flatMap(group => {
      // A package/date may repeat in old snapshots; use the shared per-date math.
      const points = [...seriesByDate(group.nadacPrices).values()].flat();
      const normalized = points.map(point => ({ ...group.nadacPrices[0], asOfDate: new Date(point.asOfDate), nadacPerUnit: point.average }));
      return flagPackagePriceChanges(normalized, threshold).map(priceChange => ({ packageNdc, priceChange }));
    });
  });
}

/** A NADAC result's prices, package by package (a NADAC NDC is a package). */
export function nadacPackagePrices(prices: NadacPrice[]): PackagePrices[] {
  const byNdc = new Map<string, NadacPrice[]>();
  for (const price of prices) {
    const packagePrices = byNdc.get(price.ndc);
    if (packagePrices) packagePrices.push(price);
    else byNdc.set(price.ndc, [price]);
  }
  return [...byNdc].map(([packageNdc, packagePrices]) => ({ packageNdc, prices: packagePrices }));
}

/** FDA products' prices, package by package, under each package's dashed NDC. */
export function fdaPackagePrices(products: FdaProductDetail[]): PackagePrices[] {
  return products.flatMap(product => product.fdaPackageDetails.map(pkg => ({
    packageNdc: pkg.ndcPackageCode,
    prices: pkg.nadacPrices,
  })));
}
