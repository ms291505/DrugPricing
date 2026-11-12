export type NadacPrice = {
  id: number,
  ndc: string,
  ndcDescription: string,
  nadacPerUnit: number,
  effectiveDate: Date,
  pricingUnit: string,
  pharmacyTypeIndicator?: string,
  isOtc: boolean,
  explanationCode: Array<string | number>,
  classificationForRateSetting: NadacClassification,
  correspondingGenericNadacPerUnit?: number,
  correspondingGenericEffectiveDate?: Date,
  asOfDate: Date,
  ndcDescriptionLower: string,
  loadedAt: Date,
  createdAt: Date
};

/**
 * NADAC's `classificationForRateSetting`: `G` is generic, and `B`, `B_ANDA` and `B_BIO` are all
 * brand. "unknown" for a value the client doesn't know.
 */
export type NadacClassification = "G" | "B" | "B_ANDA" | "B_BIO" | "unknown";

export type NadacPriceChange = {
  packageNdc: string,
  startDate: Date,
  endDate: Date,
  /** The last price before the change and the first after it. */
  oldPrice: number,
  newPrice: number,
  percentage: number,
}

/**
 * The fields a chart reads from a price. Both live search results (`NadacPrice`) and pinned
 * chart snapshots (see `explorerItems.ts`) provide them.
 */
export type ChartPrice = Pick<NadacPrice, "ndc" | "ndcDescription" | "nadacPerUnit" | "asOfDate" | "pricingUnit">;

export type FdaPackageDetail = {
  id: number,
  ndcPackageCode: string,
  packageDescription: string,
  startMarketingDate: Date,
  endMarketingDate?: Date,
  samplePackage: boolean,
  ndcPackageCodeStripped: string,
  nadacPrices: NadacPrice[]
}

export type FdaProductDetail = {
  id: number,
  productId: string,
  productNdc: string,
  productTypeName: string,
  proprietaryName: string,
  proprietaryNameSuffix?: string,
  nonProprietaryName: string[],
  dosageFormName: string,
  routeName: string[],
  startMarketingDate: Date,
  endMarketingDate?: Date,
  marketingCategoryName: string,
  labelerName: string,
  substanceName: string[],
  strengthNumber: string[],
  strengthUnit: string[],
  pharmClasses: string[],
  deaSchedule?: string,
  listingRecordCertifiedThrough?: Date,
  fdaPackageDetails: FdaPackageDetail[]
}

export type FdaProductSearchResult = {
  products: FdaProductDetail[]
}

/** A flagged price change and the package it's on, as its card titles it. */
export type PackagePriceChange = {
  /** As shown: dashed from the FDA, NADAC's stored form on a NADAC search. */
  packageNdc: string,
  priceChange: NadacPriceChange,
}

export function isFdaProductOtc(productTypeName: string) {
  return productTypeName.toLocaleLowerCase() === "human otc drug";
}

export type FdaResultDetailLevel = "product" | "package";

export function resultDetailLevelToLabel(level: FdaResultDetailLevel) {
  switch (level) {
    case "product":
      return "Product";
    case "package":
      return "Package";
  }
}

export type LayoutMode = "single" | "split-2" | "split-4";

export type MobileDrawer = {
  isOpen: boolean,
  isClosing: boolean,
}

export const initialMobileDrawer: MobileDrawer = {
  isOpen: false,
  isClosing: false,
}
