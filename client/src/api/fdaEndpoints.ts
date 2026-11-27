import type { FdaProductDetail } from "../library/types";
import { postJson, toApiError } from "./api";
import { mapFdaProductSearchResponse, type AdvancedFdaSearchRequest, type FdaProductSearchResponse, } from "./types";
import type { FdaProductSearchResult } from "../library/types";

export const getAdvancedFdaSearchReqults = async (
  request: AdvancedFdaSearchRequest,
  signal?: AbortSignal,
): Promise<FdaProductSearchResult> => {
  const response = await postJson("fda-products/advanced-search", request, signal);

  if (!response.ok) {
    throw await toApiError(response);
  }

  const body = await response.json() as unknown as FdaProductSearchResponse;

  const products: FdaProductDetail[] = body.data.map(p => ({
    ...mapFdaProductSearchResponse(p),
    routeName: p.routeName.length === 0 ? ["N/A"] : p.routeName,
    dosageFormName: !p.dosageFormName ? "N/A" : p.dosageFormName,
  }))

  return (
    { products: products }
  );
}
