# Reorganization recommendations

A running list of structural cleanups spotted while working on the chart plan
(`~/.claude/plans/i-have-a-bug-flickering-tide.md`). Each open item says roughly how big it is
and where it fits. When an item is done, move it to **Done** with the PR that did it.

Started during step 4 (time windows), 2026-10-10.

## Open

### Retire the standalone search routes (decided direction, 2026-10-10)

All work is meant to happen in the workspace. `/fda-search` and `/nadac-search` are left over
from earlier versions of the app. They were handy for testing a search page outside the
workspace, but they should go away. What removing them touches:

- `App.tsx`: the two `<Route>`s, and the `FdaTabProvider`/`NadacTabProvider`/`STANDALONE_TAB_IDS`
  imports that only they use.
- `DrugPricingBar.tsx`: the NADAC and FDA nav buttons.
- `library/persist.ts`: `STANDALONE_TAB_IDS` and its entry in `pruneStoredState`'s keep set.
  Once the ids are gone, the next load prunes their saved state
  (`drugpricing.v1.tab.page-fda`/`page-nadac`) on its own, so no cleanup code is needed.
- `AGENTS.md`: the persistence notes that mention the standalone pages.
- Testing: agents (and Chrome checks) have used `/fda-search` as a quick page. A workspace tab
  in single layout is the same page. If a direct link is still wanted, a small
  `/workspace?new=fda` that opens a fresh tab of that type would replace it. **Open question for
  the author:** is that shortcut wanted, or is clicking "new tab" enough?
- With only the workspace, `/about` and `/welcome` left, `AppShell`'s "keep the workspace mounted
  but hidden" switch may simplify. Check before changing: it exists so workspace tabs keep their
  state while About is open.

Size: small to medium. A PR of its own, or folded into the NADAC/FDA parity plan.

### Medium (its own small PR)

1. **Split `library/types.ts`.** It mixes NADAC types, FDA types, workspace types and logic
   (`applyFdaResultFilter`, `summarizeNadacPrices`, `validateTabTitle`). Split it by domain
   (`nadac.ts`, `fda.ts`, `workspace.ts`), with the filter logic next to the FDA types.
2. **`ExplorerItemsContext` now holds more than items:** step 4 added the page's chart dates and
   the Match scale toggle. Consider renaming it to `ExplorerContext` (or splitting out a small
   chart-settings context) so its name matches its job. It's a pure rename across about 15
   files, kept out of step 4 so the diff stays readable.
3. **`/api/app-init` returns route and dosage-form names the client never uses.** Either use them
   (autocomplete in the FDA search form) or drop them from the response. As of step 4 the client
   uses only the date range.
4. **`/api/fda-products/search` has no client caller.** Step 4 deleted the unused
   `getFdaSearchResults`, and the client uses only `advanced-search`. Decide whether the simple
   endpoint stays as public API or goes.

### Belongs to the NADAC/FDA parity plan

5. **The NADAC page copies query results into context** (`setData` in a `useEffect` in
   `NadacSearch`), where the FDA page derives everything from `useQuery`. Deriving would remove
   the `data`/`setData` state and a render with stale data.
6. **Rename `SearchContext` → `NadacSearchContext`** (the TODO at the top of the file).
7. **One Page Tools shell for both pages.** `FdaPageTools` and `VizTools` now share Add Chart and
   Chart dates but duplicate the panel layout, heading and section styles.

## Done

Done in step 4 (time windows):

- **Deleted dead client code:** `MuiLineViz`/`MuiBarViz` and the `@mui/x-charts` dependency,
  `fdaData`/`setFdaData` in `FdaSearchContext`, `getFdaSearchResults`, `nadacPriceToDrug.ts`,
  `useOnScreen.ts`, the unused `Drug`/`DrugDescription` types, and the unused `border` prop on
  the charts.
- **Moved the shared charts** (`LineViz`, `BarViz`, `UnitSplit`, `BarVizToolTipLabel`) from
  `NadacSearch/` to `Components/Charts/`.
- **One home for date helpers:** `library/dates.ts`. `AGENTS.md` now says every date display
  goes through its UTC helpers.
- **`useNadacSearch` has the same `staleTime` as `useFdaSearch`,** so returning to a tab doesn't
  refetch.
- **The bar's ABOUT button linked to `/`,** which the catch-all route redirects to
  `/workspace`, so it never showed About. It now links to `/about`.
- **Memoized `FdaExplorer`'s derived prices and price-change flags,** which used to be rebuilt on
  every render, including each change of the chart dates.
