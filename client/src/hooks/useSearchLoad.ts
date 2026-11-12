import { useCallback, useState } from "react";
import type { DateWindow } from "../library/dates";
import { nextLoad } from "../library/searchCriteria";
import { useLastAsOfDate } from "./useAppInit";

const sameValue = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * A search tab's applied criteria and what they load (plan: plans/search-filters.md). Both search
 * contexts use it.
 *
 * @param initial - the criteria restored from storage, or a new tab's defaults
 * @param loadRequest - the type's `*LoadRequest`; module-level, so it's stable
 * @param applySearch - the type's `apply*Search`; module-level, so it's stable
 * @returns
 * - `criteria`, the applied criteria. Every field but the text terms is written with
 *   `setCriteria` and applies at once, Dates included; the terms change only through `search`.
 * - `requested`, the request the criteria ask for. Its dates are the window the result is clipped
 *   to. Null without a search, and until app-init settles (its date presets count back from the
 *   last as-of date).
 * - `loaded`, what the query fetches: `requested`, or a wider load that already holds it
 *   (`nextLoad`), so narrowing the dates doesn't fetch.
 * - `lastSearch`, what the user's last Search asked for: the key for the result toasts
 *   (`useNewSearchResult`). Null until then, so a restored tab's re-run doesn't count as a new
 *   result, and neither does a change of dates.
 * - `waiting`, true while a Search waits for app-init.
 */
export default function useSearchLoad<C, F, L extends { dates: DateWindow }>(
  initial: C,
  loadRequest: (criteria: C, lastAsOfDate: number) => L | null,
  applySearch: (applied: C, fields: F) => C,
) {
  const lastAsOfDate = useLastAsOfDate().forSearch;
  const [criteria, setCriteria] = useState(initial);
  const [lastSearch, setLastSearch] = useState<L | null>(null);
  // A Search pressed before app-init settled: it runs, as the user's, once it has.
  const [waiting, setWaiting] = useState(false);

  // Kept as state, and replaced only when its value changes, so a refine change (which makes new
  // criteria) doesn't make a new request object for every consumer.
  const fresh = lastAsOfDate === null ? null : loadRequest(criteria, lastAsOfDate);
  const [requested, setRequested] = useState(fresh);
  if (!sameValue(requested, fresh)) setRequested(fresh);

  // Follows `requested`, keeping a load that already holds it.
  const [held, setHeld] = useState(requested);
  const loaded = nextLoad(held, requested);
  if (loaded !== held) setHeld(loaded);

  if (waiting && lastAsOfDate !== null) {
    setWaiting(false);
    setLastSearch(fresh);
  }

  const search = useCallback((fields: F) => {
    const next = applySearch(criteria, fields);
    setCriteria(next);
    if (lastAsOfDate === null) {
      // Nothing to resolve presets against yet: `requested` follows. Any date tells whether the
      // terms are enough to search on.
      setWaiting(loadRequest(next, 0) !== null);
      return;
    }
    setLastSearch(loadRequest(next, lastAsOfDate));
  }, [applySearch, criteria, lastAsOfDate, loadRequest]);

  return { criteria, setCriteria, search, requested, loaded, lastSearch, waiting };
}
