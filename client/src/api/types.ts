import type { NadacPrice, FdaProductDetail, } from "../library/types";

export type UpResponse = {
  up: boolean
}

export type ApiError = {
  name: "ApiError";
  status: number;
  statusText: string;
  message: string;
};

export const makeApiError = (status: number, statusText: string, message?: string): ApiError => ({
  name: "ApiError",
  status,
  statusText,
  message: message ?? `API error: ${status} ${statusText}`,
});

export const isApiError = (error: unknown): error is ApiError =>
  typeof error === "object" &&
  error !== null &&
  (error as ApiError).name === "ApiError";

export type NadacSearchPredicate = {
  field: string,
  operator: string,
  value: string
}

export type NadacPriceResponse = {
  id: number,
  ndc: string,
  ndcDescription: string,
  nadacPerUnit: number,
  effectiveDate: string,
  pricingUnit: number,
  pharmacyTypeIndicator?: string,
  isOtc: boolean,
  explanationCode: Array<string | number>,
  classificationForRateSetting: string,
  correspondingGenericNadacPerUnit?: number,
  correspondingGenericEffectiveDate?: string,
  asOfDate: string,
  ndcDescriptionLower: string,
  loadedAt: string,
  createdAt: string
}

const mapPricingUnit = (pricingUnit: number) => {
  switch (pricingUnit) {
    case 0: return "each";
    case 1: return "milliliter";
    case 2: return "gram";
    default: return "unknown";
  }
}

export const mapNadacPriceResponse = (response: NadacPriceResponse): NadacPrice => ({
  id: response.id,
  ndc: response.ndc,
  ndcDescription: response.ndcDescription,
  nadacPerUnit: response.nadacPerUnit,
  effectiveDate: new Date(response.effectiveDate),
  pricingUnit: mapPricingUnit(response.pricingUnit),
  pharmacyTypeIndicator: response.pharmacyTypeIndicator,
  isOtc: response.isOtc,
  explanationCode: response.explanationCode,
  classificationForRateSetting: response.classificationForRateSetting,
  correspondingGenericNadacPerUnit: response.correspondingGenericNadacPerUnit,
  correspondingGenericEffectiveDate: response.correspondingGenericEffectiveDate
    ? new Date(response.correspondingGenericEffectiveDate)
    : undefined,
  asOfDate: new Date(response.asOfDate),
  ndcDescriptionLower: response.ndcDescriptionLower,
  loadedAt: new Date(response.loadedAt),
  createdAt: new Date(response.createdAt),
});

export type NadacSearchResponse = {

  predicates: Array<NadacSearchPredicate>,
  data: Array<NadacPriceResponse>,
  notices: Array<string>
}

export type NadacSearchResult = {

  prices: Array<NadacPrice>;
  predicates: Array<NadacSearchPredicate>,
  notices: Array<string>
}

type FdaPackageDetailResponse = {
  id: number,
  ndcPackageCode: string,
  packageDescription: string,
  startMarketingDate: string,
  endMarketingDate?: string,
  samplePackage: boolean,
  ndcPackageCodeStripped: string,
  nadacPrices: NadacPriceResponse[]
}

type FdaProductDetailResponse = {
  id: number,
  productId: string,
  productNdc: string,
  productTypeName: string,
  proprietaryName: string,
  proprietaryNameSuffix?: string,
  nonProprietaryName: string[],
  dosageFormName: string,
  routeName: string[],
  startMarketingDate: string,
  endMarketingDate?: string,
  marketingCategoryName: string,
  labelerName: string,
  substanceName: string[],
  strengthNumber: string[],
  strengthUnit: string[],
  pharmClasses: string[],
  deaSchedule?: string,
  listingRecordCertifiedThrough?: string,
  fdaPackageDetails: FdaPackageDetailResponse[]
}

export type FdaProductSearchResponse = {
  data: FdaProductDetailResponse[]
}

const mapFdaPackageResponse = (response: FdaPackageDetailResponse) => (
  {
    id: response.id,
    ndcPackageCode: response.ndcPackageCode,
    packageDescription: response.packageDescription,
    startMarketingDate: new Date(response.startMarketingDate),
    endMarketingDate: response.endMarketingDate ? new Date(response.endMarketingDate) : undefined,
    samplePackage: response.samplePackage,
    ndcPackageCodeStripped: response.ndcPackageCodeStripped,
    nadacPrices: response.nadacPrices.flatMap(p => (mapNadacPriceResponse(p)))
  }
)

const handleDateOrUndefined = (d: string | undefined) => {
  return d ? new Date(d) : undefined
}

export const mapFdaProductSearchResponse = (product: FdaProductDetailResponse) => {
  const result: FdaProductDetail = {
    id: product.id,
    productId: product.productId,
    productNdc: product.productNdc,
    productTypeName: product.productTypeName,
    proprietaryName: product.proprietaryName,
    proprietaryNameSuffix: product.proprietaryNameSuffix,
    nonProprietaryName: product.nonProprietaryName.flatMap(n => (n)),
    dosageFormName: product.dosageFormName,
    routeName: product.routeName.flatMap(r => (r)),
    startMarketingDate: new Date(product.startMarketingDate),
    endMarketingDate: handleDateOrUndefined(product.endMarketingDate),
    marketingCategoryName: product.marketingCategoryName,
    labelerName: product.labelerName,
    substanceName: product.substanceName.flatMap(s => (s)),
    strengthNumber: product.strengthNumber.flatMap(s => (s)),
    strengthUnit: product.strengthUnit.flatMap(s => (s)),
    pharmClasses: product.pharmClasses.flatMap(p => (p)),
    deaSchedule: product.deaSchedule,
    listingRecordCertifiedThrough: handleDateOrUndefined(product.listingRecordCertifiedThrough),
    fdaPackageDetails: product.fdaPackageDetails.flatMap(p => (mapFdaPackageResponse(p)))
  }

  return result;
}

export type AdvancedFdaSearchRequest = {

  // FDA Product
  proprietaryName?: string,
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
}
