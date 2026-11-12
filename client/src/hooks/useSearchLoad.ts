import { useCallback, useState } from "react";
import type { DateWindow } from "../library/dates";
import { nextLoad } from "../library/searchCriteria";
import { useLastAsOfDate } from "./useAppInit";

type Options = {
  /**
   * Whether the request needs the last as-of date (its date presets count back from it), so a
   * search waits for app-init. False for a request that ignores it.
   */
  waitForAsOfDate?: boolean,
};

const sameValue = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * A search tab's applied criteria and what they load (plan: plans/search-filters.md). Both search
 * contexts use it.
 *
 * @param initial - the criteria restored from storage, or a new tab's defaults
 * @param loadRequest - the type's `*LoadRequest`; module-level, so it's stable
 * @param applySearch - the type's `apply*Search`; module-level, so it's stable
 * @returns
 * - `criteria`, the applied criteria. Refine fields are written with `setCriteria` and apply at
 *   once; load fields change only through `search`.
 * - `requested`, the request the criteria ask for. Its dates are the window the result is clipped
 *   to. Null without a search, and (unless `waitForAsOfDate` is false) until app-init settles.
 * - `loaded`, what the query fetches: `requested`, or a wider load that already holds it.
 * - `lastSearch`, the load the user's last Search fetched or re-ran: the key for the result
 *   toasts (`useNewSearchResult`). Null until then, so a restored tab's re-run, and narrowing it
 *   without a fetch, don't count as new results.
 * - `waiting`, true while a Search waits for app-init.
 */
export default function useSearchLoad<C, F, L extends { dates: DateWindow }>(
  initial: C,
  loadRequest: (criteria: C, lastAsOfDate: number) => L | null,
  applySearch: (applied: C, fields: F) => C,
  { waitForAsOfDate = true }: Options = {},
) {
  const asOfDates = useLastAsOfDate();
  const lastAsOfDate = waitForAsOfDate ? asOfDates.forSearch : asOfDates.forDisplay;
  const [criteria, setCriteria] = useState(initial);
  // What the user's Searches have loaded; null until the first, when the load is `requested`.
  const [searchedLoad, setSearchedLoad] = useState<L | null>(null);
  const [lastSearch, setLastSearch] = useState<L | null>(null);
  // A Search pressed before app-init settled: it runs, as the user's, once it has.
  const [waiting, setWaiting] = useState(false);

  // Kept as state, and replaced only when its value changes, so a refine change (which makes new
  // criteria) doesn't make a new request object for every consumer.
  const fresh = lastAsOfDate === null ? null : loadRequest(criteria, lastAsOfDate);
  const [requested, setRequested] = useState(fresh);
  if (!sameValue(requested, fresh)) setRequested(fresh);

  if (waiting && lastAsOfDate !== null) {
    setWaiting(false);
    setLastSearch(fresh);
  }

  const loaded = searchedLoad ?? requested;

  const search = useCallback((fields: F) => {
    const next = applySearch(criteria, fields);
    setCriteria(next);
    if (lastAsOfDate === null) {
      // Nothing to resolve presets against yet, and nothing loaded: `requested` follows. Any date
      // tells whether the terms are enough to search on.
      setWaiting(loadRequest(next, 0) !== null);
      return;
    }
    const request = loadRequest(next, lastAsOfDate);
    const load = nextLoad(loaded, request);
    setSearchedLoad(load);
    // A narrowing that didn't fetch isn't a new result, even the first one on a restored tab.
    const narrowedOnly = load !== null && load === loaded && !sameValue(request, loaded);
    if (!narrowedOnly) setLastSearch(load);
  }, [applySearch, criteria, lastAsOfDate, loadRequest, loaded]);

  return { criteria, setCriteria, search, requested, loaded, lastSearch, waiting };
}
