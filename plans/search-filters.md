# One search-and-filter panel for NADAC and FDA

Status: built (2026-11-12). Steps 1–3 are PRs 21–23; step 4, the docs, was mostly done in step 3. Step 2
also added an Include OTC box to the NADAC form, since NADAC now hides OTC. What was decided is
at the end, and what was left out on purpose is under "Not built" below.

Changed since (2026-11-12): Dates no longer wait for Search. Only the text terms do; Dates apply
at once like every other field, so the user never has to know what fetches. Search is disabled
while the terms are the search on screen. Where the plan below says dates wait for Search, read
this instead.

Step 3, as built (2026-11-12):

- **FDA dates snap like NADAC's.** As-of dates are weekly (all 249 gaps were 7 days), so the FDA
  request is widened by 6 days each side (`widenToAsOfDates`) and the client snaps to as-of dates
  (`fdaShownDates`). `snapToAsOfDates` now reaches at most 6 days, on both pages, so an NDC last
  priced months before the start no longer pulls the start back after a narrowing.
- **Hidden counts are table rows**: NDCs on NADAC; products or packages on FDA, by detail level.
  When the filters hide every result, the empty table offers one Include box when it alone
  would show them all, else **Clear filters** when the defaults would show some ("8 packages
  hidden by filters", without the OTC the defaults hide), else **Show all** (every refine field
  set to show everything, `showAll*`).
- **New charts keep every loaded date of their series** (`withLoadedHistory`), as "Dates" above
  says: after a narrowing that didn't fetch, a pin is no longer marked "filtered" for the dates.
  A price-change card's full history is the search's dates, which is what it shows.
- **Not built:** FDA's Product NDC *load* field (FDA "More" has the from-results Product NDC list),
  the Average column (`priceColumns.tsx` leaves it out on purpose), and moving the form's draft
  into the provider (it stays in each panel).

## Context

Today each page has two separate things: a search form (decides what loads) and Page Tools
filters (narrow what loaded). They look different on each page and behave differently:

| | NADAC | FDA |
| --- | --- | --- |
| Search form | Description, NDC, Start/End date | Brand Name, Include no-price, Include samples |
| Page filters | Drug (description) | Product NDC, Dosage form, Route, Labeler |
| Filter narrows | Add Chart only | table, auto charts, price changes, toast |
| Dates loaded | the form's range (default 12 months) | all history (no date sent) |
| Layout | Tools left (3/12), table right, half-width charts | full-width table, Page Tools card, full-width charts |
| Result state | copied into context by an effect | derived from `useQuery` |
| Price changes flagged over | unfiltered result, loaded 12 months | filtered result, all history |
| Change-card NDC | stored form (`3089321`) | dashed (`00003-0893-21`) |

The goal: **one panel per page that is both the search and the filter**, the same on both pages,
with a short default view and a "More filters" toggle. Changing a filter fetches only when the
loaded data can't answer it.

Facts from the dev API (2026-11-12) that shape the design:

| Request | Size | Notes |
| --- | --- | --- |
| FDA `metformin`, all history (today) | 29.1 MB | 571 products, 1,763 packages, 57,571 price rows |
| FDA `metformin`, 12 months | 8.2 MB | 14,952 price rows |
| NADAC `metformin`, 12 months (today) | 7.7 MB | 15,591 rows, 344 NDCs, 51 weeks |
| FDA `eliquis`, all history | 0.7 MB | |

- Price rows are the payload: about 490 bytes each. FDA rows are cheap (including no-price
  results for `metformin` adds 1,423 packages and 0.6 MB).
- The FDA date filter works on the server but the client can't reach it: the client type says
  `pricesAsOfDateStart`/`End`, the server reads `priceAsOfDateStart`/`End` and ignores the
  former. Nothing sets it today, so nobody noticed.
- `FdaResultFilter.excludeOtc` and `excludeSamplePackages` are applied and persisted but have no
  control anywhere.
- `classificationForRateSetting` arrives as a number (0–3) while the client type says `string`.

## The model

One **criteria** object per search type holds every field the panel shows. Each field belongs to
one of two groups, and the group is the only thing that decides whether a change fetches:

- **Load fields** go to the server and wait for the Search button: the text terms and Dates.
- **Refine fields** are applied in the client to what loaded. Changing one applies at once.

The user sees one panel with one rule: text and dates wait for Search, checkboxes, choices and
lists apply immediately. Before the first search, refine fields can be set and simply ride along.

