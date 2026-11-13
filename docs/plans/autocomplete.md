# Autocomplete for NADAC and FDA search (with misspelling suggestions)

## Context

Both search panels have plain text fields that need 5 exact characters before Search turns on,
and a typo ("eliqus", "ozempik") just returns nothing. Users don't know how NADAC words its
descriptions or which FDA brand names have prices. The goal: as the user types, suggest real
values from the data, including likely corrections of misspellings, so searches land.

Decided with the author:

- Fields: NADAC **Description**, FDA **Brand name** and FDA **Generic name**. All three are in
  the search panels already (`TermField`s of `SearchPanel`), so autocomplete only has to swap
  each for a `SuggestField`.
  No labeler, dosage form or route fields in this plan.
- Picking a suggestion **fills the field only**; the user still presses Search/Enter. Typed
  free text keeps working (the search stays a contains match).
- Misspellings return likely replacements, shown under a "Did you mean" group.

Facts from the dev DB (2026-11) that shape the design:

| Field | Distinct values | Notes |
| --- | --- | --- |
| NADAC descriptions (`DrugPackages`) | 7,579 | GIN `gin_trgm_ops` index on `NdcDescriptionLower` already exists |
| FDA brand names (active) | 37,351 | only **3,467** have any NADAC price; no trigram index |
| FDA generic names (`NonProprietaryName` is `text[]`) | 16,063 | can't trigram-index an array directly |

`'eliqus' <% "NdcDescriptionLower"` already returns the three ELIQUIS descriptions at word
similarity 0.71 (pg_trgm 1.6), so Postgres trigram matching is the fuzzy engine. Lists are too
big to ship to the client (37K brand names), so suggestions come from the server per keystroke
(debounced).

## Approach

### 1. Database: an FDA name-suggestion view (migration + ETL refresh)

New EF migration `AddFdaNameSuggestions` with hand-written `migrationBuilder.Sql`:

```sql
CREATE MATERIALIZED VIEW "FdaNameSuggestions" AS
-- one row per (Field, NameLower): 'brand' from ProprietaryName, 'generic' from unnest(NonProprietaryName)
-- Name = a display form (MIN of the original casing), HasPrices = bool_or(any active package NDC is in "DrugPackages")
-- active products only: "DelistedAt" IS NULL on products and packages
...;
CREATE UNIQUE INDEX ON "FdaNameSuggestions" ("Field", "NameLower");
CREATE INDEX ON "FdaNameSuggestions" USING GIN ("NameLower" gin_trgm_ops);
```

`Down` drops it. Map a keyless entity `Models/FdaNameSuggestion.cs` (`Field`, `Name`,
`NameLower`, `HasPrices`) with `HasNoKey().ToView("FdaNameSuggestions")` in a new
`Data/Configurations/FdaNameSuggestionConfiguration.cs`, plus a `DbSet` in
`DrugPricingContext`. `ToView` keeps EF from trying to create a table.

`HasPrices` uses `DrugPackages` (one row per NDC NADAC has ever priced) rather than scanning
`NadacPrices`, so the view refreshes fast. It depends on both loads, so **both orchestrators
refresh it**:

- New `etl/library/suggestions.py`: `refresh_fda_name_suggestions(conn)` runs
  `REFRESH MATERIALIZED VIEW "FdaNameSuggestions"`. Takes `conn`, never commits (connection
  ownership rule).
- `etl/fda/update_fda.py`: call it after `tombstone_absent`, inside the transaction, under
  `timed("FDA refresh suggestions")`.
- `etl/nadac/update_nadac.py`: call it after each `update_drug_package(conn)` (both paths,
  lines ~62 and ~72), under `timed(...)`.

A plain refresh locks the view until commit; the ETL runs at night and the refresh is the last
step, so a brief stall of suggestions is acceptable. NADAC needs no view: `DrugPackages` is
already distinct-ish and indexed (group by `NdcDescription` in the query).

### 2. Server: two suggest endpoints

Follow endpoint → service → repository, cache in the repository.

- `GET /api/nadac-prices/suggest?term=` in `Endpoints/NadacPriceEndpoints.cs`.
- `GET /api/fda-products/suggest?field=brand|generic&term=&pricedOnly=true` in
  `Endpoints/FdaProductEndpoints.cs`. `pricedOnly` mirrors the panel's "Include results without
  prices" box (unchecked by default), so users aren't steered to the 34K names whose search
  would show nothing.
- Response `SuggestionResponse { Data: [{ Value, Match }] }` (`Endpoints/SuggestionResponse.cs`),
  `Match` = `"contains"` or `"similar"`.
- Validation in the services (`NadacService`, `FdaProductService`): term trimmed, length
  `MIN_SUGGEST_LENGTH = 3` to 100 (trigrams need 3 characters), unknown `field` → 400.
  Mirror `MIN_SUGGEST_LENGTH` in `client/src/library/constants.ts` and note it in the AGENTS.md
  "duplicated minimums" convention.
