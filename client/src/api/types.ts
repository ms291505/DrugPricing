import type { NadacPrice, FdaProductDetail } from "../library/types";

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

// TODO: Move to src/types.ts
export type NadacSearchResult = {

  prices: Array<NadacPrice>;
  predicates: Array<NadacSearchPredicate>,
  notices: Array<string>
}

export type FdaProductSearchResponse = {
  data: FdaProductDetail[]
}

// TODO: Move to src/types.ts
