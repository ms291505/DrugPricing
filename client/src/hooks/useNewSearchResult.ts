import { useState } from "react";

/**
 * A key for the result on screen, new each time a search returns, so a toast about it shows once
 * (`SearchResultToast`). Null for the search a restored tab re-runs on load: the user didn't just
 * ask for it, and announcing it on every refresh is noise.
 *
 * @param searchParams - the page's current search; whatever it is on mount counts as restored
 */
export default function useNewSearchResult(searchParams: unknown, isSuccess: boolean, dataUpdatedAt: number): string | null {
  const search = JSON.stringify(searchParams ?? null);
  const [restoredSearch] = useState(search);
  return isSuccess && search !== restoredSearch ? `${search}@${dataUpdatedAt}` : null;
}
