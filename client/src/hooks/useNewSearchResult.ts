import { useState } from "react";

/**
 * A key for the result on screen, new for each search the user runs, so a toast about it shows
 * once (`SearchResultToast`). Null for the search a restored tab re-runs on load: the user didn't
 * just ask for it, and announcing it on every refresh is noise. Once the search changes, every
 * search counts, including the restored one run again.
 *
 * The key is the search alone, not when its data arrived: a change of dates may or may not fetch,
 * and must not announce the same search twice when it does.
 *
 * Call it once per page and share the key, so the page's toasts agree on what's restored.
 *
 * @param searchParams - the page's last Search; whatever it is on mount counts as restored
 */
export default function useNewSearchResult(searchParams: unknown, isSuccess: boolean): string | null {
  const search = JSON.stringify(searchParams ?? null);
  const [restoredSearch, setRestoredSearch] = useState<string | null>(search);
  if (restoredSearch !== null && search !== restoredSearch) setRestoredSearch(null);
  return isSuccess && restoredSearch === null ? search : null;
}
