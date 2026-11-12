import { useCallback, useState } from "react";
import type { DateWindow } from "../library/dates";
import { nextLoad } from "../library/searchCriteria";
import { useLastAsOfDate } from "./useAppInit";

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
 *   to. Null without a search, and until app-init settles, which the presets count back from.
 * - `loaded`, what the query fetches: `requested`, or a wider load that already holds it.
 * - `lastSearch`, the load the user's last Search asked for: null until then, so a restored tab's
 *   re-run doesn't count as a new result (`useNewSearchResult`).
 */
export default function useSearchLoad<C, F, L extends { dates: DateWindow }>(
  initial: C,
  loadRequest: (criteria: C, lastAsOfDate: number) => L | null,
  applySearch: (applied: C, fields: F) => C,
) {
  const lastAsOfDate = useLastAsOfDate();
  const [criteria, setCriteria] = useState(initial);
  const [lastSearch, setLastSearch] = useState<L | null>(null);

  // Kept as state, and replaced only when its value changes, so a refine change (which makes new
  // criteria) doesn't make a new request object for every consumer.
  const fresh = lastAsOfDate === null ? null : loadRequest(criteria, lastAsOfDate);
  const [requested, setRequested] = useState(fresh);
  if (JSON.stringify(requested) !== JSON.stringify(fresh)) setRequested(fresh);

  const loaded = lastSearch ?? requested;

  const search = useCallback((fields: F) => {
    const next = applySearch(criteria, fields);
    setCriteria(next);
    // Before app-init settles there's nothing to resolve presets against; `requested` follows.
    if (lastAsOfDate !== null) setLastSearch(nextLoad(loaded, loadRequest(next, lastAsOfDate)));
  }, [applySearch, criteria, lastAsOfDate, loadRequest, loaded]);

  return { criteria, setCriteria, search, requested, loaded, lastSearch };
}
