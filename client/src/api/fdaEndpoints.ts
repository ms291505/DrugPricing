import { createApiPath, parseErrorMessage } from "./api";
import type { FdaProductSearchResponse, FdaProductSearchResult } from "./types";

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

  return (
    { products: body.data }
  );
}