| Field | NADAC | FDA | Group | Default view |
| --- | --- | --- | --- | --- |
| Description / Brand name | yes | yes | load | yes |
| NDC / Product NDC | yes | yes | load | NADAC yes, FDA more |
| Generic name | no | yes (autocomplete plan) | load | more |
| Dates | yes | yes | load | yes |
| Include OTC | yes (`isOtc`) | yes (product type) | refine | yes |
| Include sample packages | no (not in NADAC) | yes | refine | FDA yes |
| Include results without prices | no (every NADAC row is a price) | yes | refine | FDA yes |
| Brand / generic | yes (`classificationForRateSetting`) | no | refine | NADAC yes |
| Drug (description list) | yes | no | refine, from results | more |
| Product NDC list, Dosage form, Route, Labeler | no | yes | refine, from results | more |
| Pricing unit | yes | yes | refine, from results | more |

"From results" fields are multi-selects whose options come from the loaded result, as today, so
they are disabled until a search has run. They keep storing *exclusions*.

Why the refine fields aren't sent to the server: they barely shrink the payload (rows are
cheap, prices are not), and a server-side dosage-form filter would remove the other dosage forms
from the option list, so widening it again would need a round trip. Moving a field from refine to
load later is a one-line change in the field table, with no UI change.

### Dates

One Dates field per page, in the default view: presets (Last year, 6 months, 3 months, All) and
a Custom range, defaulting to the last `DEFAULT_NADAC_SEARCH_MONTHS` on both pages. It decides
which prices load, and so it is also the window of the table's price columns, the auto charts
and the price-change cards. It replaces the NADAC form's Start/End dates **and** the Page Tools
"Chart dates" control on both pages: with Dates deciding what loads, a second page-level date
control over the same results would be redundant.

- A date change takes effect on **Search**, like the text terms.
- **Narrowing doesn't fetch.** On Search, when the text terms are unchanged and the requested
  dates lie inside the dates already loaded, the client keeps what it has and clips to the new
  window. Anything else (new terms, or dates reaching outside what is loaded) fetches. So going
  from Last year to 3 months and back to 6 months costs one request, not three.
- Presets resolve against the last loaded as-of date from `app-init` (today if it failed), at
  the moment Search is pressed, and are stored as the preset so a restored tab follows new weeks.
- FDA starts sending dates, so it stops loading all history: `metformin` goes from 29.1 MB to
  8.2 MB on the default 12 months. "All" still loads everything, on purpose.
- "Results without prices" on FDA therefore means *no prices in these dates*.
- A restored tab re-runs its search with its own dates, not the wider span it may have had
  loaded before the reload.

Pinned charts keep their own dates and stay snapshots. A new pin starts at the search's dates,
as fixed dates. After a narrowing that didn't fetch, a new pin's series still hold the wider
loaded history, which its dates chip can open up; that is harmless and matches "a chart item
keeps every date of its series".

### The three "Include" checkboxes

"Include OTC", "Include sample packages" and "Include results without prices" are checkboxes in
the default view, all **unchecked by default**. NADAC shows only "Include OTC": it has no sample
flag, and every NADAC row is a price. All three are refine fields, so ticking one never fetches.

- **Sample packages** and **results without prices** move from load to refine: the client always
  asks the server for them and hides them by default (5 sample and 1,423 no-price packages on
  `metformin`, about 0.6 MB). This fixes the dead "Include Sample Packages" toggle noted in
  AGENTS.md. A product whose packages are all hidden is hidden too.
