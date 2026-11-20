# Autocomplete for NADAC and FDA search (with misspelling suggestions)

## Context

Both search panels have plain text fields that need 5 exact characters before Search turns on,
and a typo ("eliqus", "ozempik") just returns nothing. Users don't know how NADAC words its
descriptions or which FDA brand and generic names have prices. The goal: as the user types,
suggest real values from the data, including likely corrections of misspellings, so searches
land.

Decided with the author:

- Fields: NADAC **Description**, FDA **Brand name** and FDA **Generic name**. All three are
  `TermField`s of `SearchPanel` already, so autocomplete only has to swap each for a
  `SuggestField`. No NDC, labeler, dosage form or route suggestions in this plan.
- Picking a suggestion **fills the field only**; the user still presses Search/Enter. Typed
  free text keeps working (the search stays a contains match).
- Misspellings return likely replacements, shown under a "Did you mean" group.

### Reviewed 2026-11-16, after FDA generic name search shipped

What changed from the previous draft, and why:

- **Suggestions follow the page's Include boxes, OTC included.** Both pages hide OTC by default,
  and about a quarter of the names the old draft would suggest are OTC only (table below):
  picking one shows an empty table. The old draft mirrored only "Results without prices".
- **NADAC gets rows in the view too.** Its names still come from `DrugPackages`, which the
  search reads, but OTC and the last price date are per NDC on `NadacPrices`, so the view joins
  each NDC's latest `NadacPrices` row for them.
- **NADAC suggestions follow the search's dates.** NADAC's server applies the dates, so a name
  with no price in them returns an empty table with no hidden-results hint. FDA keeps "ever
  priced", which the hint explains.
- **The view refreshes `CONCURRENTLY`**, so suggestions stay readable during the FDA load's
  transaction. NADAC refreshes once per run, and only when something loaded.
- **One view, one endpoint.** The three fields' suggestions are the same query on one
  materialized view, so they share one endpoint, service, repository method, cache key and
  client call.
- **The field owns its query.** `SuggestField` runs `useSuggestions` itself and fetches only
  while the user is typing in it, so a restored tab doesn't fetch suggestions for its terms,
  and query state changes re-render the field, not the page.
- **No suggestion the panel can't search.** 17 priced brand names (YAZ, SOMA, AZOR, ONFI…) and
  one generic (urea) are shorter than the 5-character search minimum, so Search would stay
  disabled after picking one. The view leaves them out; lowering the minimum is its own
  decision (docs/future-work.md).
- Brand and Generic name suggest **independently** of each other's draft. About half of active
  FDA products carry their generic name as their brand name ("ATORVASTATIN CALCIUM"), so a
  generic typed into Brand name still gets suggestions.

### Facts from the dev DB (2026-11-16) that shape the design

| Field | Distinct names | With a NADAC price | Of those, OTC only |
| --- | --- | --- | --- |
| NADAC descriptions (`DrugPackages`) | 7,616 | all | 1,966 |
| FDA brand names (`ProprietaryName`, active) | 37,184 | 3,471 | 1,077 |
| FDA generic names (`NonProprietaryName`, active, unnested) | 15,834 | 2,073 | 404 |

- "OTC only" uses each page's own rule: NADAC, every NDC's latest price has `IsOtc`; FDA, every
  priced product's `ProductTypeName` is `HUMAN OTC DRUG` (`isFdaProductOtc`).
