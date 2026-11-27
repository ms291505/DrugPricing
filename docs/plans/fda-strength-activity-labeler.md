# FDA search: strength and price activity filters, and a labeler search

## Context

The FDA page can narrow results by product NDC, dosage form, route, labeler, and pricing unit
(More filters), but not by strength, and not by the Price Activity states the table already
computes. You can only find "every package of this drug whose price dropped" by sorting the
Price Activity column. You also can't search by company at all: the More filters Labeler list
only narrows a result that a brand or generic name already loaded.

This plan adds three things to the FDA page:

1. **Strength**, a refine field: a From results list like the others in More filters.
2. **Price activity**, a refine field: Dropped, Rose, Dipped or spiked, Stable, and
   Insufficient history, the same wording the column uses.
3. **Labeler**, a load field: a combo box beside Brand name and Generic name. You type part of
   a company name, misspelled or not ("pfeizer"), pick one or more labelers from the list, and
   Search loads the named drug's products from those labelers only. **A labeler alone is not a
   search** (decided by the author, 2026-11-27): a brand or generic name is still required,
   and the picks narrow what it loads, so "chloride" plus one company can fit under the row cap.
   **Picks apply at once, like Dates** (also decided 2026-11-27): only a name change waits for
   Search. A load whose labeler codes hold the new picks is filtered in the client (a load with
   no picks holds every labeler for its names); anything else fetches, and so does any change
   after the cap refused the load. An always-visible "Can't find a company?" link under the
   field opens the Help section, and on compact panels Labeler's row comes before Search.

Strength and Price activity are client-only and can ship on their own. Labeler needs the
server and the client.

## Facts from the dev DB (2026-11-27) that shape the design

### Strength

- Strength is per product, as two parallel arrays (`StrengthNumber`, `StrengthUnit`); the
  tables show it with `formatStrength` ("500 mg/1", "5 mg/1, 1000 mg/1" for a combination).
- Of 115,531 active products, 22,537 have more than one ingredient strength and 2,508 have none.
- Metformin hydrochloride (generic) has 6 strengths: 500 mg/1 (165 products), 1000 mg/1 (102),
  850 mg/1, 750 mg/1, 500 mg/5mL, and 625 mg/1. Sorted as text, 1000 would come before 500.

### Labelers

- 7,821 distinct `LabelerName` spellings on active products, but only 5,405 labeler codes (the
  first segment of `ProductNdc`). Spelling is very inconsistent within one company. Labeler code
  43598 alone carries 28 spellings of Dr. Reddy's Laboratories Inc, including "Labortories",
  "Reddy¿s", and a Windows-1252 apostrophe (`\u0092`). Across its 4 codes, Dr. Reddy's has 43.
- One company often has several codes and several labeler names: Pfizer Laboratories Div Pfizer
  Inc is on 7 codes, and Wyeth (3 codes), Parke-Davis, and Global Blood Therapeutics are each
  listed as "a subsidiary of Pfizer". Teva Pharmaceuticals USA has 7 spellings on 10 codes.
- **The labeler is the NDC registrant, not always the company people know.** No labeler name
  contains "Bristol"; its products are listed under E.R. Squibb & Sons. Fuzzy matching can't
  bridge that, so parent-company aliases are left out (see "Left out").
