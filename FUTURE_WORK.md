# Future work

Work that hasn't been done yet: directions the author has decided on, cleanups worth making,
feature ideas that should shape today's structure, and the author's own notes. Items say roughly how big they are and where
they fit. When something is done, delete it here. The code and its PR are the record.

## Decided

### Usability round from the user-testing notes (2026-11-01)

Goal: make the core flow usable (search, results table, chart and compare) before adding
anything new. Decided in an interview about the notes under **Author's notes**, to ship as focused PRs to
`dev` in this order:

1. **Pinned-chart performance.** It hurts when hovering and scrolling, and with many tabs. Profile
   first (3 tabs × about 10 pins), then:
   - split `ExplorerItemsContext` into narrow contexts, and `memo` the pinned cards (a change of
     the page dates, or the 2s add highlight, re-renders every pinned chart today). The split
     settles the Cleanups item about the context's name: name the new contexts for their jobs;
   - memoize each chart's derived data;
   - debounce the tab-state saves, which stringify every pin's full history on each change;
   - mount charts only near the viewport.
2. **A Results section replaces Page Tools on both pages.** One framed section, "Results:
   <search>", holds a toolbar (Dates, the filters, and Product/Package on FDA), then the results
   table, then the auto charts. Pinned sits below it with a note that filters and dates don't
   change pins.
   - Dates are the *results'* dates. They set the window for new **Latest / Average / Min /
     Max** columns in every results table (from `summarizePrices`, so they match the bar chart;
     "—" for no prices in the window), and for the auto charts. Every table has Latest,
     Min and Max already (`ResultTables/priceColumns.tsx`, Average left out on purpose), over
     all loaded dates. Rows stay when they have no
     prices in the window.
   - The Dates control gets a **Custom** preset. Typing dates selects it. Picking another
     preset keeps the typed dates, so Custom can be switched back on.
   - Add Chart becomes **Chart selected** (Line/Bar) on the results table.
   - NADAC's Drug filter narrows the table and the auto charts too, like FDA's filters.
   - This settles two Cleanups items, "Page Tools is cramped at 1024px" and "One Page Tools
     shell for both pages". Delete them with it.
