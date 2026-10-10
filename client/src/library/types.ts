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
  classificationForRateSetting: string,
  correspondingGenericNadacPerUnit?: number,
  correspondingGenericEffectiveDate?: Date,
  asOfDate: Date,
  ndcDescriptionLower: string,
  loadedAt: Date,
  createdAt: Date
};

export type NadacPriceChange = {
  packageNdc: string,
  startDate: Date,
  endDate: Date,
  difference: number,
  percentage: number,
}

export type DrugSummary = {
  ndc: string,
  ndcDescription: string,
  averagePrice: number,
  pricingUnit: string,
  minPrice: number,
  maxPrice: number
}

export type Drug = {
  ndc: string,
  ndcDescription: string,
}

export const summarizeNadacPrices = (nadacPrices: NadacPrice[]) => {

  const drugSummaries: DrugSummary[] = Object.entries(
    nadacPrices.reduce((acc, item) => {
      if (!acc[item.ndc]) {
        acc[item.ndc] = {
          total: 0, count: 0, ndcDescription: item.ndcDescription, pricingUnit: item.pricingUnit, minPrice: Infinity, maxPrice: 0
        };
      }
      acc[item.ndc].total += item.nadacPerUnit;
      acc[item.ndc].count += 1;

      acc[item.ndc].minPrice = Math.min(acc[item.ndc].minPrice, item.nadacPerUnit);
      acc[item.ndc].maxPrice = Math.max(acc[item.ndc].maxPrice, item.nadacPerUnit);

      return acc;
    }, {} as Record<string, { total: number; count: number; ndcDescription: string; pricingUnit: string; minPrice: number; maxPrice: number; }>)
  ).map(([ndc, { total, count, ndcDescription, pricingUnit, minPrice, maxPrice }]) => ({
    ndc,
    averagePrice: total / count,
    ndcDescription,
    pricingUnit,
    minPrice,
    maxPrice
  }));

  return drugSummaries;
}

export type DrugDescription = {
  ndc: string,
  ndcDescription: string
}

/**
 * The fields a chart reads from a price. Both live search results (`NadacPrice`) and pinned
 * chart snapshots (see `explorerItems.ts`) provide them.
 */
export type ChartPrice = Pick<NadacPrice, "ndc" | "ndcDescription" | "nadacPerUnit" | "asOfDate" | "pricingUnit">;

export type NadacSearchParams = {
  ndcDescription: string;
  ndc: string;
  minDate: string;
  maxDate: string;
};

export type FdaSearchParams = {
  proprietaryName: string;
};

export type AdvancedFdaSearchParams = {
  proprietaryName: string,
  nonProprietaryName?: string,
  dosageFormNames?: string[],
  routeNames?: string[],
  labelerName?: string,
  productNdc?: string,

  // FDA Package
  includeSamplePackages: boolean,

  // NadacPrice
  includeResultsWNoPrices: boolean,
  pricesAsOfDateStart?: string,
  pricesAsOfDateEnd?: string,
};

export const validateAdvancedFdaSearchParams = (params: AdvancedFdaSearchParams) => {
  const candidateParams = [params.nonProprietaryName, params.proprietaryName, params.productNdc];
  const isValid = candidateParams.some(param => param !== undefined && param.trim() !== "")
  return isValid;
};

export const defaultAdvFdaSearchParams: AdvancedFdaSearchParams = {
  proprietaryName: "",
  includeResultsWNoPrices: false,
  includeSamplePackages: false,
};

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

export type FdaPackageResultInfo = FdaPackageDetail &
{
  productNdc: string,
  dosageFormName: string,
  routeName: string[],
  labelerName: string,
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

export type FdaProductPriceChange = {
  productNdc: string,
  packageNdc: string,
  packageNdcStripped: string,
  priceChange: NadacPriceChange,
}

export function isFdaProductOtc(productTypeName: string) {
  return productTypeName.toLocaleLowerCase() === "human otc drug";
}

export type ResultSelect = ((data: FdaProductSearchResult) => FdaProductSearchResult) | undefined;

/**
 * The FDA results-page filter, stored as what the user *excluded*. Anything not excluded shows,
 * including results that are new since the filter was set (e.g. a restored tab's re-run search),
 * so nothing needs resetting when results arrive. A new search starts from `createFdaResultFilter()`.
 */
export type FdaResultFilter = {
  excludedProductNdcs: string[],
  excludedDosageForms: string[],
  excludedRoutes: string[],
  excludedLabelers: string[],
  excludeOtc: boolean,
  excludeSamplePackages: boolean,
}

/** The list-valued parts of `FdaResultFilter`, each edited by a `SelectFilter`. */
export type FdaResultFilterListKey = "excludedProductNdcs" | "excludedDosageForms" | "excludedRoutes" | "excludedLabelers";

export function createFdaResultFilter(): FdaResultFilter {
  return ({
    excludedProductNdcs: [],
    excludedDosageForms: [],
    excludedRoutes: [],
    excludedLabelers: [],
    excludeOtc: false,
    excludeSamplePackages: false,
  })
}

export function applyFdaResultFilter(
  data: FdaProductSearchResult,
  filter: FdaResultFilter
): FdaProductSearchResult {
  return {
    ...data,
    products: data.products
      .filter(p =>
        !filter.excludedProductNdcs.includes(p.productNdc) &&
        !filter.excludedDosageForms.includes(p.dosageFormName) &&
        // A product shows while any of its routes is still included.
        (p.routeName.length === 0 || p.routeName.some(r => !filter.excludedRoutes.includes(r))) &&
        !(filter.excludeOtc && isFdaProductOtc(p.productTypeName)) &&
        (!filter.excludeSamplePackages || p.fdaPackageDetails.some(pkg => pkg.samplePackage === false)) &&
        !filter.excludedLabelers.includes(p.labelerName)
      )
      .map(p => ({
        ...p,
        fdaPackageDetails: filter.excludeSamplePackages
          ? p.fdaPackageDetails.filter(pkg => pkg.samplePackage === false)
          : p.fdaPackageDetails,
      })),
  };
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

export type TabType = "fda" | "nadac" | "new";

export type WorkspaceTab = {
  id: string;
  type: TabType;
  title: string;
}

export function validateTabTitle(newTitle: string, oldTitle?: string) {
  let isValid = true;

  if (newTitle.trim() === "") isValid = false;

  if (oldTitle && newTitle.trim() === oldTitle) isValid = false;

  return isValid;
}

export type MobileDrawer = {
  isOpen: boolean,
  isClosing: boolean,
}

export const initialMobileDrawer: MobileDrawer = {
  isOpen: false,
  isClosing: false,
}

export type NdcColorMap = Record<string, string>;