- Grouping names that normalize the same (lower case, apostrophes and punctuation removed,
  trailing Inc/LLC/Ltd/Limited/Corp words dropped) *or* share a labeler code gives **5,128
  labeler groups, 425 of them with NADAC prices**. Checked on the real list: the 43 Dr. Reddy's
  spellings become one group, and the largest merges are real (one repackager's typos, one
  retailer's store brands on a shared code: "Dollar General", "DG Health", "Rexall").
- The grouped list as JSON (display name, codes, other spellings, flags) is 517 KB, 89 KB
  gzipped. Only the priced groups would be 45 KB, 8 KB gzipped.
- Labeler-only searches (since ruled out, see "Labeler" above) would stay well under the 200,000-row cap from
  [search-result-cap.md](search-result-cap.md) over the default 12 months: Aurobindo Pharma
  Limited, the largest, is 2,779 packages and 55,790 price rows; Teva Pharmaceuticals USA,
  33,876. Over all dates, Aurobindo is 223,609 price rows and would be refused. So **the
  result cap must ship before the labeler search** (see PRs): without it, an all-dates
  labeler search loads and serializes every row (about 110 MB of JSON for Aurobindo).
- The labeler groups with the most codes: Par Health USA 13, Sun Pharmaceutical Industries
  11, Teva Pharmaceuticals USA 10, Takeda 9, Amneal 8, Pfizer Laboratories and Allergan 7.
  The ten largest add up to 83, so a limit on picks doesn't bound the codes a search sends.

### Fuzzy matching

Postgres trigram matching, which the [autocomplete plan](autocomplete.md) uses, is a poor fit
here. `word_similarity` misses "pfeizer" → Pfizer (a short word has too few trigrams), "glaxo
smith kline" → GlaxoSmithKline and "novo nordisc" → Novo Nordisk; it found only
"astrazenica" of the four tried. A per-word edit distance, prototyped on the real list, finds
all of them:

| Typed | Top match |
| --- | --- |
| pfeizer, pfiser | Pfizer Laboratories Div Pfizer Inc (then Wyeth, Parke-Davis) |
| glaxo smith kline | GlaxoSmithKline LLC |
| astrazenica | AstraZeneca Pharmaceuticals LP |
| jansen | Janssen Pharmaceuticals, Janssen Biotech, Janssen Products |
| merk | Merck Sharp & Dohme LLC |
| abvie | AbbVie Inc. |
| eli lily | Eli Lilly and Company |
| tiva | Teva Pharmaceuticals USA Inc, then the other Teva labelers |
| novo nordisc | Novo Nordisk (all three) |
| sandos | Sandoz Inc |
| squib | E.R. Squibb & Sons |

## Decisions

### Matching runs in memory, but in the client, with the list cached on the server

Decided with the author (2026-11-27): the matching runs in memory, not in SQL, and the server
builds and caches the list of unique labelers. The whole grouped list goes to the client once,
and the client matches there, instead of a server endpoint that matches on every keystroke:

- **It can be tested.** The matcher is the part most likely to need tuning, and the project
  has unit tests only for `client/src/library/` (Vitest). The server has no test project.
- **It's small.** 89 KB gzipped, fetched once when the Labeler field is first used and kept
  for the session. The FDA load changes it at most once a day.
- **It's instant and private.** Suggestions don't wait on a round trip to the Pi, and nothing
  you type in the field leaves the browser. [Search privacy](search-privacy.md) moves search
  terms out of URLs and logs. A per-keystroke `GET ?term=` would add one more place where
  terms appear.

The server does the part the client can't: it reads the labeler names and codes, groups them
(this needs codes, which the client doesn't have for products it hasn't loaded), and caches
the result.

### A labeler selection is a set of labeler codes

Picking a labeler stores its display name (for the chip) and its labeler codes. The search
sends the codes, and the server matches products whose `ProductNdc` starts with one of them.
Codes are FDA-assigned and don't change when a spelling does, so a saved tab still finds the
company's products after the next FDA load. Matching on names would miss every spelling the
list didn't have when the tab was saved.

### Price activity filters packages, at both detail levels

The filter hides packages whose activity category is unchecked. A product shows while any of
its packages still shows, as with the existing package filters (sample packages, pricing
units), and a product row's activity is then computed from its shown packages. That keeps
`refineFda` the same at both detail levels: the FDA view relies on that, so a detail-level
switch doesn't reset price change scans or charts (AGENTS.md). Filtering product rows by their
own representative state would hide, under Dropped, a product whose drop was outranked by a
larger rise in another package.

## Approach

### 1. Strength filter (client)

- `library/searchCriteria.ts`: add `excludedStrengths: string[]` to `FdaCriteria`, to
  `createFdaCriteria`, to `FdaExclusionKey` and `FDA_EXCLUSION_KEYS` (so a new search clears
  it, Clear filters resets it, and More filters counts it). `refineFda`'s `showsProduct` checks
  `!criteria.excludedStrengths.includes(strengthLabel(p))`. `fdaFilterOptions` lists each
  product's `strengthLabel`.
- `strengthLabel(product)`: `formatStrength`, or "Not listed" for the 2,508 products without
  one, so the value can be excluded like any other. Move `formatStrength` from `resultRows.ts`
  to a small `library/strength.ts` beside `strengthLabel` and `compareStrength`, so
  `searchCriteria.ts` doesn't import the rows module.
- `compareStrength`: by the first ingredient's number as a number, then its unit, then the
  rest as text; "Not listed" last. `fdaFilterOptions` sorts strengths with it, not
  `uniqueSorted`. Tests: 500 before 1000; "500 mg/1" before "500 mg/5mL"; combinations; a
  number FDA writes as ".5" or "0.5".
- `FdaSearchPanel`'s `LISTS`: Strength after Dosage form, noun "strengths".
- `persist.ts`: read `excludedStrengths` with the other exclusion lists, defaulting to `[]`.
  No `VERSION` bump.

### 2. Price activity filter (client)

Categories, in this order, each named by the word the row's label starts with:

| Category | Rows whose label starts with | From `PriceActivity` |
| --- | --- | --- |
| Dropped | "Dropped" or "Down" | `significant` whose largest change is a drop, or `changed` with a net fall |
| Rose | "Rose" or "Up" | `significant` whose largest change is a rise, or `changed` with a net rise |
| Dipped or spiked | "Dipped" or "Spiked" | `changed`, back within 5% of where it started |
| Stable | "Stable" | `stable` |
| Insufficient history | "1 observation" | `insufficient` with one price |

The rule is simple to state: **the category is what the row says.** Significant steps (10%+)
and gradual net changes both count as Dropped or Rose; the label and the column's sort still
tell them apart. A change from $0 is a rise.

- `library/priceActivity.ts`: add `category: ActivityCategory | null` to `PriceActivity`, set
  in `packageActivity` in the same branch that writes its label, so the two can't drift.
  `mixed` and "No price history" get `null`. `ACTIVITY_CATEGORIES` holds the order and labels.
  Tests: one per row of the table, a drop followed by a larger rise (Rose, as its label says),
  and from $0.
- `searchCriteria.ts`: add `excludedActivities: ActivityCategory[]` to `FdaCriteria`.
  `refinePackage` hides a package with prices in the shown dates whose
  `packageActivity(nadacPrices).category` is excluded. Packages without prices are left to the
  "Results without prices" box, and a `null` category (a package priced in two units) is never
  hidden by this filter; the Pricing unit list covers it.
- It's a fixed refine field, like the Include boxes, so **a new search keeps it**: don't add it
  to `FDA_EXCLUSION_KEYS`'s clearing in `applyFdaSearch`, but do count it in
  `fdaActiveFilterCount` and the More filters count, and reset it in `clearFdaRefine` and
  `showAllFda`. An empty table that it causes gets the existing hint (`hiddenResultsHint`'s
  "clear" or "all").
- `fdaFilterOptions` lists the categories the shown packages have (computed with every
  exclusion cleared, like the others), in table order, not alphabetical.
- `ExclusionSelect` gains an optional `optionLabel?: (value: string) => string`, since the
  stored values are keys, and keeps the given option order. Price activity goes first in
  More filters, noun "activity types".
- `persist.ts`: read `excludedActivities`, keeping only known categories.
- **Cost:** `refineFda` runs several times per render (`fdaHiddenCounts` calls it once per
  Include box, for Clear, and for Show all), and `packageActivity` is the expensive part. Skip
  the activity work when `excludedActivities` is empty and options aren't being computed. Then
  measure on FDA generic "metformin" (1,893 packages). If it's slow, cache each package's
  category in a `WeakMap` keyed by the package, holding the shown dates and excluded units it
  was computed for.
- Columns: add "Dropped, rose, dipped or spiked" and so on to the Price Activity column's
  `description`, so the header tooltip uses the filter's words.

### 3. Labeler list (server)

- `Data/Repositories/FdaProductRepository.cs`, `ListLabelerRowsAsync`: one query over active
  products (`DelistedAt == null`) and their active packages, grouped by `LabelerName` and
  labeler code (`ProductNdc.Substring(0, ProductNdc.IndexOf("-"))`; check that Npgsql
  translates it to `strpos`/`substr`), with `ProductCount`, `HasRx`, `HasPrices`, and
  `HasRxPrices`, computed as the autocomplete plan defines them (priced means the package's
  stripped NDC is in `DrugPackages`). That's about 8,200 rows. Cache under a new
  `CacheKeys.FdaLabelers` with `_cache.Set`, for a new `CacheDuration.Reference` of one hour.
  Give the entry a `Size` if [search-result-cap.md](search-result-cap.md) has set the cache's
  `SizeLimit` by then.
- `Services/LabelerGroups.cs` (pure, no EF): normalizes names and groups them with a
  union-find over normalized names and codes, then returns one `LabelerGroup` per group:
  - `Name`: the spelling with the most products.
  - `Codes`: sorted.
  - `Spellings`: the other normalized spellings, for matching. Only the display name is shown.
  - `ProductCount`: the sum of its rows' `ProductCount`. Each product has one labeler name
    and one code, so it falls in exactly one row and the sum counts it once. The matcher
    breaks ties on it.
  - `HasRx`, `HasPrices`, `HasRxPrices`: ORed over the group.
- **Normalization** (written once, mirrored in the client's matcher, each with a comment
  pointing at the other): lower case; delete `'`, `’`, `` ` ``, `\u0092` and `¿` (so
  "Reddy's", "Reddys", and "Reddy¿s" agree); any other non-alphanumeric run becomes a space;
  drop trailing corporate words (inc, llc, lp, ltd, limited, corp, corporation, co, company,
  plc, sa, ag, gmbh) but never the first word.
- `FdaProductService.ListLabelerGroupsAsync`, and `GET /api/fda-products/labelers` →
  `{ data: LabelerGroup[] }`. Warm it in `CacheWarmingService`. It isn't in `app-init`, which
  every page waits for; 517 KB would slow startup for a field most visits don't use. Response
  compression is not needed (decided 2026-11-27): the list is fetched once per session.

### 4. Labeler search (server)

- `AdvancedFdaSearchRequest`: replace the unused `LabelerName` with
  `LabelerCodes: ICollection<string>`. The repository filters
  `patterns.Any(pattern => EF.Functions.Like(p.ProductNdc, pattern))` with
  `patterns = codes.Select(code => code + "-%")`, which Npgsql translates to `LIKE ANY`.
  Codes are digits only, so they need no `LikePattern` escaping; that's why validation
  insists on digits.
- Validation (`FdaProductService`): each code is 4 to 6 digits (FDA's planned 12-digit NDC
  gives labelers 6), and a request has at most `SearchLimits.MaxLabelerCodes` = 100 distinct
  codes (in `server/Constants/`, beside the cap's `MaxRows`). That fits ten of the largest
  groups (83 codes), and a `LIKE ANY` over 100 patterns against 115K products is still cheap
  (check it in the EF log's timing). The client mirrors the constant
  (`MAX_LABELER_CODES` in `library/constants.ts`); add it to AGENTS.md's duplicated-limits
  convention. A request is valid only with a brand or generic name of at least 5 characters;
  labeler codes narrow it and never stand alone (codes alone are a 400, decided 2026-11-27).
  The error message stays "No valid brand or generic name was provided."
- **Requires the result cap** ([search-result-cap.md](search-result-cap.md)). Its bounded
  count runs on the same product query, so the labeler filter must be applied before the
  count, not only to the loaded rows. Then an oversized labeler search is refused with the
  cap's 422 before any price rows load.

### 5. Labeler field (client)

- `src/api/types.ts` and `fdaEndpoints.ts`: the `LabelerGroup` wire type,
  `getFdaLabelers()`, and `labelerCodes` on `AdvancedFdaSearchRequest` (replacing
  `labelerName`).
- `library/labelers.ts` (pure, tested in `labelers.test.ts`): `normalizeLabeler`, and
  `matchLabelers(index, term, flags) → LabelerMatch[]`, with `buildLabelerIndex(groups)` run
  once per list:
  - Terms of at least 2 characters (3M is a labeler).
  - Flags follow the page's Include boxes, as the autocomplete plan's do: neither box → only
    `HasRxPrices`; OTC → `HasPrices`; without prices → `HasRx`; both → every group.
  - **Tiers**, best first: (1) a spelling starts with the term; (2) a word of a spelling
    starts with it ("sun pharma" finds Sun Pharmaceutical, not Fosun); (3) the term appears
    inside a spelling; (4) fuzzy: every word of the term, ignoring corporate words, matches a
    word of one spelling. A word matches exactly, as a word's prefix (3+ letters), or within an
    optimal string alignment (Damerau–Levenshtein) distance of 1 for 4–7 letters or 2 for 8 or
    more. Also in tier 4, the term with its spaces removed matches 2 or 3 adjacent words joined
    ("glaxo smith kline" → "glaxosmithkline"). A fuzzy prefix match costs half a point more
    than a whole-word one, so "merk" ranks Merck above Marketing.
  - Within a tier: lower cost, then larger `productCount`, then name. At most 20 matches,
    cut after sorting.
  - Each match says which spelling matched, so an option can show "Listed as Rexall" when
    that isn't the display name.
  - The index maps each word, and each join of 2 or 3 adjacent words, to its groups (about
    24,000 entries), so a term word is compared once per vocabulary entry rather than once per
    group. Skip entries whose length differs by more than the allowed distance before
    computing one.
  - Tests: the table under "Fuzzy matching" as fixtures (a trimmed list built from the real
    names), the Dr. Reddy's spellings all normalizing alike, the tier order, the flags,
    "fosun" not matching "sun" in tier 2, and the word-start flag the hint reads ("pfizer":
    true; "shire" and "pfeizer": false). A tie-break test: 21 groups in one tier at the same
    cost, where only `productCount` separates the 20th and 21st, and the cut keeps the larger.
    `labelerCodeCount` counts a code shared by two picks once.
- `hooks/useFdaLabelers.ts`: `useQuery(["fdaLabelers"], getFdaLabelers)`, `enabled` only once
  the field has been focused, `staleTime: Infinity` for the session, and the index built in a
  `useMemo` on the data. A restored tab shows its chips from the stored names without fetching.
- `library/searchCriteria.ts`:
  - `LabelerChoice = { name: string, codes: string[] }`.
  - `FdaCriteria.labelers: LabelerChoice[]`, a load field written at once like Dates (not part
    of `FdaTerms`, 2026-11-27), so a pick change isn't a new search: exclusions stay and no
    result toast shows. `nextLoad` takes FDA's `fdaLoadHolds` (names, covered dates, and codes
    that hold the picks), and `refineFda` filters by the picks with the server's prefix rule.
  - `FdaLoad` carries the sorted codes, so `nextLoad`'s comparison doesn't depend on the order
    the labelers were picked in.
  - `isValidFdaSearch` still needs a name; picks don't count (2026-11-27). A saved tab with
    picks and no name restores the picks and doesn't search until a name is typed.
  - `fdaSearchLabel`, `fdaResultsLabel`, and `fdaTabTitle` add the labeler: the first name,
    plus "+2" for more ("ELIQUIS / TEVA PHARMACEUTICALS USA, INC. +1").
- `persist.ts`: read `labelers` field by field (a name string and codes of digits), default
  `[]`; legacy tabs get `[]`. Keep picks in their stored order while the distinct codes stay
  within `MAX_LABELER_CODES`, and drop the rest. A pick stores its codes, so a saved tab
  passes the limit unless the constant is lowered or the stored value was edited; dropping
  keeps the restored search valid instead of a 400 on load. Test it in `persist.test.ts`.
- `Components/SearchPanel/LabelerField.tsx`: MUI `Autocomplete` with `multiple`, not `freeSolo`
  (a labeler must be picked from the list), `filterOptions={x => x}` (the matcher filters),
  options grouped by match tier ("Matches" for tiers 1–3, "Did you mean" for 4, the
  autocomplete plan's wording), chips for the picks, `limitTags` on narrow layouts, and the
  panel's own `TextField` sizes. The input clears on blur, so unpicked text never waits
  silently. MUI provides the combobox ARIA and the chips' keyboard removal.
- **The code limit, not a pick limit.** `labelerCodeCount(choices)` (in `labelers.ts`,
  tested) counts the distinct codes of the picks. An option that would take the count past
  `MAX_LABELER_CODES` is disabled (`getOptionDisabled`), and while any option is disabled
  for that reason, a line under the field reads "Too many labelers to search at once. Remove
  one to add another." Users never see the word "code": it isn't theirs. The line is in an
  always-mounted `role="status"` element, so a screen reader hears it when it appears.
- **When the company isn't found.** A labeler is the company that registered the NDC, so a
  parent company's products can be under a subsidiary's name, and the matcher can't know that
  (see "Labelers" under the facts). Two notes point to the brand-name search, which shows the
  labeler for any drug:
  - No matches: `noOptionsText` reads "No labelers match. Products are listed under the
    company that registered the NDC, which may be a subsidiary. Search by brand name to see
    the labeler." It ends with a "Learn more" link to the Help section below
    (`openHelp`). Since 2026-11-27, the field's always-mounted `role="status"` line also says
    the active note (visually hidden; the popup shows it), because a combo box announces only
    its options, and an always-visible "Can't find a company?" link under the field opens the
    same section from the keyboard's tab order (the popup's Learn more closes with the popup).
  - Matches, but none where a word starts with the term (no tier 1 or 2 match): a one-line
    hint under the last group reads "Not the company you meant? Search by brand name to see
    the labeler." Typing "shire" (now part of Takeda, with no labeler of its own) offers only
    Wilshire Pharmaceuticals (the term inside a word) and a fuzzy near-miss, so the no-match
    note would never show for it. "bristol" matches nothing and gets the no-match note.
    `matchLabelers` returns whether any tier 1–2 match was found, so the field doesn't work it
    out again. A misspelling of a real labeler ("pfeizer") also gets the hint under its "Did
    you mean" matches. It's still true there, and telling the two cases apart would need the
    alias data this plan leaves out. Render the hint as a non-option row in the listbox (a `ListboxComponent`
    footer), so arrow keys skip it and it isn't read as an option.
    Check it with VoiceOver in the Simulator's Safari if available, else the macOS one.
  - Both notes are short on purpose: the Help section holds the example.
- `SearchPanel`: `TermField` becomes a union of today's text field and
  `{ kind: "labelers", value, onChange, includeOtc, includeWithoutPrices }`, rendered as
  `LabelerField` in both layouts. `FdaSearchPanel` passes Brand name, Generic name, and Labeler;
  the panel owns the arrangement (a third field on the desktop row; on compact, the names'
  row, then Labeler with Search and Clear search beside it, so the visual order matches focus
  order; stacked on narrow panels; 2026-11-27).
- `FdaSearchPanel`: the picks are not a draft (2026-11-27): the field writes the applied
  criteria at once, like Dates, so `changed` compares only the names and Search stays disabled
  while only picks changed. Clear search clears them with the rest. `autoHighlight` makes Enter
  pick the top match while the list is open; with it closed, Enter submits the form.
- NADAC handoff (`fdaNadacHandoff.ts`): a labeler has no NADAC field, so a name plus labeler
  hands off the name only.
- **Two controls named Labeler.** The More filters list still narrows a loaded result by
  `LabelerName`. Rename it "Labeler in results" (noun "labelers") so the two have different
  accessible names. It still lists each spelling separately, which is its own follow-up.

### 6. Docs

- AGENTS.md: the labelers endpoint in the API list; labeler groups (normalization, union by
  code, cached list, client-side matching, the mirrored normalization); the labeler search's
  codes; the activity filter's "category is what the row says" rule, and that it filters
  packages; the shared search-validity rule now includes labelers; `MaxLabelerCodes` /
  `MAX_LABELER_CODES` in the duplicated-limits convention.
- Help: [filters-and-hidden-results.md](../../client/src/content/help/filters-and-hidden-results.md)
  (Strength, Price activity, the renamed list),
  [the-fda-directory.md](../../client/src/content/help/the-fda-directory.md) and the Searching
  article (search by labeler, misspellings).
- Help, a new section in the Searching article, "Finding a company's products", which the
  combo box's notes link to (link to the section's anchor in the existing topic; no new topic
  ID). It explains that a labeler is the company that registered the NDC (linking the
  glossary), so a parent company's products may be listed under a subsidiary's name, with one
  example: Bristol Myers Squibb's Eliquis is listed under E.R. Squibb & Sons. Then the steps:
  search the brand name, read the Labeler column, and search that labeler. Typing the parent's
  name finds labelers that name it ("a subsidiary of Pfizer Inc."). No list of parent
  companies: it would be hand-kept, acquisitions change it, and the data can't check it
  (Mylan's products are still under Mylan names, not Viatris).
- [future-work.md](../future-work.md): this plan under Decided, the follow-ups below, and the
  autocomplete entry's "Labeler … out of scope" now points here.

## PRs

This plan ships through `coordinated-work` with the [result cap](search-result-cap.md) and
[search privacy](search-privacy.md) plans. One feature branch, `feat/fda-strength-activity-labeler`,
off `coordinated-work`, with one PR into `coordinated-work`. The two parts below can be mini-PRs
into the feature branch. Two parts:

1. **Strength and Price activity filters** (client only, sections 1–2). No dependencies.
2. **Labeler search** (sections 3–5): server list and search, then the client field. It
   starts only after the [result cap](search-result-cap.md) PR has merged into `coordinated-work`
   (the feature branch then merges `coordinated-work` in), since a labeler search can ask for
   more rows than the cap allows (planned when a labeler alone could search; the cap still
   bounds a broad name plus a large labeler). It doesn't depend on PR 1.

Docs go with the PR they describe.

## Verification

- `npm test`, `npm run lint`, and `npm run build`; `dotnet build`.
- curl: `/api/fda-products/labelers` returns about 5,100 groups, one Dr. Reddy's group with
  codes 43598, 55111, 55741, and 75907, and Pfizer Laboratories with its 7 codes. The second
  call is served from cache (time both). Check the response size with and without
  `Accept-Encoding: gzip`.
- curl the search with `labelerCodes: ["0013"]` and no name (400); with a name
  plus a labeler (both narrow it); with `"13a"` or 101 distinct codes (400), and 100 (200);
  and with no name or labeler (400). In the EF log, confirm the generated SQL uses `LIKE ANY`
  and the count query has the labeler filter.
- curl a broad name with Aurobindo's codes and no dates: the cap's 422 when it passes the cap,
  with no price rows loaded (the EF log shows only the bounded count).
- Chrome on the dev workspace, desktop and about 390 px wide:
  - Search a name, type "pfeizer" in Labeler; Pfizer labelers show under "Did you mean". Pick
    two: they apply at once, and the tab title and results heading name the first plus "+1".
  - Tick "OTC drugs" and "Results without prices", and the list offers more labelers.
  - Reload, and the restored tab shows its chips and searches without fetching the labeler
    list until the field is focused.
  - Clear search clears the chips.
  - Pick the labelers with the most codes (Par Health, Sun, Teva, Takeda, Amneal, and so on)
    until the "Too many labelers" line shows: options that would pass 100 codes are disabled,
    and removing a chip enables them again. Then edit the stored tab in DevTools to hold more
    than 100 codes, reload, and the tab keeps the first picks that fit.
  - Strength on FDA generic "metformin" lists 500 mg/1 before 1000 mg/1. Excluding all but
    one shows only that strength. A new search clears it.
  - Price activity with only Dropped checked: every package row's activity starts with
    "Dropped" or "Down". At product level, each product reads from its dropped packages only.
    Switching detail level keeps the price change list cards. A new search keeps the filter,
    and More filters shows its count. Excluding every category shows the hidden-results hint.
  - Type "bristol": the no-match note shows, and Learn more opens the Help section. Type
    "shire": Wilshire and a near-miss show, with the hint under them; arrow keys skip the
    hint. Type "pfizer": no hint.
  - Keyboard only: the labeler combobox opens, arrows through options, Enter picks one,
    Backspace removes the last chip, and Enter with the list closed searches.
- Time `matchLabelers` for "glaxo smith kline" on the full list in Safari in the iOS Simulator;
  it should stay under about 16 ms. If it doesn't, debounce the field by 150 ms.
- Time the FDA page's refine on "metformin" with the activity filter set, before and after
  (React profiler), to decide on the `WeakMap` cache.

## Left out

- **Parent-company aliases** ("Bristol-Myers Squibb" → E.R. Squibb & Sons). The data doesn't
  hold them, and a hand-kept alias table would go stale; the combo box's notes and the Help
  section point to the brand-name search instead.
- **"Search this labeler" from a results row**, which turns the Help section's steps into one
  click: search Eliquis, then search E.R. Squibb & Sons from its row. It needs the row's
  labeler codes (the product NDC's first segment) and a name for the chip; decide where the
  action lives (a row menu or the Labeler cell) with the row details drawer idea in
  docs/future-work.md.
- **Group the More filters Labeler list by labeler group**, so Dr. Reddy's is one entry, not
  one per spelling. The client would need each product's group, which means the labeler list
  or a group id on each product.
- **Labeler suggestions narrowed by the other terms** (only the labelers that make Eliquis),
  as the autocomplete plan leaves out for Brand and Generic.
- **The same Price activity filter on NADAC.** The category lives in `priceActivity.ts`, so
  NADAC can add it later without new rules.

## Open questions

- Whether Price activity should split significant steps from gradual changes ("Dropped 10%+"
  and "Down overall") if users want only the large steps. Start with the five categories.
