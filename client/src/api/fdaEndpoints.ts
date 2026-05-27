import type { FdaProductDetail } from "../types";
import { createApiPath, parseErrorMessage } from "./api";
import type { FdaProductSearchResponse, } from "./types";
import type { FdaProductSearchResult } from "../types";

export const getFdaSearchResults = async (
  proprietaryName: string
): Promise<FdaProductSearchResult> => {
  const params = new URLSearchParams();

  params.append("proprietaryName", proprietaryName);

  const response = await fetch(createApiPath(`fda-products/search?${params}`), {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  const body = await response.json() as unknown as FdaProductSearchResponse;

  const products: FdaProductDetail[] = body.data.map(p => ({
    ...p,
    routeName: p.routeName.length === 0 ? ["N/A"] : p.routeName,
    dosageFormName: !p.dosageFormName ? "N/A" : p.dosageFormName,
  }))

  return (
    { products: products }
  );
}
