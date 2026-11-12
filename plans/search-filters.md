# One search-and-filter panel for NADAC and FDA

Status: agreed with the author (2026-11-12). Nothing here is built. What was decided is at the
end.

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
| FDA `metformin` (prices only) | 28.5 MB | 571 products, 57,571 price rows, all history |
| NADAC `metformin`, 12 months | 7.7 MB | 15,591 rows, 344 NDCs, 51 weeks |
| NADAC `metformin`, all history | 34.3 MB | |
| FDA `eliquis` | 0.7 MB | |

- A price row is about 490 bytes of JSON, and a chart reads five of its sixteen fields
  (`ChartPrice`). `ndcDescription`, `ndcDescriptionLower`, `loadedAt`, `createdAt` repeat on
  every row.
- The server sends no compressed responses (`Accept-Encoding: gzip` gets the same bytes).
- Including no-price results for `metformin` adds 1,423 packages and only 0.6 MB: FDA rows are
  cheap, price rows are the payload.
- The FDA date filter can't work today: the client sends `pricesAsOfDateStart`, the server reads
  `PriceAsOfDateStart`. Nothing sets it, so nobody noticed.
- `FdaResultFilter.excludeOtc` and `excludeSamplePackages` are applied and persisted but have no
  control anywhere.
- `classificationForRateSetting` arrives as a number (0–3) while the client type says `string`.
- Neither search is cached on the server (NADAC is a known rough edge; FDA advanced search has
  no cache code at all).

## The model

One **criteria** object per search type holds every field the panel shows. Each field belongs to
one of two groups, and the group is the only thing that decides whether a change fetches:

- **Load fields** go to the server. Changing one needs the Search button.
- **Refine fields** are applied in the client to what loaded. Changing one applies at once.

The user sees one panel. The split shows only as behavior: text terms wait for Search, and
everything else takes effect immediately once results are on screen. Before the first search,
refine fields can be set and simply ride along.

| Field | NADAC | FDA | Group | Default view |
| --- | --- | --- | --- | --- |
| Description / Brand name | yes | yes | load | yes |
| NDC / Product NDC | yes | yes | load | NADAC yes, FDA more |
| Generic name | no | yes (autocomplete plan) | load | more |
| Dates | yes | yes | refine | yes |
| Include OTC | yes (`isOtc`) | yes (product type) | refine | yes |
| Include sample packages | no (not in NADAC) | yes | refine | FDA yes |
| Include results without prices | no (every NADAC row is a price) | yes | refine | FDA yes |
| Brand / generic | yes (`classificationForRateSetting`) | no | refine | NADAC yes |
| Drug (description list) | yes | no | refine, from results | more |
| Product NDC list, Dosage form, Route, Labeler | no | yes | refine, from results | more |
| Pricing unit | yes | yes | refine, from results | more |

"From results" fields are multi-selects whose options come from the loaded result, as today, so
they are disabled until a search has run. They keep storing *exclusions*.

Why not send the refine fields to the server too: they barely shrink the payload (rows are
cheap, prices are not), and a server-side dosage-form filter would remove the other dosage forms
from the option list, so widening it again would need a round trip. Moving a field from refine to
load later is a one-line change in the field table, with no UI change.

### The three "Include" checkboxes

"Include OTC", "Include sample packages" and "Include results without prices" are checkboxes in
the default view, all **unchecked by default**. NADAC shows only "Include OTC": it has no sample
flag, and every NADAC row is a price. All three are refine fields, so ticking one never fetches.

- **Sample packages** and **results without prices** move from load to refine: the server always
  returns them and the client hides them by default. On `metformin` that is 5 sample packages
  and 1,423 no-price packages, about 0.6 MB before the slim format. This fixes the dead
  "Include Sample Packages" toggle noted in AGENTS.md. A product whose packages are all hidden
  is hidden too.
