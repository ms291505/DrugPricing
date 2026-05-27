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

export type DrugSummary = {
  ndc: string,
  ndcDescription: string,
  averagePrice: number,
  pricingUnit: string,
  minPrice: number,
  maxPrice: number
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

export type Drug = {
  ndc: string,
  ndcDescription: string
}

export type LineChart = {
  type: "line",
  name?: string,
  nadacPrices: NadacPrice[],
  id: string
}

export type BarChart = {
  type: "bar",
  name?: string,
  nadacPrices: NadacPrice[],
  id: string
}

export type NadacSearchParams = {
  ndcDescription: string;
  ndc: string;
  minDate: string;
  maxDate: string;
};

export type FdaSearchParams = {
  propreitaryName: string;
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

export function isFdaProductOtc(productTypeName: string) {
  return productTypeName.toLocaleLowerCase() === "human otc drug";
}

export type ResultSelect = ((data: FdaProductSearchResult) => FdaProductSearchResult) | undefined;

export type FdaResultFilter = {
  dosageForms: string[],
  routes: string[],
  includeOtc: boolean | null,
  labelers: string[],
}

export function createFdaResultFilter(): FdaResultFilter {
  return ({
    dosageForms: [],
    routes: [],
    includeOtc: null,
    labelers: []
  })
}

export function applyFdaResultFilter(
  data: FdaProductSearchResult,
  filter: FdaResultFilter
): FdaProductSearchResult {
  return {
    ...data,
    products: data.products.filter(p =>
      filter.dosageForms.includes(p.dosageFormName) &&
      p.routeName.some(r => filter.routes.includes(r)) &&
      (
        filter.includeOtc
          ? true
          : isFdaProductOtc(p.productTypeName) === false
      ) &&
      filter.labelers.includes(p.labelerName)
    ),
  }
}