- Repository query (`NadacRepository.ListDescriptionSuggestionsAsync`,
  `FdaProductRepository.ListNameSuggestionsAsync`), LINQ with Npgsql's trigram functions
  (already used in `NadacRepository`):
  - `WHERE ILIKE '%term%' OR EF.Functions.TrigramsAreWordSimilar(term, NameLower)` — the
    `<%` operator, which the GIN index serves (an explicit `TrigramsWordSimilarity(...) > x`
    would not use the index).
  - Order: contains matches first, then prefix matches, then `TrigramsWordSimilarity` desc,
    then shorter, then alphabetical. `LIMIT 10`.
  - `Match` = `"contains"` when the ILIKE matched, else `"similar"`.
  - Lower-case the term before matching (the columns are lower-case).
  - Cache under new keys `CacheKeys.NadacSuggest(term)` / `CacheKeys.FdaSuggest(field, term,
    pricedOnly)`, with `_cache.Set` before returning (the repository rule).

### 3. Client: one reusable suggest field

- `src/api/types.ts`: `SuggestionResponse` wire type and `Suggestion = { value, match }`.
- `src/api/nadacEndpoints.ts` / `fdaEndpoints.ts`: `getNadacDescriptionSuggestions(term,
  signal)`, `getFdaNameSuggestions(field, term, pricedOnly, signal)`, passing React Query's
  `AbortSignal` so stale keystrokes are cancelled.
- `src/library/suggestions.ts` (pure, unit tested): `normalizeSuggestTerm` (trim, collapse
  spaces), `shouldSuggest(term)` (≥ `MIN_SUGGEST_LENGTH`), and `suggestionGroupLabel(match)`
  ("Matches" / "Did you mean"). Test in `suggestions.test.ts`.
- `src/hooks/useDebouncedValue.ts` (250 ms) and `src/hooks/useSuggestions.ts`: `useQuery` with
  key `["suggest", source, field, term, pricedOnly]`, `enabled: shouldSuggest(term)`,
  `placeholderData: keepPreviousData` (no flicker between keystrokes), `staleTime` from
  `CONSTANT.staleTime`. No toast.
- `src/Components/ui/SuggestField.tsx`: MUI `Autocomplete` with `freeSolo`, controlled
  `inputValue`/`onInputChange` (the page's draft string stays the source of truth, so restored
  tabs and validation are unchanged), `filterOptions={(x) => x}` (the server filters),
  `groupBy` on `match`, `loading`, `autoHighlight={false}` so Enter submits what was typed
  unless the user arrowed onto a suggestion. Props: `label`, `id`, `value`, `onChange`,
  `suggestions`, `loading`, `size`. It renders the same `TextField` the panel uses today, so
  both layouts' sizes carry over. MUI supplies the combobox ARIA.

Panels (rewritten 2026-11-13: the search panels and the FDA Generic name field, with its
validity, tab title and persistence, were built since this plan was written):

- `SearchPanel` owns the term fields, which the pages pass as data (`TermField`). Give a
  `TermField` optional `suggestions` and `loading`, and have `SearchPanel` render a
  `SuggestField` for a term that has them, in both layouts. The pages don't render fields.
- `Components/NadacSearch/NadacSearchPanel.tsx`: Description gets
  `useSuggestions("nadac", …)`. The NDC field stays plain.
- `Components/FdaSearch/FdaSearchPanel.tsx`: Brand name (field `brand`) and Generic name
  (field `generic`) get suggestions. Both pass `pricedOnly` as the opposite of the criteria's
  "Include results without prices" box. That box is a refine field, so ticking it changes what
  is suggested without fetching a search.
- Picking a suggestion writes the panel's draft, like typing, so Search lights up as it does
  for typed text.

### 4. Docs

- AGENTS.md: the two suggest endpoints in the API list; the view and that both ETL paths
  refresh it; `MIN_SUGGEST_LENGTH` in the duplicated-minimums convention.
- docs/future-work.md: the "app-init names … autocomplete in the FDA search form" cleanup stays
  (dosage form/route are out of scope). Add an idea: suggest the drug word ("ELIQUIS") rather
  than a full strength description, if suggestions that narrow to one strength turn out to
  confuse users.

## PRs

Feature branch off `dev`, PR into `dev`. One PR is fine; if it's large, split as
(1) view + ETL refresh + server endpoints, (2) client `SuggestField` + both forms.

## Verification

- `dotnet ef migrations add AddFdaNameSuggestions` from `server/`; startup `Migrate()` applies
  it. The local server on :5250 may not be watching, so check before trusting it to serve a
  server edit, or run a second instance on another port.
- In psql: `EXPLAIN ANALYZE` the generated suggest SQL (from the EF log) for both sources and
  confirm the GIN trigram index is used; check row counts of the view (≈37K brand, ≈16K
  generic, ≈3.5K brand with prices).
- curl: `/api/nadac-prices/suggest?term=eliqus` → ELIQUIS descriptions as `similar`;
  `?term=eli` → contains matches first; `term=el` → 400.
  `/api/fda-products/suggest?field=brand&term=ozempik` → OZEMPIC; `pricedOnly=false` returns
  more; `field=generic&term=semaglutid` → semaglutide.
- ETL: `python drug_pricing_etl.py dev`, run FDA then NADAC; the `[timing]` lines show the
  refresh step, and `pytest` still passes.
- Client: `npm test`, `npm run lint`, `npm run build`.
- Chrome on the dev workspace (desktop and ~390px wide): type "eliqus" on a NADAC tab, see
  "Did you mean"; arrow + Enter fills the field without searching; Enter with no highlight
  submits the typed text; FDA Brand and Generic suggest, and the "Include results without
  prices" box changes what's suggested. Check the compact layout in a workspace tab too.
