# Future work

This backlog records agreed work, cleanup opportunities and ideas. Remove an entry when
it ships. The code and pull request preserve the implementation history.

## Decided

### FDA strength and price activity filters, and a labeler search (2026-11-27)

Plan: [docs/plans/fda-strength-activity-labeler.md](plans/fda-strength-activity-labeler.md).
Strength and Price activity (Dropped, Rose, Dipped or spiked, Stable, Insufficient history) are
new FDA refine filters. Labeler is a new load field, a combo box that narrows a brand or
generic name search to the companies picked; a labeler alone isn't a search (decided
2026-11-27). The server groups the 7,821 labeler spellings into about 5,100 labelers by
normalized name and labeler code and caches the list. The client matches typed text against it
in memory, misspellings included ("pfeizer" → Pfizer), and the search sends labeler codes.
Matching runs in the client, which has the unit tests and keeps typed text in the browser.

Size: medium. Two PRs (the filters, client only; then the labeler search, after the result cap).

Left out of the plan, to revisit once it ships:

- **"Search this labeler" from a results row**, which turns Help's "Finding a company's
  products" steps into one click. It needs the row's labeler codes (the product NDC's first
  segment) and a name for the chip; decide where it lives with the row details drawer idea.
- **Group the More filters "Labeler in results" list by labeler group**, so Dr. Reddy's is one
  entry, not one per spelling. The client would need each product's group.
- **Labeler suggestions narrowed by the other terms** (only the labelers that make Eliquis).
- **Parent-company aliases** ("Bristol-Myers Squibb" → E.R. Squibb & Sons): the data doesn't
  hold them, and a hand-kept table would go stale.

### Search autocomplete with misspelling suggestions (2026-11-02)

Plan: [docs/plans/autocomplete.md](plans/autocomplete.md). Suggestions as the user types in the NADAC
Description, FDA Brand name and FDA Generic name fields, including likely corrections of
misspellings ("eliqus" → ELIQUIS) under "Did you mean". Picking one fills the field; Search
still runs the search, and suggestions follow the page's Include boxes (OTC, results without
prices). Built on pg_trgm: one materialized view of NADAC descriptions and FDA brand and
generic names (refreshed by both ETL paths), served by one `suggestions` endpoint. Dosage
form and route fields are out of scope; the labeler search has its own plan (above).

Size: medium. One PR, or two (database + server, then client).

Left out of the plan, to revisit once it ships:

- **The 5-character search minimum blocks short names.** 17 priced brand names (YAZ, SOMA,
  AZOR, ONFI, ELLA…) and the generic urea can't be searched on their own, so suggestions leave
  them out. `LikePattern` now stops `_____` matching everything, which was the minimum's first
  reason; the other is result size, which 5 characters doesn't bound well either ("phate").
  Decide whether a picked suggestion, or 3 characters, may search. Both servers and
  `library/constants.ts` hold the minimum. "Block searches for generic terms like "tablet""
  below moves the minimums into `/api/app-init` and sets the NADAC and FDA name values; decide
  them together, and whichever lands first updates the other.
- **Suggest the drug word** ("ELIQUIS") rather than a full strength description, if
  suggestions that narrow to one strength turn out to confuse users.
- **Narrow one FDA field's suggestions by the other's draft**, if Brand + Generic searches
  built from independent suggestions often land on nothing.

### Block searches for generic terms like "tablet" (2026-11-16)

A text search must name a drug. "tablet" passes the 5-character minimum but isn't a drug: as a
NADAC description it matches about 19,000 packages (18,830 in the dev database), which is a huge
response, and its price change list (about 4,000,000 characters) is far over
`PRICE_CHANGE_LIST_PIN_LIMIT`, so pinning it is refused with "Too many packages to pin".
"metformin tablet" is a real search. This came up while sizing pinned price change lists.

- **Rule:** a term is searchable only if at least one of its words is not a generic word. Generic
  words are dosage forms ("tablet", "capsule", "injection", "solution"), routes ("oral",
  "topical"), release words ("extended", "release"), salt suffixes ("hcl", "hydrochloride"),
  units and strengths ("mg", "ml", "10"). So "tablet", "oral tablet" and "tablet 10 mg" are
  blocked, and "metformin tablet" is allowed.
