# Future work

Work that hasn't been done yet: directions the author has decided on, cleanups worth making, and
feature ideas that should shape today's structure. Items say roughly how big they are and where
they fit. When something is done, delete it here. The code and its PR are the record.

## Decided

### Retire the standalone search routes (2026-10-10)

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
- **Replace them with a route shortcut (decided 2026-10-10):** `/workspace?new=fda` (or
  `?new=nadac`) opens a fresh workspace tab of that type and shows it, so agents and Chrome checks
  still get a one-URL way to a search page. After creating the tab, replace the URL with plain
  `/workspace` (`navigate(..., { replace: true })`). Otherwise every reload, with the workspace
  persisted, adds another tab. Dev runs under `StrictMode`, which runs effects twice, so guard
  against creating two tabs (e.g. a ref, or create the tab while reading the initial
  workspace rather than in an effect). Ignore unknown types. Testing restore after a reload then
  happens on that workspace tab, which is closer to real use than the standalone pages were.
- **Build it as a public link format, not a dev shortcut.** The author wants the same links
  later for content: a blog post that opens a tab with a search already run, or links from a
  "popular searches" / "recent movers" list. So:
  - Let a link carry the search as well as the type, in readable params
    (`/workspace?new=fda&name=eliquis`, `?new=nadac&ndc=3089321&from=2025-10-07`), not a JSON
    blob. A blog link should read as what it opens.
  - Treat the params as a contract. Published links can't be updated, so old params must keep
    working (add new ones, never repurpose them), like the storage `VERSION` rule.
  - URL input is untrusted. Validate it with the same per-field validators `persist.ts` uses for
    saved tab state, and fall back to a blank tab of that type.
  - Consider focusing an existing tab with the same search instead of adding a duplicate, so
    following the same link twice doesn't stack up tabs.
- **Phones have no navigation off the workspace.** The app bar is hidden below `md`, so
  `/about` and `/welcome` (and today the standalone pages) offer no way back to the workspace or
  to Settings. Once only those two routes remain, give them a phone header with a link back to
  the workspace.
- With only the workspace, `/about` and `/welcome` left, `AppShell`'s "keep the workspace mounted
  but hidden" switch may simplify. Check before changing: it exists so workspace tabs keep their
  state while About is open.

Size: small to medium. A PR of its own, or folded into the NADAC/FDA parity plan.

## Cleanups

### Each a small PR of its own

- **Split `library/types.ts`.** It mixes NADAC types, FDA types, workspace types and logic
  (`applyFdaResultFilter`, `summarizeNadacPrices`, `validateTabTitle`). Split it by domain
  (`nadac.ts`, `fda.ts`, `workspace.ts`), with the filter logic next to the FDA types.
- **`ExplorerItemsContext` now holds more than items:** step 4 of the chart plan added the page's
  chart dates. Consider renaming it to `ExplorerContext` (or splitting out a small
  chart-settings context) so its name matches its job. It's a pure rename across about 15 files.
- **`/api/app-init` returns route and dosage-form names the client never uses.** Either use them
  (autocomplete in the FDA search form) or drop them from the response. The client uses only the
  date range.
- **The drawer tab's ⋮ menu still holds MUI's sample items** (Profile, My account, Logout in
  `DrawerTab.tsx`). Replace them with real tab actions (rename, close, change type) or remove the menu.
- **Page Tools is cramped at 1024px with the permanent drawer.** The column is about 170px wide:
  the From/To date inputs truncate, the OTC/Sample checkbox labels wrap to three lines, and the
  bar chart beside it leaves a large empty area. The `md: 3`/`md: 9` split needs a breakpoint
  that accounts for the drawer, or Page Tools should move above the cards there.
- **`/api/fda-products/search` has no client caller.** The client uses only `advanced-search`.
  Decide whether the simple endpoint stays as public API or goes.
