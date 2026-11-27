import type { FdaProductDetail } from "../library/types";
import { createApiPath, toApiError } from "./api";
import { mapFdaProductSearchResponse, type AdvancedFdaSearchRequest, type FdaProductSearchResponse, } from "./types";
import type { FdaProductSearchResult } from "../library/types";

export const getAdvancedFdaSearchReqults = async (
  request: AdvancedFdaSearchRequest,
  signal?: AbortSignal,
): Promise<FdaProductSearchResult> => {
  const params = new URLSearchParams();
  params.append("jsonString", JSON.stringify(request));
  const response = await fetch(createApiPath(`fda-products/advanced-search?${params}`), {
    method: "GET",
    signal,
  });

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