- **Salts that are drugs are not generic.** "sodium" (584 packages), "potassium" (456) and
  "calcium" (285) are among the most common words in NADAC descriptions, and "sodium chloride",
  "potassium chloride" and "calcium carbonate" are drugs. Only suffix forms count as salt words;
  those three searches are allowed examples in the shared tests.
- **Both ends enforce it**, like the minimum lengths:
  - The client doesn't search. The field shows why ("Add a drug name: "tablet" describes a
    form, not a drug"), and Search stays disabled. See `library/searchCriteria.ts`,
    `nadacSearch.ts` and `fdaNadacHandoff.ts`, which check the minimums today.
  - The server returns 400 for a blocked term, even when an NDC is also given. Today
    `NadacPriceEndpoints.GetWithSearch` handles a too-short description differently: it blanks
    it and returns 400 only when description and NDC are both empty, so `ndcDescription=tablet`
    with an NDC would silently drop "tablet". See `NadacService.ValidateNdcDescription` and
    `FdaProductService.ValidateNameSearch`, and their callers in `Endpoints/`.
- **Scope:** NADAC description and the FDA brand and generic name fields. NDC search is not
  affected.
- **The server owns every search rule and serves it in `/api/app-init`.**
  - It builds the generic words from the FDA dosage-form and route names (137 dosage forms,
    phrases like "TABLET, FILM COATED", split into words), plus a short fixed list of unit,
    strength, release and salt-suffix words. Those names are already in app-init, unused by the
    client.
  - FDA names miss NADAC's own vocabulary. Check the list against word frequencies in
    `DrugPackages.NdcDescriptionLower`: the most common 5+-letter words include "tablet"
    (18,829), "capsule" (4,417), "cream" (903), "patch" (629), "drops" (442), "relief" (388) and
    "allergy" (327). "relief" and "allergy" are OTC marketing words that name no drug and are not
    FDA dosage forms or routes. Record each word added to the fixed list, and why, beside the
    list.
  - Move the length minimums there too: NADAC description, NDC, and FDA name, today's
    `MIN_*_LENGTH` in `NadacService`, `FdaProductService` and the client's
    `library/constants.ts`. The client deletes its copies, and the AGENTS.md convention
    "Minimum search lengths are duplicated" goes away. The client has no FDA name minimum of its
    own today (`isValidFdaSearch` reuses `MIN_NDC_DESCRIPTION_LENGTH`), so the FDA name gets its
    own value. The autocomplete follow-up above, "The 5-character search minimum blocks short
    names", decides the same values; whichever lands first updates the other.
  - Add a `searchRules` object to the app-init response. The client checks a term with the same
    rule as the server (split into words, ignore case and punctuation), with a test on each
    side for the same examples.
  - When app-init fails or hasn't loaded yet, the client skips its own checks and sends the
    search. The server's 400 must then carry the same readable message, shown by
    `QueryErrorToast`, so no rule needs a client fallback copy.
- Check the default searches (`server/Data/DefaultSearches.json`), the Help search examples and
  `reporting/TEST_DRUGS.md` against the rule.

Size: medium. One PR (server, client, Help, AGENTS.md).

## Cleanups

### Refresh the NADAC as-of date during long sessions

If a new weekly file loads while the app is open, `currentAsOfDate` can use a cached app-init
date until that query refreshes. Review the freshness of that metadata alongside the price
results so stale-price indicators use the correct publication date.

### Each a small PR of its own

- **Split `library/types.ts`.** It mixes NADAC types, FDA types (with helpers such as
  `isFdaProductOtc`) and workspace types (`LayoutMode`, `MobileDrawer`). Split it by domain
  (`nadac.ts`, `fda.ts`, `workspace.ts`).
- **Delete dead files.** Nothing imports `etl/fda/parse_fda.py` (it still uses `iterrows()`,
  which AGENTS.md forbids; `parse_fda_products.py` and `parse_fda_packages.py` replaced it) or
  `client/src/Components/DataPane/`.
- **Debounce the tab-state saves.** `TabProviders.tsx` stringifies every pin's full history on
  each change. If profiling shows it costs, debounce in `library/persist.ts` (about 500ms) and
  flush on `pagehide` and when the page is hidden, keeping the several-windows guard and the
  failed-write toast working. Left out of the pinned-chart performance PR.
