import { postJson, toApiError } from "./api.ts";
import type { NadacLoad } from "../library/searchCriteria.ts";
import { toDateInput } from "../library/dates.ts";
import { mapNadacPriceResponse, type NadacSearchResponse, type NadacSearchResult } from "./types.ts";

// The server needs both dates and snaps each to a loaded as-of date, so an open end is sent as a
// date beyond every loaded one.
const OPEN_MIN_DATE = "0001-01-01";
const OPEN_MAX_DATE = "9999-12-31";

export const getNadacSearchResults = async (load: NadacLoad, signal?: AbortSignal): Promise<NadacSearchResult> => {
  const response = await postJson("nadac-prices/search", {
    ndcDescription: load.ndcDescription || null,
    ndc: load.ndc || null,
    minDate: load.dates.start === null ? OPEN_MIN_DATE : toDateInput(load.dates.start),
    maxDate: load.dates.end === null ? OPEN_MAX_DATE : toDateInput(load.dates.end),
  }, signal);

  if (!response.ok) {
    throw await toApiError(response);
  }

  const body = await response.json() as unknown as NadacSearchResponse;

  const nadacSearchResult = {
    predicates: body.predicates,
    notices: body.notices,
    prices: body.data.map(r => mapNadacPriceResponse(r))
  } as NadacSearchResult;

  return nadacSearchResult;
};