- **OTC is hidden by default, which is new**: today both pages show OTC results. A search for an
  OTC drug ("ibuprofen", "loratadine") will come back empty until the box is ticked. The
  empty-result message below must name the cause and offer the fix in one click ("12 OTC
  results hidden. Include OTC"), not just say that filters hid something.

### Brand / generic (NADAC)

A three-way choice in the default view: **All** (default), **Brand**, **Generic**. It reads
NADAC's `classificationForRateSetting`: `G` is Generic, and `B`, `B_ANDA` and `B_BIO` are all
Brand. The value arrives as a number (0–3) that the client types as `string` today, so
`api/types.ts` maps it to a named value first, as it already does for `pricingUnit`. An NDC is
classified by its latest row.

## Server changes

None. Both endpoints already accept everything the panel sends:

- NADAC `search` is used as today.
- FDA `advanced-search` already filters prices by date. The fix is in the client: rename
  `pricesAsOfDateStart`/`End` to `priceAsOfDateStart`/`End` in `api/types.ts` and
  `library/types.ts`, and always send `includeSamplePackages` and `includeResultsWNoPrices` as
  `true`.

Server improvements noticed while planning (a slimmer price format, response compression,
caching the FDA search, plain query params for the FDA search) are separate FUTURE_WORK items,
not part of this plan.

## Client changes

### Library (tested, no React)

- `library/searchCriteria.ts`: `NadacCriteria`, `FdaCriteria`, their defaults, and per type:
  - `loadRequest(criteria, lastAsOfDate)`: the load fields with Dates resolved to a fixed range.
    It is the React Query key and the request.
  - `nextLoad(loaded, requested)`: returns `loaded` unchanged when the terms match and its
    dates cover the requested ones, else `requested`. This one function is the "narrowing
    doesn't fetch" rule.
  - `refine(result, criteria)`: the one function every consumer calls. It clips prices to the
    criteria's dates, then applies the refine fields. FDA's builds on today's
    `applyFdaResultFilter` (adding OTC, sample, no-price and unit); NADAC's is new.
  - `activeFilterCount(criteria)` for the "More filters (3)" label, and `clearRefine(criteria)`.
- The tab's provider holds three things: the draft text and dates (the form), the applied
  `criteria`, and the `loaded` request. Search copies the draft into `criteria` and sets
  `loaded = nextLoad(loaded, loadRequest(criteria))`. Refine fields write `criteria` directly.
- Persistence: both tab types store one `criteria` object, each field validated with its own
  default as now; `loaded` is not stored. Old tabs have `searchParams` + `resultFilter` /
  `excludedNdcDescriptions` and a page `chartDates`; read those into `criteria` when it is
  missing rather than bumping `VERSION`, so nobody loses tabs. Remove the fallback at the next
  real version bump.
- `flagNadacPriceChange`: stop sorting its input in place (known rough edge), and have both
  pages call one `flagPriceChanges(packages)` over the refined result.
- The page's `chartDates` leaves `ExplorerItemsContext`, and `useChartWindow` goes away: the
  window is the criteria's dates. Pinned items' own `dateWindow` is untouched.

### Shared components

- `SearchPanel/` (new): the frame both pages render. A form with the default row, a
  "More filters" disclosure (`aria-expanded`, state not persisted), the Search button, and a
  "Clear filters" action. It takes field components as children, so each page lists its own
  fields and the layout, spacing and breakpoints live in one place.
- Field components, shared where the field is shared: `DatesField` (from `ChartDatesControl`,
  with the Custom preset, editing the draft), `IncludeCheckbox` (OTC, sample, no prices),
  `ChoiceField` (Brand/generic, unit), `ExclusionSelect` (from `SelectFilter`, no longer tied to
  `FdaSearchContext`).
- `ResultsSection/` (new): the frame from step 2 of the usability round: "Results: <search>",
  a toolbar (Product/Package on FDA, Chart selected), the table, the auto charts, then the
  price-change cards. Both pages render it; Pinned sits below with its note.

### Pages

- **NADAC**: derive from `useQuery` and delete `data`/`setData` and the copying effect; rename
  `SearchContext` to `NadacSearchContext` (both are FUTURE_WORK parity items). The table, auto
  charts, price-change cards and both toasts read the refined result, which closes the "NADAC
  has no two-layer model" gap in AGENTS.md. `VizTools` goes away.
- **FDA**: `FdaSearchTool` and `FdaPageTools` go away; `FdaExplorer` renders `ResultsSection`.
- Both pages end up as `SearchPanel` → `ResultsSection` → `PinnedSection`, with the same grid:
  full-width table, half-width auto charts (`HALF_WIDTH_GRID_SIZE`), half-width change cards.

### Behavior that must stay aligned

- **Price changes**: flagged per package over the refined result, on both pages, so only inside
  Dates. The "N changes are outside the chart dates" note goes away with the control it referred
  to. The "N price changes flagged" toast counts the same set on both pages (today NADAC counts
  before the filter, FDA after).
- **Change-card NDC**: keep each page's own form (NADAC stored, FDA dashed). AGENTS.md says not
  to rebuild a dashed code from a NADAC NDC, so this difference is correct, not a gap.
- **Colors** still come from each NDC's place in the loaded result, so filters never move them;
  the visible set is the refined result on both pages.
- **Chart provenance** (`ChartOrigin.resultPrices`) stays the loaded result.
- **Toasts**: "N found" fires once per new *load*, never on a refine change or a narrowing that
  didn't fetch. `useNewSearchResult` keys on the `loaded` request, not the whole criteria.
- **A new search keeps the fixed refine fields** (the Include checkboxes, brand/generic) and
  clears the from-results exclusions, which name values the new result may not have. A
  narrowing that didn't fetch keeps them.
- **Tab rename** stays in the search panel only (it reads the tab list).
- **Empty refine result**: when filters hide everything, the table says what hid the results
  and offers the fix ("12 OTC results hidden. Include OTC"; "N results hidden by filters. Clear
  filters" when several are involved), instead of looking like a failed search. The "N found"
  toast counts what is shown and adds how many are hidden.

## Order of work

Each step is a PR to `dev` that leaves the app working.

1. **Client library**: `searchCriteria.ts` (`loadRequest`, `nextLoad`, `refine` for both
   types), persistence read-over, price-change cleanup, tests. Pages still use the old UI
   through thin adapters. Medium.
2. **NADAC page onto the model**: derive from the query, refined result everywhere. Small, and
   the first visible parity win.
3. **`SearchPanel` and `ResultsSection` on both pages**, with Dates as a load field on FDA (the
   parameter-name fix) and the page-level Chart dates removed; Page Tools, `VizTools`,
   `FdaSearchTool` and `FdaPageTools` go. The large one; it is also step 2 of the usability
   round. Two carry-overs from step 1's review: compute `refineFda` once per tab (in the
   provider or `ResultsSection`) instead of in each of `useRefinedFdaSearch`'s three callers;
   and decide whether FDA's clip snaps the start down to an as-of date like NADAC's
   (`clipNadacToSearchDates`). FDA's server filters prices strictly (`AsOfDate >= start`), so
   without a snap its first shown week can start after the start date. From step 2's review:
   FDA's from-results lists (labeler, dosage form, ...) should take their options the way
   `nadacFilterOptions` does (after the Include boxes, before exclusions), and its Include boxes
   should show how many results they hide, as NADAC's Include OTC does ("(72 hidden)").
4. **Docs**: AGENTS.md (the two-layer FDA note, the NADAC gap, NADAC search dates),
   `client/CHARTS.md` (Chart dates, price-change cards), FUTURE_WORK.md (delete what this
   settles). Done, mostly in step 3.

## How this fits the other plans

- **Usability round step 1 (pinned-chart performance)** should land first. It splits
  `ExplorerItemsContext`, which holds the page's chart dates this plan removes.
- **Usability round step 2** is absorbed by step 3 here, with two changes: the filters and
  Dates sit in the search panel, not in a Results toolbar, and Dates decides what loads rather
  than being a view over all loaded dates. Its Custom preset moves to the panel's Dates field.
  The Results section keeps Product/Package, Chart selected, the table and the auto charts; the
  new Average column and "Chart selected" are unchanged.
- **Autocomplete** adds its suggestions to the panel's text fields and brings the FDA Generic
  Name field, which this plan places under "More filters". Either order works; whichever lands
  second adapts to the other's form.
- **Linkable search results** gets easier: criteria is a flat, validated object.
- **Workspace redo** (author's note, not decided): if search becomes a tool opened from a
  collection, `SearchPanel` + `ResultsSection` are the pieces that move into it.

## Verification

- `npm test`: `refine` for both types (each field alone, combined, empty result, date
  clipping); `nextLoad` (same terms and narrower dates keeps the load; wider dates, an open
  end, or new terms replaces it); `loadRequest` ignores refine fields; persistence reads old
  and new tab shapes; price changes flagged over a refined result without mutating input.
- `npm run lint`, `npm run build`.
- In the browser, on both pages, at phone and desktop widths, in both themes:
  - ticking Include OTC and excluding a dosage form make no network request;
  - narrowing Dates and pressing Search makes none; widening makes exactly one;
  - changing the name and pressing Search makes exactly one;
  - an FDA search's request carries dates and its response holds only those weeks;
  - table rows, auto charts, change cards and the flagged toast all agree after a filter;
  - a restored tab from before the change comes back with its search, filters and dates.

## Decided with the author (2026-11-12)

- Refine fields are applied in the client only; they are not sent to the server.
- Dates is a load field on both pages and takes effect on the Search button. Narrowing the
  dates with the same terms doesn't fetch. (An earlier draft loaded all history in a new, slim
  price format; the author ruled the server reshaping out of scope.)
- No server changes in this plan.
- Filters and Dates sit in the search panel, not in a Results toolbar. This revises step 2 of
  the usability round.
- Default view: NADAC shows Description, NDC, Dates, Include OTC, Brand/generic. FDA shows Brand
  name, Dates, Include OTC, Include sample packages, Include results without prices. Everything
  else is under "More filters".
- OTC, sample packages and results without prices are "Include ..." checkboxes, unchecked by
  default.
- OTC stays hidden by default. Most users are after pharmacy claims; showing OTC is a courtesy,
  and the unchecked box is the cue. Don't revisit this by ticking it by default.
- Brand/generic on NADAC is a three-way choice: All (default), Brand, Generic.