- **The FDA search toast belongs to the fetch, not the search.** `useFdaSearch` wraps its
  `queryFn` in `toast.promise`, so any refetch shows "Searching FDA products…", not only a search
  the user ran. Refetch on focus and on reconnect are off for now (PR 12), which hides the burst
  of one toast per FDA tab. Show the toast only for a search the user starts (from
  `FdaSearchTool`'s submit, or by watching the query's fetch only after a submit), and decide
  whether the NADAC search, which has no toast, should get the same one.
- **The client bundle is over 500 kB,** and `npm run build` warns about the chunk size. Split it
  (lazy routes, or a manual chunk for MUI X and recharts) once load time matters.

### For the NADAC/FDA parity plan

- **The NADAC page copies query results into context** (`setData` in a `useEffect` in
  `NadacSearch`), where the FDA page derives everything from `useQuery`. Deriving would remove
  the `data`/`setData` state and a render with stale data.
- **Rename `SearchContext` → `NadacSearchContext`** (the TODO at the top of the file).
- **One Page Tools shell for both pages.** `FdaPageTools` and `VizTools` share Add Chart and
  Chart dates but duplicate the panel layout, heading and section styles.

## Ideas

### Percent-change charts for comparing trends across prices (2026-10-11)

"Match scale" puts charts on one dollar axis, which only helps when their prices are
comparable. To compare *trends* between drugs at very different prices (a $0.25 generic and a
$6,700 brand), a line chart could plot each series as the percent change since the start of its
dates, so every line starts at 0% and shows how far it moved. It would be a chart option
(dollars or % change) on line charts, stored on pinned items. Points to settle when it's built:

- the base point when a series starts later than the window;
- how the product-level min–max band translates;
- the axis rule: the exaggeration cap is defined for dollar axes, and needs a percent
  equivalent.

### More user chart settings (2026-10-11)

The Settings panel (gear in the app bar) exists and holds the bar chart style. Two more chart
rules from step 5 of the chart plan are constants today, and could join it:

- **Y-axis exaggeration cap.** Fitted price axes may exaggerate a change at most
  `MAX_AXIS_EXAGGERATION` times (4: a 10% change fills at most 40% of the chart height). A user
  might prefer a stricter or looser axis, or a $0 baseline.
- **Series colors: fixed or resolved.** Each NDC prefers a color from its place in the unfiltered
  search result. Today, clashes among the visible series are resolved once per page, so no two
  visible series share a color. The alternative is "an NDC always keeps its color", even if two
  visible series then match.

### Chart keyboard shortcuts (2026-10-12)

Charts move one week per ←/→ press, through recharts' `accessibilityLayer`. Home/End and
PageUp/PageDown (by month) would help on long series. They are blocked on recharts exposing a way
to set the active tooltip index: `Tooltip defaultIndex` is ignored once the chart has been used,
and the keyboard action is internal. Don't build them by turning off `accessibilityLayer`,
dispatching synthetic keys, or importing recharts' internal store. Revisit when recharts adds an
API.

The same API would fix the bar charts' direction. Recharts reverses ←/→ for every direction except
left-to-right, so on the vertical bar charts → moves up a row and ← moves down. The bar summary's
keyboard hint says so; `reversed` with reversed data doesn't help, since bottom-to-top is reversed too.

### Shorter readout on charts with many series (2026-10-12)

The screen-reader readout (`chartReadout.ts`) reads every shown series at each point: 7 NDCs on
humira, 15 on a metformin pin, on every arrow press. If that proves tiring in VoiceOver, read the
top few and "and N more"; View data still has the full table.

### Popular searches and recent movers

The author would like to show popular searches or recent price movers, linking each to a
workspace tab (see the link format under **Decided**). Two consequences for current structure:

- **Price-change detection is client-only today** (`flagNadacPriceChange.ts`, run on each FDA
  result). A "recent movers" list across all drugs needs it on the server, most likely computed
  after each NADAC load (ETL or a SQL view) and served by an endpoint. Then client and server
  must agree on the rule (the 10% threshold, consecutive as-of dates), so give it one written
  definition before there are two implementations.
- **"Popular searches" needs search counts,** which nothing records today. That is a server
  addition, and a privacy decision about what gets logged.