- **OTC is hidden by default, which is new**: today both pages show OTC results. A search for an
  OTC drug ("ibuprofen", "loratadine") will come back empty until the box is ticked. The
  empty-result message below must name the cause and offer the fix in one click ("12 OTC
  results hidden. Include OTC"), not just say that filters hid something.

### Brand / generic (NADAC)

A three-way choice in the default view: **All** (default), **Brand**, **Generic**. It reads
NADAC's `classificationForRateSetting`: `G` is Generic, and `B`, `B_ANDA` and `B_BIO` are all
Brand. The value arrives as a number (0–3) that the client types as `string` today, so
`api/types.ts` maps it to a named value first, as it already does for `pricingUnit`; in the slim
format it is the per-NDC `classification`. An NDC is classified by its latest row.

### Dates

One Dates field per page, in the default view. It means *the results' dates*: the window for the
table's price columns, the auto charts and the price-change cards. It replaces the NADAC form's
Start/End dates and the Page Tools "Chart dates" control on both pages, and it is what step 2 of
the usability round already decided ("Dates are the results' dates", with a Custom preset).

Every search loads all history in the slim price format (server change 2), so Dates is a pure
refine field and never fetches. `metformin` should drop from 28.5 MB to roughly 1–2 MB before
compression (an estimate; step 2 measures it). Dates defaults to the last
`DEFAULT_NADAC_SEARCH_MONTHS` on both pages, so a new search looks like today's NADAC one.

Pinned charts keep their own dates and stay snapshots. Nothing in this plan changes them.

## Server changes

1. **`GET /api/fda-products/search` takes plain query params** and replaces `advanced-search`
   and its `jsonString`: `proprietaryName`, `nonProprietaryName`, `productNdc`. It always
   returns sample and no-price packages. The current simple `/search` has no client caller (a FUTURE_WORK
   cleanup item), so its name is free. Drop the two `Console.WriteLine` calls with it.
2. **Slim price format on both search responses.** Prices grouped per NDC instead of one fat
   object per week:

   ```json
   { "ndc": "378718605", "description": "METFORMIN HCL 850 MG TABLET", "pricingUnit": 0,
     "isOtc": false, "classification": 0,
     "points": [["2025-10-29", 0.0226], ["2025-11-05", 0.0226]] }
   ```

   NADAC returns a list of these; FDA returns one per package inside `fdaPackageDetails`.
   `description`, unit, OTC and classification come from the latest row. Check first whether any
   NDC changes unit or OTC over time; if some do, keep those per point.
   `api/types.ts` expands it back to the client's price shape, so `library/` is untouched at
   first. Drop the unused `Predicates` from the NADAC response; keep `Notices`.
3. **Response compression** (`AddResponseCompression`, Brotli and gzip, for JSON). One line in
   `Program.cs` and the biggest win per line in this plan. Measure on the Pi: Brotli at the
   default level may cost more CPU there than it saves; use `Fastest` if so.
4. **Cache both searches** in the repositories, each with its own `CacheKeys` key, and fix
   `NadacRepository.ListSearchResultsAsync` (reads the cache, never writes it). With all-history
   loads the key is just the terms, so the cache hits far more often than a date-keyed one.
   `CacheWarmingService` then warms through the repository method instead of setting keys itself.
5. **Enforce minimum lengths**: call `ValidateNdc` (today `ndc=1` returns 47,072 rows for one
   week; all-history would make that much worse) and apply the same rule to `productNdc`.
6. NADAC `/search` loses `minDate`/`maxDate`; the snapping code and its notices go with them. The stubbed `nadac-prices/advanced-search` and
   `AdvancedSearchRequest` can be deleted in the same PR.

No migration and no ETL change.

## Client changes

### Library (tested, no React)

- `library/searchCriteria.ts`: `NadacCriteria`, `FdaCriteria`, their defaults, and per type:
  - `loadKey(criteria)`: the load fields only. It is the React Query key and the request.
  - `refine(result, criteria)`: the one function every consumer calls. FDA's is today's
    `applyFdaResultFilter` plus OTC, sample and unit; NADAC's is new.
  - `activeFilterCount(criteria)` for the "More filters (3)" label, and `clearRefine(criteria)`.
- Persistence: both tab types store one `criteria` object, each field validated with its own
  default as now. Old tabs have `searchParams` + `resultFilter` / `excludedNdcDescriptions`;
  read those into `criteria` when it is missing rather than bumping `VERSION`, so nobody loses
  tabs. Remove the fallback at the next real version bump.
- `flagNadacPriceChange`: stop sorting its input in place (known rough edge), and have both
  pages call one `flagPriceChanges(packages)` over the refined result.

### Shared components

- `SearchPanel/` (new): the frame both pages render. A form with the default row, a
  "More filters" disclosure (`aria-expanded`, state not persisted), the Search button, and a
  "Clear filters" action. It takes field components as children, so each page lists its own
  fields and the layout, spacing and breakpoints live in one place.
- Field components, shared where the field is shared: `DatesField` (from `ChartDatesControl`,
  with the Custom preset), `IncludeCheckbox` (OTC, sample, no prices), `ChoiceField`
  (Brand/generic, unit),
  `ExclusionSelect` (from `SelectFilter`, no longer tied to `FdaSearchContext`).
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

- **Price changes**: flagged per package over the refined result, on both pages. Cards show for
  changes inside Dates; the note counts the rest. The "N price changes flagged" toast counts the
  same set on both pages (today NADAC counts before the filter, FDA after).
- **Change-card NDC**: keep each page's own form (NADAC stored, FDA dashed). AGENTS.md says not
  to rebuild a dashed code from a NADAC NDC, so this difference is correct, not a gap.
- **Colors** still come from each NDC's place in the unrefined result, so filters never move
  them; the visible set is the refined result on both pages.
- **Chart provenance** (`ChartOrigin.resultPrices`) stays the unrefined result.
- **Toasts**: "N found" fires once per new *load*, never on a refine change.
  `useNewSearchResult` keys on the load key, not the whole criteria.
- **A new search keeps the fixed refine fields** (the Include checkboxes, brand/generic, dates) and clears
  the from-results exclusions, which name values the new result may not have.
- **Tab rename** stays in the search panel only (it reads the tab list).
- **Empty refine result**: when filters hide everything, the table says what hid the results
  and offers the fix ("12 OTC results hidden. Include OTC"; "N results hidden by filters. Clear
  filters" when several are involved), instead of looking like a failed search. The "N found"
  toast counts what is shown and adds how many are hidden.

## Order of work

Each step is a PR to `dev` that leaves the app working.

1. **Server**: compression, caching, minimum lengths, FDA query params (client call updated in
   the same PR). No visible change. Small.
2. **Server + `api/`**: slim price format, all-history loads. Client maps it back to today's
   shapes. Measure `metformin` before and after on the Pi. Medium.
3. **Client library**: `searchCriteria.ts`, `refine` for both types, persistence read-over,
   price-change cleanup, tests. Pages still use the old UI through thin adapters. Medium.
4. **NADAC page onto the model**: derive from the query, refined result everywhere. Small, and
   the first visible parity win.
5. **`SearchPanel` and `ResultsSection` on both pages**, removing Page Tools, `VizTools`,
   `FdaSearchTool`, `FdaPageTools`. The large one; it is also step 2 of the usability round.
6. **Docs**: AGENTS.md (the two-layer FDA note, the NADAC gap, the API list, rough edges),
   `client/CHARTS.md` (Chart dates), FUTURE_WORK.md (delete what this settles).

Steps 1–2 and 3–4 don't depend on each other and can run in parallel. Step 5 needs 3 and 4, and
is much simpler after 2.

## How this fits the other plans

- **Usability round step 1 (pinned-chart performance)** should land first. It splits
  `ExplorerItemsContext`, which holds the page's chart dates this plan moves into criteria.
- **Usability round step 2** is absorbed by step 5 here, with one change: the filters and Dates
  sit in the search panel, not in a Results toolbar. The Results section keeps Product/Package,
  Chart selected, the table and the auto charts. Its new Average column and "Chart selected"
  are unchanged.
- **Autocomplete** adds its suggestions to the panel's text fields and brings the FDA Generic
  Name field, which this plan places under "More filters". Either order works; whichever lands
  second adapts to the other's form.
- **Linkable search results** gets easier: criteria is a flat, validated object, and FDA
  search already takes readable query params after step 1.
- **Workspace redo** (author's note, not decided): if search becomes a tool opened from a
  collection, `SearchPanel` + `ResultsSection` are the pieces that move into it.

## Verification

- `npm test`: `refine` for both types (each field alone, combined, empty result), `loadKey`
  ignores refine fields, persistence reads old and new tab shapes, price changes flagged over a
  refined result and without mutating input.
- `npm run lint`, `npm run build`, `dotnet build`.
- In the browser, on both pages, at phone and desktop widths, in both themes:
  - toggling OTC, picking dates and excluding a dosage form make no network request;
  - changing the name and pressing Search makes exactly one;
  - table rows, auto charts, change cards and the flagged toast all agree after a filter;
  - a restored tab from before the change comes back with its search and filters;
  - `metformin` on both pages: time to results and response size, before and after.

## Decided with the author (2026-11-12)

- Refine fields are applied in the client only; they are not sent to the server.
- Every search loads all history, once the price format is slim.
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