- **The tab FAB's Close Tab and Minimize drop keyboard focus** (`TabContextFab.tsx`, found in PR
  13's review). Each visible tab renders its own FAB (`TabInstance`). Closing or minimizing the tab
  unmounts that FAB and its menu, so focus lands on `<body>`. Follow the menu pattern in
  `Components/ui/focus.ts`, as the drawer's Close tab does (`DrawerTabList`): decide with
  `fromKeyboard(event)` from the menu item, and focus after the menu has closed. After Close,
  focus the replacement tab's FAB, or its drawer row when that tab is a blank "new" tab with no
  FAB. After Minimize, the pane is empty, so focus its drawer row. After a tap nothing moves. On a
  phone the drawer is closed, so a drawer row isn't a target there. Small.
- **The Pin toast covers the change chart dialog's close button on phones** (found in the iOS
  Simulator, 2026-11-22). Toasts come from the top on phones (`App.tsx`), and the full-screen
  `PriceChangeChartDialog` has its close button top right, so after Pin it's hidden for about
  three seconds. Either let the dialog's own status line confirm the pin visibly and skip the toast
  there (`PinButton` always toasts), or show toasts at the bottom while a dialog is open. Small.
- **A tap on a results-table checkbox leaves a focus outline** on the cell (MUI X DataGrid's own
  cell focus, seen in the iOS Simulator, 2026-11-22). The focus and touch cleanup kept the
  DataGrid's focus handling on purpose; decide whether the outline after a tap is worth styling
  away (for example, only under `:focus-visible`). Small.
- **Scan presets could run the scan** at their percent (`type="submit"`). Today a preset only
  fills the field, so after choosing one by keyboard, Enter presses the preset again and Tab
  reaches Scan. A behavior change; decide separately.
- **`SettingsContext.tsx` isn't a Fast Refresh boundary.** It exports the context next to the
  provider, so every hot update of it or of `library/settings.ts` re-creates the context and
  re-runs its importers (Vite logs `Could not Fast Refresh ("SettingsContext" export is
  incompatible)`). Move the context and its hook out of the provider's module, as
  `Context/workspaceContexts.ts` does for the workspace, with a null default. Dev-only, small.
- **`fda-products/advanced-search` could take over the `/search` name.** The old
  `/api/fda-products/search` was deleted with the search result cap, so the name is free. Keep it
  a POST with a JSON body: search terms stay out of URLs (see "Never record a search term" in
  AGENTS.md).
- **The client bundle is over 500 kB,** and `npm run build` warns about the chunk size. Split it
  (lazy routes, or a manual chunk for MUI X and recharts) once load time matters.
- **The price columns' number filters ignore units.** A column-menu filter such as Latest Price
  `> 0.05` compares $/each with $/mL (`ResultTables/priceColumns.tsx`). Sorting already groups by
  unit (`compareUnitPrices`). Make the filters unit-aware (a custom filter operator that also
  picks the unit), or set `filterable: false` on the three price columns.
- **Restyle the focus outline on headings that take focus from code.** Card headings
  (`ExplorerGridItem`) and the results heading (`ResultsSection`) are out of the tab order but
  take focus from code (keyboard Line, Bar and Show, the fallbacks after a close), so keyboard and
  screen-reader users land in the right place. They show a plain 2px `:focus-visible` box that reads as a stray border and
  doesn't fit the app. Keep a visible indicator, but design one that fits (theme color, offset,
  corners from `BORDER_RADIUS`, or an underline), and use it for both. Small.
- **NADAC description search misses an NDC's current name.** `update_drug_package` inserts
  with `ON CONFLICT ("Ndc") DO NOTHING`, so `DrugPackages` keeps the first description an NDC
  was loaded with, while results show the latest. On dev (2026-11-16), 234 NDCs differ, and 37
  latest names (22 Rx) aren't contained in any stored name: "AJOVY 225 MG/1.5 ML AUTOINJECTOR
  (3 PACK)" is stored as "AJOVY 225 MG/1.5 ML AUTOINJECT", so typing the name the table shows
  finds nothing. Either update the stored description to the latest, or search every
  description an NDC has had. Either way it changes what typed searches find. Autocomplete's
  view reads `DrugPackages` too ([docs/plans/autocomplete.md](plans/autocomplete.md)), so it
  follows the fix with no change of its own. Small.
