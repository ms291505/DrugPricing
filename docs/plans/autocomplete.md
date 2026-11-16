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
- **NADAC gets rows in the view too.** OTC is per NDC on `NadacPrices`, which `DrugPackages`
  doesn't carry, so NADAC can't suggest straight from `DrugPackages` any more.
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
| NADAC descriptions | 7,574 | all | 1,957 |
| FDA brand names (`ProprietaryName`, active) | 37,184 | 3,471 | 1,077 |
| FDA generic names (`NonProprietaryName`, active, unnested) | 15,834 | 2,073 | 404 |

- "OTC only" uses each page's own rule: NADAC, every NDC's latest price has `IsOtc`; FDA, every
  priced product's `ProductTypeName` is `HUMAN OTC DRUG` (`isFdaProductOtc`).
- `NonProprietaryName` is a `text[]` split on `;`, but only 2 active products have more than one
  element: in practice it holds one name, often a combination ("acetaminophen and codeine
  phosphate"). Casing varies (19,557 spellings of 15,834 lower-case names). 2,500 generic names
  are over 100 characters (the longest, homeopathic mixes, are 512).
- 208 priced brand names and 81 generics have no price in the last 12 months (the default
  search dates). The view says "ever priced", so these are still suggested and the table's
  hidden-results hint explains the empty default view. Acceptable; not worth a date column.

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
--   'nadac'   from "NadacPrices"."NdcDescription", each NDC's latest row (DISTINCT ON "Ndc"
--             ORDER BY "AsOfDate" DESC; ~3 s on dev)
--   'brand'   from active "FdaProducts"."ProprietaryName"
--   'generic' from unnest(active "FdaProducts"."NonProprietaryName")
-- "Name"        a display form (MIN of the trimmed original casing)
-- "HasRx"       bool_or(not OTC)       -- nadac: not "IsOtc"; fda: "ProductTypeName" <> 'HUMAN OTC DRUG'
-- "HasPrices"   bool_or(an active package's NDC is in "DrugPackages")  -- nadac: true
-- "HasRxPrices" bool_or(not OTC and priced)
-- FDA rows: "DelistedAt" IS NULL on products and packages. Names shorter than 5 characters
-- (the search minimum) are left out.
...;
CREATE UNIQUE INDEX ON "NameSuggestions" ("Field", "NameLower");
CREATE INDEX ON "NameSuggestions" USING GIN ("NameLower" gin_trgm_ops);
```

`Down` drops it. Map a keyless entity `Models/NameSuggestion.cs` (`Field`, `Name`, `NameLower`,
`HasRx`, `HasPrices`, `HasRxPrices`) with `HasNoKey().ToView("NameSuggestions")` in a new
`Data/Configurations/NameSuggestionConfiguration.cs`, plus a `DbSet` in `DrugPricingContext`.
`ToView` keeps EF from trying to create a table.

FDA `HasPrices` joins `DrugPackages` (one row per NDC NADAC has ever priced) rather than
scanning `NadacPrices`. The NADAC rows do scan `NadacPrices` once, for each NDC's latest OTC
flag. The view depends on both loads, so **both orchestrators refresh it**:

- New `etl/library/suggestions.py`: `refresh_name_suggestions(conn)` runs
  `REFRESH MATERIALIZED VIEW "NameSuggestions"`. Takes `conn`, never commits (connection
  ownership rule).
- `etl/fda/update_fda.py`: call it after `tombstone_absent`, inside the transaction, under
  `timed("FDA refresh suggestions")`.
- `etl/nadac/update_nadac.py`: call it after each `update_drug_package(conn)` (both paths,
  lines ~62 and ~72), under `timed("NADAC refresh suggestions")`.

A plain refresh locks the view until commit; the ETL runs at night and the refresh is the last
step, so a brief stall of suggestions is acceptable. (`CONCURRENTLY` can't run inside the
transaction the orchestrators hold.) `REFRESH` must run as the view's owner, the role the
server migrates with: confirm the ETL connects as that role on the Pi (on dev both are
`appuser`), or grant it `MAINTAIN` (Postgres 17).

### 2. Server: one suggest endpoint

Follow endpoint → service → repository, cache in the repository.

- `GET /api/suggestions?field=nadac|brand|generic&term=&includeOtc=false&includeWithoutPrices=false`
  in a new `Endpoints/SuggestionEndpoints.cs`. The two flags mirror the page's Include boxes
  ("OTC drugs", "Results without prices"; NADAC has no prices box, and its rows are all
  priced). Response `SuggestionResponse { Data: [{ Value, Match }] }`, `Match` = `"contains"`
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
  - The flags pick the column: neither box → `HasRxPrices`; OTC only → `HasPrices`; prices only
    → `HasRx`; both → no filter.
  - Order: contains matches first, then prefix matches, then `TrigramsWordSimilarity(term,
    NameLower)` desc, then shorter, then alphabetical. `LIMIT 10`.
  - `Match` = `"contains"` when the ILIKE matched, else `"similar"`.
  - Cache under a new `CacheKeys.Suggestions(field, term, includeOtc, includeWithoutPrices)`,
    with `_cache.Set` before returning (the repository rule).

### 3. Client: one suggest field that owns its query

- `src/api/types.ts`: `SuggestionResponse` wire type and `Suggestion = { value, match }`.
- `src/api/suggestionEndpoints.ts`: `getSuggestions(request, term, signal)`, passing React
  Query's `AbortSignal` so stale keystrokes are cancelled.
- `src/library/suggestions.ts` (pure, unit tested in `suggestions.test.ts`):
  `SuggestRequest = { field: "nadac" | "brand" | "generic", includeOtc: boolean,
  includeWithoutPrices: boolean }`, `normalizeSuggestTerm` (trim, collapse spaces),
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
  `suggest: { field: "nadac", includeOtc: criteria.includeOtc, includeWithoutPrices: true }`.
  The NDC field stays plain.
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
  suggestions by the other's draft if combined searches often land on nothing.

## PRs

Feature branch off `dev`, PR into `dev`. One PR is fine; if it's large, split as
(1) view + ETL refresh + server endpoint, (2) client `SuggestField` + both panels.

## Verification

- `dotnet ef migrations add AddNameSuggestions` from `server/`; startup `Migrate()` applies it.
  The local server on :5250 may not be watching, so check before trusting it to serve a server
  edit, or run a second instance on another port.
- In psql: `EXPLAIN ANALYZE` the generated suggest SQL (from the EF log) for each field and
  confirm the GIN trigram index is used; check the view's row counts against the table above
  (≈7.6K nadac, ≈37K brand, ≈16K generic, less the short names) and time its refresh.
- curl: `/api/suggestions?field=nadac&term=eliqus` → ELIQUIS descriptions as `similar`;
  `term=eli` → contains matches first; `term=el` → 400; `field=x` → 400.
  `field=brand&term=ozempik` → OZEMPIC; `includeWithoutPrices=true` returns more;
  `field=brand&term=mucinex` offers MUCINEX only with `includeOtc=true` (OTC only, priced);
  `field=generic&term=semaglutid` → semaglutide; `field=brand&term=yaz` doesn't offer YAZ.
- ETL: `python drug_pricing_etl.py dev`, run FDA then NADAC; the `[timing]` lines show the
  refresh step, and `pytest` still passes. On the Pi, check the first nightly run's refresh
  succeeds (the role owns the view) and how long it takes.
- Client: `npm test`, `npm run lint`, `npm run build`.
- Chrome on the dev workspace (desktop and ~390px wide): type "eliqus" on a NADAC tab, see
  "Did you mean"; arrow + Enter fills the field without searching; Enter with no highlight
  submits the typed text; FDA Brand and Generic suggest, and both Include boxes change what's
  suggested. Reload with a restored FDA tab and confirm no suggestion request goes out until
  you type. Check the compact layout in a workspace tab too.