- `NonProprietaryName` is a `text[]` split on `;`, but only 2 active products have more than one
  element: in practice it holds one name, often a combination ("acetaminophen and codeine
  phosphate"). Casing varies (19,557 spellings of 15,834 lower-case names). 2,500 generic names
  are over 100 characters (the longest, homeopathic mixes, are 512).
- No price in the last 12 months (the default search dates): 1,102 NADAC names, 208 priced
  brand names and 81 generics. NADAC's server applies the dates, so those NADAC names return
  an empty table that `hiddenResultsHint` can't explain (`nadacHiddenCounts` totals 0): one
  suggestion in seven. The view therefore carries NADAC's last as-of dates and the suggestions
  follow the search's start date. FDA loads every price and hides the rest, so its
  hidden-results hint explains the empty default view. FDA stays "ever priced".
- 4 Rx brand names are priced only through sample packages, which FDA hides by default
  ("Sample packages" box). The flags ignore that box. Picking one of those 4 lands on the
  hidden-results hint. Few enough to accept.
- `DrugPackages` keeps the first description each NDC was loaded with
  (`ON CONFLICT ("Ndc") DO NOTHING`). On dev, 234 NDCs now carry a different latest description,
  and 37 latest names (22 Rx) aren't contained in any `DrugPackages` name. Typed searches miss
  them today too. Suggestions follow what the search reads, so they offer the stored names.
  The fix changes what searches find, so it has its own entry in docs/future-work.md.

`'eliqus' <% "NdcDescriptionLower"` already returns the three ELIQUIS descriptions at word
similarity 0.71 (pg_trgm 1.6), so Postgres trigram matching is the fuzzy engine.
Npgsql.EntityFrameworkCore.PostgreSQL 10 ships the trigram functions
(`EF.Functions.TrigramsAreWordSimilar`, `TrigramsWordSimilarity`) without a plugin or
`UseTrigrams()`. The lists are too big to ship to the client (37K brand names), so suggestions
come from the server per keystroke (debounced).

## Approach

### 1. Database: a name-suggestion view (migration + ETL refresh)

New EF migration `AddNameSuggestions` with hand-written `migrationBuilder.Sql`:

```sql
CREATE MATERIALIZED VIEW "NameSuggestions" AS
-- one row per ("Field", "NameLower"):
--   'nadac'   from "DrugPackages"."NdcDescription" (what the search matches), joined on "Ndc"
--             to each NDC's latest "NadacPrices" row (DISTINCT ON "Ndc" ORDER BY "AsOfDate"
--             DESC; ~3 s on dev) for its "IsOtc" and "AsOfDate" only
--   'brand'   from active "FdaProducts"."ProprietaryName"
--   'generic' from unnest(active "FdaProducts"."NonProprietaryName")
-- "Name"        a display form (MIN of the trimmed original casing)
-- "HasRx"       bool_or(not OTC)       -- nadac: not "IsOtc"; fda: "ProductTypeName" <> 'HUMAN OTC DRUG'
-- "HasPrices"   bool_or(an active package's NDC is in "DrugPackages")  -- nadac: true
-- "HasRxPrices" bool_or(not OTC and priced)
-- "LastAsOfDate"   nadac only: max latest "AsOfDate" over the name's NDCs; fda: NULL
-- "LastRxAsOfDate" nadac only: the same over its non-OTC NDCs; NULL when it has none
-- FDA rows: "DelistedAt" IS NULL on products and packages. Names shorter than 5 characters
-- (the search minimum) are left out.
...;
CREATE UNIQUE INDEX ON "NameSuggestions" ("Field", "NameLower");
CREATE INDEX ON "NameSuggestions" USING GIN ("NameLower" gin_trgm_ops);
```

`Down` drops it. Map a keyless entity `Models/NameSuggestion.cs` (`Field`, `Name`, `NameLower`,
`HasRx`, `HasPrices`, `HasRxPrices`, `LastAsOfDate`, `LastRxAsOfDate`) with
`HasNoKey().ToView("NameSuggestions")` in a new
`Data/Configurations/NameSuggestionConfiguration.cs`, plus a `DbSet` in `DrugPricingContext`.
`ToView` keeps EF from trying to create a table.

FDA `HasPrices` joins `DrugPackages` (one row per NDC NADAC has ever priced) rather than
scanning `NadacPrices`. The NADAC rows do scan `NadacPrices` once, for each NDC's latest OTC
flag and as-of date. The view depends on both loads, so **both orchestrators refresh it**:

- New `etl/library/suggestions.py`: `refresh_name_suggestions(conn)` runs
  `REFRESH MATERIALIZED VIEW CONCURRENTLY "NameSuggestions"`. Takes `conn`, never commits
  (connection ownership rule).
- `etl/fda/update_fda.py`: call it after `tombstone_absent`, inside the transaction, under
  `timed("FDA refresh suggestions")`.
- `etl/nadac/update_nadac.py`: refresh once per run, and only when something loaded. The
  "No new records to load" path loads nothing, and `update_nadac_for_dates` calls
  `update_nadac` once per date. So `update_nadac` returns whether `load_nadac` ran, and
  `update_nadac_for_dates` refreshes after the loop when any date loaded. That refresh gets its
  own connection and commit, under `timed("NADAC refresh suggestions")`. The loads are already
  committed by then; a failed refresh leaves yesterday's suggestions until the next run.

`CONCURRENTLY` works inside a transaction block (only `CREATE`/`DROP`/`REINDEX … CONCURRENTLY`
refuse one; checked on the dev Postgres 17.2). It takes `EXCLUSIVE`, which still lets
`/api/suggestions` read the old rows. A plain `REFRESH` takes `ACCESS EXCLUSIVE` until commit,
which would block every cache miss for the rest of the FDA load's transaction. `CONCURRENTLY`
needs the unique index on `("Field", "NameLower")` and a populated view (the migration creates
it with data). It diffs the rows, so it's slower: time both kinds in verification. `REFRESH`
must run as the view's owner, the role the server migrates with: confirm the ETL connects as
that role on the Pi (on dev both are `appuser`), or grant it `MAINTAIN` (Postgres 17).

### 2. Server: one suggest endpoint

Follow endpoint → service → repository, cache in the repository.

- `GET /api/suggestions?field=nadac|brand|generic&term=&includeOtc=false&includeWithoutPrices=false&since=`
  in a new `Endpoints/SuggestionEndpoints.cs`. The two flags mirror two of the page's Include
  boxes ("OTC drugs", "Results without prices"; NADAC has no prices box, and its rows are all
  priced). FDA's third box, "Sample packages", isn't mirrored (4 names; see the facts above).
  `since` is NADAC only: the start of the dates the search would load, omitted for an open
  start. Response `SuggestionResponse { Data: [{ Value, Match }] }`, `Match` = `"contains"`
  or `"similar"`.
- `Services/SuggestionService.cs` validates: term trimmed, length `MIN_SUGGEST_LENGTH = 3`
  (trigrams need 3 characters) to 100; unknown `field` → 400. Mirror `MIN_SUGGEST_LENGTH` in
  `client/src/library/constants.ts` and add it to the AGENTS.md "duplicated minimums"
  convention.
- `Data/Repositories/SuggestionRepository.cs`, `ListSuggestionsAsync`, in LINQ:
  - Lower-case the term (the column is lower-case).
  - `Field == field && (EF.Functions.ILike(NameLower, LikePattern.Contains(term), LikePattern.EscapeCharacter) || EF.Functions.TrigramsAreWordSimilar(term, NameLower))`.
    The contains branch goes through `LikePattern`, like every other search.
    `TrigramsAreWordSimilar` is the `<%` operator, which the GIN index serves
    (`TrigramsWordSimilarity(...) > x` would not). Mind the order: the term first. The stubbed
    `NadacRepository.ListAdvancedSearchResultsAsync` passes the column first, which measures
    something else; don't copy it.
  - FDA: the flags pick the column: neither box → `HasRxPrices`; OTC only → `HasPrices`; prices
    only → `HasRx`; both → no filter.
  - NADAC: with `includeOtc`, `LastAsOfDate >= since`; without it, `LastRxAsOfDate >= since`
    (or `HasRx` when `since` is omitted).
  - Order, in three tiers: (1) prefix matches (`ILike(NameLower, LikePattern.StartsWith(term))`,
    a new helper beside `Contains`), (2) the other contains matches, each by shorter then
    alphabetical; (3) similar matches by `TrigramsWordSimilarity(term, NameLower)` desc, then
    shorter, then alphabetical. `LIMIT 10`. The tiers keep the `groupBy` groups contiguous.
  - `Match` = `"contains"` for tiers 1 and 2, `"similar"` for tier 3.
  - Cache under a new `CacheKeys.Suggestions(field, term, includeOtc, includeWithoutPrices, since)`,
    with `_cache.Set` before returning (the repository rule).

### 3. Client: one suggest field that owns its query

- `src/api/types.ts`: `SuggestionResponse` wire type and `Suggestion = { value, match }`.
- `src/api/suggestionEndpoints.ts`: `getSuggestions(request, term, signal)`, passing React
  Query's `AbortSignal` so stale keystrokes are cancelled.
- `src/library/suggestions.ts` (pure, unit tested in `suggestions.test.ts`):
  `SuggestRequest = { field: "nadac" | "brand" | "generic", includeOtc: boolean,
  includeWithoutPrices: boolean, since?: string }` (`since` NADAC only, `YYYY-MM-DD` via
  `toDateInput`), `normalizeSuggestTerm` (trim, collapse spaces),
  `shouldSuggest(term)` (≥ `MIN_SUGGEST_LENGTH`), and `suggestionGroupLabel(match)`
  ("Matches" / "Did you mean").
- `src/hooks/useDebouncedValue.ts` (250 ms) and `src/hooks/useSuggestions.ts`: `useQuery` with
  key `["suggest", request, term]`, `enabled: active && shouldSuggest(term)`,
  `placeholderData: keepPreviousData` (no flicker between keystrokes), `staleTime` from
  `CONSTANT.staleTime`. No toast; a failed fetch shows no suggestions. While the query is off
  the hook returns no suggestions, so the placeholder never shows "eli"'s list once the term is
  cut to "el".
- `src/Components/SearchPanel/SuggestField.tsx` (beside `DatesField`; it's a panel field): MUI
  `Autocomplete` with `freeSolo` and controlled `inputValue`/`onInputChange`, so the page's
  draft string stays the source of truth and restored tabs and validation are unchanged.
  `onChange` writes a picked option's value to the draft too: the Autocomplete's `value` isn't
  the source of truth, so don't rely on MUI's input reset to fill the field.
  `filterOptions={(x) => x}` (the server filters), `groupBy` on `match`, `loading`,
  `autoHighlight={false}` so Enter submits what was typed unless the user arrowed onto a
  suggestion. It runs `useSuggestions` itself, active only while its listbox is open after the
  user typed (not on mount, focus or a restored value). Options wrap rather than overflow (long
  generic names). It renders the same `TextField` the panel uses today, so both layouts' sizes
  carry over. MUI supplies the combobox ARIA.

Panels:

- `SearchPanel` owns the term fields, which the pages pass as data (`TermField`). Give
  `TermField` an optional `suggest?: SuggestRequest`, and have `SearchPanel` render a
  `SuggestField` for a term that has one, in both layouts. The pages don't render fields or
  run the suggestion queries.
- `Components/NadacSearch/NadacSearchPanel.tsx`: Description gets
  `suggest: { field: "nadac", includeOtc: criteria.includeOtc, includeWithoutPrices: true,
  since }`, where `since` is the start of `resolveSearchDates(criteria.dates, lastAsOfDate)`
  (the dates the search would load; app-init's last as-of date, as `DatesField` uses). Presets
  resolve to the same date all week, so the cache key stays stable. Changing Dates changes
  what is suggested. The NDC field stays plain.
- `Components/FdaSearch/FdaSearchPanel.tsx`: Brand name (`brand`) and Generic name (`generic`),
  each with `includeOtc` and `includeWithoutPrices` from `criteria.includeOtc` and
  `criteria.includeResultsWithoutPrices`. Those boxes are refine fields, so ticking one changes
  what is suggested without fetching a search. Each field suggests on its own; the other
  field's draft doesn't narrow it.
- Picking a suggestion writes the panel's draft, like typing, so Search lights up as it does
  for typed text.

### 4. Docs

- AGENTS.md: the suggestions endpoint in the API list; the view and that both ETL paths
  refresh it; `MIN_SUGGEST_LENGTH` in the duplicated-minimums convention.
- docs/future-work.md: the "app-init names … autocomplete in the FDA search form" cleanup stays
  (dosage form/route are out of scope). Keep the entries this review added: the search minimum
  hides 17 priced brand names; suggest the drug word ("ELIQUIS") rather than a full strength
  description if suggestions that narrow to one strength confuse users; narrow one FDA field's
  suggestions by the other's draft if combined searches often land on nothing; `DrugPackages`
  keeps each NDC's first description, so neither search nor suggestions find its current one.

## PRs

Feature branch off `dev`, PR into `dev`. One PR is fine; if it's large, split as
(1) view + ETL refresh + server endpoint, (2) client `SuggestField` + both panels.

## Verification

- `dotnet ef migrations add AddNameSuggestions` from `server/`; startup `Migrate()` applies it.
  The local server on :5250 may not be watching, so check before trusting it to serve a server
  edit, or run a second instance on another port.
- In psql: `EXPLAIN ANALYZE` the generated suggest SQL (from the EF log) for each field and
  confirm the GIN trigram index is used; check the view's row counts against the table above
  (≈7.6K nadac, ≈37K brand, ≈16K generic, less the short names). Time a plain and a
  `CONCURRENTLY` refresh, and confirm a suggest query isn't blocked during the concurrent one.
- curl: `/api/suggestions?field=nadac&term=eliqus` → ELIQUIS descriptions as `similar`;
  `term=eli` → names starting "eli" first, then other contains matches; `term=el` → 400;
  `field=x` → 400. `field=nadac&term=saizen&since=<12 months back>` offers nothing (last priced
  2024-10), and without `since` offers SAIZEN 5 MG VIAL.
  `field=brand&term=ozempik` → OZEMPIC; `includeWithoutPrices=true` returns more;
  `field=brand&term=mucinex` offers MUCINEX only with `includeOtc=true` (OTC only, priced);
  `field=generic&term=semaglutid` → semaglutide; `field=brand&term=yaz` doesn't offer YAZ.
- ETL: `python drug_pricing_etl.py dev`, run FDA then NADAC; the `[timing]` lines show the
  refresh step, NADAC's once per run and not on a "No new records to load" run, and `pytest`
  still passes. On the Pi, check the first nightly run's refresh
  succeeds (the role owns the view) and how long it takes.
- Client: `npm test`, `npm run lint`, `npm run build`.
- Chrome on the dev workspace (desktop and ~390px wide): type "eliqus" on a NADAC tab, see
  "Did you mean"; arrow + Enter fills the field without searching; Enter with no highlight
  submits the typed text; NADAC Dates and OTC change what's suggested; FDA Brand and Generic
  suggest, and the OTC and prices boxes change what's suggested. Reload with a restored FDA tab and confirm no suggestion request goes out until
  you type. Check the compact layout in a workspace tab too.