- **Back the WCAG 2.2 AA target with checks** (from PR 64's review). The rules in AGENTS.md
  can't show conformance on their own, and nothing lints accessibility today. Add
  `eslint-plugin-jsx-a11y`, run axe (DevTools or Lighthouse) once per page type (Welcome, each
  search, the workspace, Help, Settings), and do a keyboard-only pass and a VoiceOver pass
  through the main flows. Fix or record what they find.
  The touch pass is done: on 2026-11-22 every tap check from PRs 64 and 65 passed in the iOS
  Simulator (no focus ring, keyboard or page jump), MUI menus opened by a tap showed no ring on
  their first item, and Shift+Tab up a long page at phone width never left focus under the app
  bar. Still open, on a real device with VoiceOver (`npm run dev:phone`): whether the change chart
  dialog is announced by its title and context line, the Pin status line, the scan report and the
  chart toasts are spoken, and where the cursor lands after a menu's Remove or Close tab.
  Also check that a tap on Unlock doesn't switch `useChartReadout` into announcing.
- **Card header targets on the narrow tier** (from PR 67's review). A card header's collapse
  toggle, Pin and a price change list's X are small `IconButton`s, about 34px, and AGENTS.md asks
  for 44px on narrow layouts. Size them up below the card's `sm` tier (`ExplorerGridItem` and its
  callers' actions) without crowding the title. Small.
- **Rows hidden by the grid's own column filter count as shown** (from PR 67's review; Chart
  selected behaved the same). `ResultTable`'s `rowIds` and the toolbar's shown count use the
  table's `rows`, which still include rows the DataGrid's column filter hides, so such a row is
  counted, charted and survives header uncheck-all. Either count grid-visible rows
  (`gridExpandedSortedRowIdsSelector`) as shown, or `disableColumnFilter` on the result tables
  (the page's own filters cover most uses). Small.
- **Lint for unused exports.** Consider a tool such as `knip` to catch exports with no callers.
- **Two global modals are never opened.** Nothing calls `openModal("about")` or
  `openModal("onboarding")`; About and Welcome render only as pages. Remove both entries from
  `GlobalModal` and the `showHeading` props, or wire up an opener. Small.

## Ideas

### Previous and Next in the change chart dialog

Step through a list's changes without closing the dialog.

### Chart a change group

One multi-series chart of a group's packages, in the same dialog, for comparing.

### Browser Back closes dialogs

On a phone, Back with a full-screen dialog open leaves the page; Help has the same problem. It
needs a history entry when a dialog opens.

### Smaller search responses (2026-11-12)

Found while planning the search panel, and left out of it as out of scope. A price row is about
490 bytes of JSON and a chart reads five of its sixteen fields; `metformin` is 7.7 MB (NADAC)
and 8.2 MB (FDA) for 12 months, 29 MB for all FDA history. Nothing here is decided.

- **Response compression** (`AddResponseCompression`): the server sends none today. Measure the
  CPU cost on the Pi before choosing a level.
- **A slim price format**: prices grouped per NDC (description, unit, OTC and classification
  once, then `[date, price]` points), expanded back to today's shapes in `api/types.ts`.
  Roughly a tenth of the bytes, by estimate. It would make loading all history cheap enough
  that the search panel's Dates could stop fetching.
- **Cache the FDA advanced search** on the server; it has no cache code (NADAC's missing
  `_cache.Set` is under Known rough edges in AGENTS.md).

### Self-hosted observability (2026-11-03)

Plan: [docs/plans/observability.md](plans/observability.md). Instrument the API once with
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

The Settings panel (the gear in the app bar, or Settings in the workspace drawer) holds the bar
chart style and the color mode. Two more chart rules are constants today, and could join it:

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

- **Price-change detection is client-only today**, run on each FDA and NADAC result. A "recent
  movers" list across all drugs needs it on the server, most likely computed after each NADAC
  load (ETL or a SQL view) and served by an endpoint. Then client and server must agree on the
  rule, so give it one written definition before there are two implementations. The client's
  rule is the definition to write down: consecutive as-of dates and `meetsThreshold`, which
  compares in tenths of a percent (`library/flagNadacPriceChange.ts`); the default
  `NOTABLE_PRICE_CHANGE_PERCENT` of 10 (`library/constants.ts`); and a change from $0, which
  meets every threshold and reads "from $0" (`fromZero` in `library/priceActivity.ts`).
- **"Popular searches" needs search counts,** which nothing records today. The server never
  records a search term (the rule under the server gotchas in AGENTS.md, from
  [Search privacy](plans/search-privacy.md)), so this needs its own decision: counts only,
  without the requester's IP.

### Linkable search results

Links that open a Workspace tab with a search already run, for people to look at or start a tab
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

### FDA charts' loaded dates can include packages the table hides

When the dates narrow without a fetch, `loadedPrices` refines over every loaded date, and
`refinePackage` decides "without prices" and excluded units over that window too. So it keeps a
package with no prices in the shown dates (Results without prices off), or one whose shown
prices are all in an excluded unit, when it has other prices elsewhere in the load. At product
level a pinned chart's dates outside the window then average those packages in. Decide those
two rules over the shown dates as well, as Price activity already does (`activityDates`).

### Search results on phones

Consider a row details drawer to show the fields for a single result without horizontal
scrolling. FDA search filters by **Price Activity**; NADAC could add the same filter from
`PriceActivity.category` if sorting proves insufficient there.

### Chart readout cues

Test whether clearer lock instructions, a visible locked state, and an overflow cue help
people use the docked readout.

### Interactive Help example

Consider a small, fixed example built with the same results table as Search. Use it to
show sorting, column controls, and how to chart selected rows. It should work without the API.

### Help follow-ups

Carried over from the retired Help draft and browser usability plan.

- **Screen-reader readout.** Check the chart readout with VoiceOver (`useChartReadout.tsx` has a
  polite live region). Until then, Keyboard and screen readers says only that the readout shows
  the active value, not that it is announced.
- **FDA directory freshness.** How current it is says when NADAC loads, but not how often the
  FDA directory reloads, which isn't documented in the repo. Document the schedule, then say it.
- **Latest loaded week.** Consider showing the latest loaded as-of date (from `app-init`) on How
  current it is, and confirm the first file date in production.
- **Things to try.** Check each search against production, and again when the data moves on.
- **The 5% Price Activity cutoff.** Still open: whether 5% reads right on real searches
  ([NADAC price variation](../reporting/NADAC_PRICE_VARIATION.md) has the analysis behind it).

### Optional Average Price column

The October user-testing notes called for an optional Average Price column. The results
tables currently offer Latest Price, Min Price and Max Price. Average is available on bar charts.
Revisit the column if people need to compare period averages in the table.

## Author’s notes

These ideas are for discussion with the author before planning work.

### Workspace redo (2026-11-01)

The Workspace has gone in a direction that probably isn't the best place to be. A tab shouldn't be a search. A tab should be a collection of results and charts
created by a user and stored for comparison. A search is really a tool. People can use the app and simply perform a search and look around a bit, that would be the
fda search and nadac search routes. The workspace is for when people want to collect results for notes and comparison. They add results using a search. This is
where the Collection idea was going before development on that stopped.

When a new tab is created, users should be asked how they want to add data: which search they want to use. Once they pick it, it probably opens a modal with the search in it.
Users can then add results tables and charts to their collection (aka tab).

Auto charts are now essentially recommended additions to the collection in this context.

Eventually we can add "starting points" for tabs a user might want to see or start with. They'll also be a demo. GLP-1 drugs might be a good starting point.

The current Collection might be a good starting point, but it just uses PinnedSection and has a wonky mailbox design to get items to it. The whole workspace
context needs to be rethought, so probably no need to stick to this mailbox design. However, users should be able to create a workspace tab from the basic search endpoints if they want to start there and then do something more complex. Because of that the workspace context probably needs to wrap around the whole app like it essentially does now.

The Collections proof of concept (`Components/Collection/`, a registered tab type the tab creator
doesn't offer) stays in the code until then. It is an early step toward this.

## Typography cleanup

`theme.ts` names "DM Sans" first in `fontFamily`, but no font is loaded anywhere (no link,
`@font-face` or `@fontsource`), so the app renders in the system font. Either load DM Sans or drop
the name.
