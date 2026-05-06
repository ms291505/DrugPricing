import { createApiPath, parseErrorMessage } from "./api.ts";
import { mapNadacPriceResponse, type NadacSearchResponse, type NadacSearchResult } from "./types.ts";

export const getNadacSearchResults = async (
  ndcDescription?: string,
  ndc?: string,
  minDate?: Date,
  maxDate?: Date
): Promise<NadacSearchResult> => {
  const params = new URLSearchParams();

  if (ndcDescription) params.append("ndcDescription", ndcDescription);
  if (ndc) params.append("ndc", ndc);
  if (minDate) params.append("minDate", minDate.toISOString().split("T")[0]);
  if (maxDate) params.append("maxDate", maxDate.toISOString().split("T")[0]);

  const response = await fetch(createApiPath(`nadac-prices/search?${params}`), {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  const body = await response.json() as unknown as NadacSearchResponse;

  const nadacSearchResult = {
    predicates: body.predicates,
    notices: body.notices,
    prices: body.data.map(r => mapNadacPriceResponse(r))
  } as NadacSearchResult;

  return nadacSearchResult;
};