3. **Docked chart readout instead of floating tooltips.** Hover or touch picks a date. The
   values show in a fixed box above the plot (recharts' `Tooltip` `portal`), with a max height
   and its own scroll.
   - Click or tap locks a date, and a second click or Esc unlocks it.
   - Don't use recharts' `trigger="click"`: it can't be dismissed, and after one click arrow keys
     no longer move the readout.
4. **Mixed units become separate cards,** everywhere: auto charts, Pin and Chart selected. A
   toast says why there are several. Pins saved earlier with mixed units still render split.

Out of scope for now: suggested searches (e.g. "GLP-1 Drugs") in the tab creator.

### Search autocomplete with misspelling suggestions (2026-11-02)

Plan: [plans/autocomplete.md](plans/autocomplete.md). Suggestions as the user types in the NADAC
Description, FDA Brand Name and a new FDA Generic Name field, including likely corrections of
misspellings ("eliqus" → ELIQUIS) under "Did you mean". Picking one fills the field; Search
still runs the search. Built on pg_trgm: a materialized view of FDA names (refreshed by both ETL
paths) and the existing trigram index on `DrugPackages`, served by two `suggest` endpoints.
Labeler, dosage form and route fields are out of scope.

Size: medium. One PR, or two (database + server, then client).

## Cleanups

### Each a small PR of its own

- **Split `library/types.ts`.** It mixes NADAC types, FDA types, workspace types and logic
  (`applyFdaResultFilter`, `validateTabTitle`). Split it by domain
  (`nadac.ts`, `fda.ts`, `workspace.ts`), with the filter logic next to the FDA types.
- **`ExplorerItemsContext` now holds more than items:** step 4 of the chart plan added the page's
  chart dates. Consider renaming it to `ExplorerContext` (or splitting out a small
  chart-settings context) so its name matches its job. It's a pure rename across about 15 files.
  Step 1 of the usability round (under **Decided**) splits this context, so do it there.
- **`/api/app-init` returns route and dosage-form names the client never uses.** Either use them
  (autocomplete in the FDA search form) or drop them from the response. The client uses only the
  date range.
- **The tab FAB's Close Tab and Minimize drop keyboard focus** (`TabContextFab.tsx`, found in PR
  13's review). Each visible tab renders its own FAB (`TabInstance`). Closing or minimizing the tab
  unmounts that FAB and its menu, so focus lands on `<body>`. The drawer rows already handle this
  (`DrawerTabList` focuses the row of the tab `removeTab` returns). Give the FAB the same
  treatment: after Close, focus the replacement tab's FAB, or its drawer row when that tab is a
  blank "new" tab with no FAB. After Minimize, the pane is empty, so focus its drawer row. On a
  phone the drawer is closed, so a drawer row isn't a target there. Small.
- **`SettingsContext.tsx` isn't a Fast Refresh boundary.** It exports the context next to the
  provider, so every hot update of it or of `library/settings.ts` re-creates the context and
  re-runs its importers (Vite logs `Could not Fast Refresh ("SettingsContext" export is
  incompatible)`). Move the context and its hook out of the provider's module, as
  `Context/workspaceContexts.ts` does for the workspace, with a null default. Dev-only, small.
- **Page Tools is cramped at 1024px with the permanent drawer.** The column is about 170px wide:
  the From/To date inputs truncate, the OTC/Sample checkbox labels wrap to three lines, and the
  bar chart beside it leaves a large empty area. The `md: 3`/`md: 9` split needs a breakpoint
  that accounts for the drawer, or Page Tools should move above the cards there. Superseded by
  step 2 of the usability round (the Results section replaces Page Tools).
- **`/api/fda-products/search` has no client caller.** The client uses only `advanced-search`.
  Decide whether the simple endpoint stays as public API or goes.
- **The client bundle is over 500 kB,** and `npm run build` warns about the chunk size. Split it
  (lazy routes, or a manual chunk for MUI X and recharts) once load time matters.
- **The price columns' number filters ignore units.** A column-menu filter such as Latest Price
  `> 0.05` compares $/each with $/mL (`ResultTables/priceColumns.tsx`). Sorting already groups by
  unit (`compareUnitPrices`). Make the filters unit-aware (a custom filter operator that also
  picks the unit), or set `filterable: false` on the three price columns.
- **Lint for unused exports** (`knip` or `ts-prune`). PR #18 removed four unused exports by hand
  and still left a dead copy of `splitByPricingUnit` behind; TypeScript doesn't flag either.

### For the NADAC/FDA parity plan

- **The NADAC page copies query results into context** (`setData` in a `useEffect` in
  `NadacSearch`), where the FDA page derives everything from `useQuery`. Deriving would remove
  the `data`/`setData` state and a render with stale data.
- **Rename `SearchContext` → `NadacSearchContext`** (the TODO at the top of the file).
- **One Page Tools shell for both pages.** `FdaPageTools` and `VizTools` share Add Chart and
  Chart dates but duplicate the panel layout, heading and section styles. Superseded by step 2
  of the usability round: one Results section on both pages.

## Ideas

### Self-hosted observability (2026-11-03)

Plan: [plans/observability.md](plans/observability.md). Instrument the API once with
OpenTelemetry (exporter off until `OTEL_EXPORTER_OTLP_ENDPOINT` is set), have the ETL ping a
self-hosted Healthchecks so a failed or missing weekly run alerts, and run a Grafana stack on the
existing Pi with memory caps on every container. Measure the ETL's memory peak first.

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
workspace tab (see **Linkable search results**). Two consequences for current structure:

- **Price-change detection is client-only today** (`flagNadacPriceChange.ts`, run on each FDA
  and NADAC result). A "recent movers" list across all drugs needs it on the server, most likely computed
  after each NADAC load (ETL or a SQL view) and served by an endpoint. Then client and server
  must agree on the rule (the 10% threshold, consecutive as-of dates), so give it one written
  definition before there are two implementations.
- **"Popular searches" needs search counts,** which nothing records today. That is a server
  addition, and a privacy decision about what gets logged.

### Linkable search results

Links that open a workspace tab with a search already run, for people to look at or start a tab
from: a blog post with example searches, or entries in a "popular searches" / "recent movers"
list. Something like `/workspace?new=fda&name=eliquis` or
`?new=nadac&ndc=3089321&from=2025-10-07`. If it gets built:

- Readable params, not a JSON blob: a link should read as what it opens.
- The params are a contract. Published links can't be updated, so old params must keep working
  (add new ones, never repurpose them), like the storage `VERSION` rule.
- URL input is untrusted. Validate it with the per-field validators `persist.ts` uses for saved
  tab state, and fall back to a blank tab of that type.
- Replace the URL with plain `/workspace` after creating the tab (`navigate(..., { replace: true })`),
  or every reload adds another tab. Dev's `StrictMode` runs effects twice, so guard against
  creating two.
- Following the same link twice could focus the existing tab instead of adding a duplicate.

## Author's notes

The author's own notes from using the app and thinking ahead. They aren't decisions: ask the
author before planning work from them.

### Notes from user testing (2026-10-17)

On this date I used the web app and took notes on improvements I'd like to see as a user.
What was decided from them is under **Decided**, in "Usability round from the user-testing
notes".

- Date inputs for the page filters: This probably needs to be a custom filter that is toggled on an off with a button, rather than something that's directly applied to the data when values are entered. The button probably should toggle to active when a date is selected, so users don't have to click it to toggle it on. Users wouldn't enter a date if they didn't want to start using it. Then it becomes something that can be switched between along with the default time windows provided. Toggling it on and off wouldn't clear the entered dates. Currently using one of the default options after entering dates clears the user inputs.
- The tooltip for the line charts can get very long, extending beyond the chart. This causes strange scroll issues for the page. Is there a way for the tooltip to have a max height and be scrollable itself?
- Page tools is just strange... Adding a chart should probably come from the table not page tools. It's hard to understand what page tools and filters are supposed to be... The intent is to filter the results table, really... Not the whole page. Same issue for both search types.
- We need pricing data in the results tables: Average price, latest price, min price and max price. The NADAC table has this already, except for latest price. Look, overall I think average price over time is not super useful, but it should be available in case a user wants it for some reason.
- Tooltips for all the charts should only appear on a click. I think this will really clean things up a bit. Right now they're too floaty and almost get in the way of things. It might improve performance too.
- The app really struggles when the user starts to pin charts and is really getting to work trying to compare things. Did the performance improvement for tab switching mess this up? I didn't do enough testing before to determine if this impacted it.
- I think a really good use case for this app is users exploring the price differences and changes for Wegovy, Ozempic, Mounjaro, Zepbound, and Rybelsus. This shows some interesting pain points for users:
  - When something is mixed units, it should probably just be different explorer items (aka completely different charts) instead of a split chart as one item. A toast can explain why multiple charts were added. This makes it easier to compare the per each version of Wegovy to Rybelsus.

### Workspace redo (2026-11-01)

The Workspace has gone in a direction that probably isn't the best place to be. A shouldn't be a search. A tab should be a collection of results and charts
created by a user and stored for comparison. A search is really a tool. People can use the app and simply perform a search and look around a bit, that would be the
fda search and nadac search routes. The workspace is for when people want to collect results for notes and comparison. They add results using a search. This is
where the Collection idea was going before development on that stopped.

When a new tab is created, users should be asked how they want to add data: which search they want to use. One they pick it probably opens a modal with the search in it.
Users can then add results tables and charts to their collection (aka tab).

Auto charts are now essentially recommended additions to the collection in this context.

Eventually we can add "starting points" for tabs a user might want to see or start with. They'll also be a demo. GLP-1 drugs might be a good starting point.

The current Collection might be a good starting point, but it just uses PinnedSection and has a wonky mailbox design to get items to it. The whole workspace
context needs to be rethought, so probably no need to stick to this mailbox design. However, users should be able to create a workspace tab from the basic search endpoints if they want to start there and then do something more complex. Because of that the workspace context probably needs to wrap around the whole app like it essentially does now.

The Collections proof of concept (`Components/Collection/`, disabled in the tab creator) stays in
the code until then. It is an early step toward this.
