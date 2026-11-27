# Search result cap and search input hardening

## Context

A review on 2026-11-27 raised two findings: nothing limits how much a search returns, and the
memory cache can grow without limit. Both hold. Validation decides whether a search may run, but
not how many rows it returns. This plan covers those findings and a few smaller gaps that
make them worse. When a search matches too many rows, the server refuses it, and the page tells
the user to narrow it.

Rate limiting is out of scope: Cloudflare limits requests on the tunnel.

What's true today:

- **The NDC validator is never called.** `NadacPriceEndpoints.GetWithSearch` only checks that
  `ndc` is digits, and `NadacService.ValidateNdc` (5 characters) has no caller. `ndc=1` matches
  5,583,391 price rows over all dates in `drug_dev` (47,072 for one week). The client already
  requires 5 digits of the stored NDC (`MIN_NDC_LENGTH`, `library/nadacSearch.ts`), so only
  direct API calls get through.
- **No search has a row cap.** In `drug_dev` (254 weekly as-of dates, 2022-01-05 to
  2026-11-11), both search endpoints return about 490 bytes of JSON per price row. Measured
  against the local API, NADAC "metformin" over all dates is 35 MB (71,111 rows) and the FDA
  generic name "metformin" is 38 MB (76,462 prices across 1,893 packages). The server holds the
  whole list in memory and then serializes it.
- **The FDA name search endpoint is unused.** The client's FDA page calls
  `fda-products/advanced-search`. `fda-products/search?proprietaryName=` has no date limit (it
  returns every price each package has had), and it caches every distinct term for 5 minutes
  (`FdaProductRepository.ListSearchResultsAsync`). That's the path the review found.
- **`IMemoryCache` has no `SizeLimit`.** NADAC searches build a cache key but never store a
  result (a known rough edge), so today the unused FDA endpoint is the only way to fill the
  cache. Fixing the NADAC rough edge would add many more keys (term × NDC × both dates), so the
  cache needs a limit before or along with that fix.
- **Abandoned searches keep running.** The endpoints take no `CancellationToken`.
  `NadacService.ListSearchResultsAsync` accepts one but doesn't pass it to the repository, and
  the client doesn't pass React Query's `signal` to `fetch`. A superseded search keeps running on
  the server until it finishes.
- **The client retries every failed search three times.** React Query's default `retry` is 3,
  with backoff, and `App.tsx` doesn't change it. A 4xx answer can't change on a retry, so the
  user waits about 7 seconds for a message the first response already had, and the server runs
  the search four times.

## Decisions

### The limit: 200,000 rows

The limit is a server constant, `SearchLimits.MaxRows` in `server/Constants/`, set to 200,000
rows: about 100 MB of JSON. It's set high on purpose, as a starting value. The 30 ms count
below measures only the refusal, so before the cap ships, near-limit searches on the Pi and a
real phone decide whether 200,000 stays (see "Near-limit check" under Verification). The server
sends the number in its refusal, so the client doesn't copy it.

A row is a NADAC price row. An FDA search also counts each package as a row, since packages
without prices still ship (the client always loads them).

What it allows and refuses in `drug_dev` (all dates unless noted):

| Search | Rows | Result |
| --- | --- | --- |
| NADAC "tablet" | 3,305,742 (one year: 728,166) | Refused |
| NADAC "capsule" | 758,021 (one year: 169,380) | Refused; one year is allowed |
| NADAC "cream" | 153,337 | Allowed |
| NADAC "acetaminophen" | 104,758 | Allowed |
| NADAC "metformin" | 71,111 | Allowed (35 MB) |
| NADAC "eliquis" | 1,524 | Allowed (0.7 MB) |
| NADAC `ndc=1` | 5,583,391 | 400 from NDC validation, before the cap |
| FDA generic "chloride" | 1,081,127 prices + 31,590 packages | Refused |
| FDA generic "sodium" | 320,776 + 10,567 | Refused |
| FDA generic "amine" | 204,182 + 5,836 | Refused |
| FDA generic "acetaminophen" | 113,547 + 6,624 | Allowed |
| FDA generic "metformin" | 76,462 + 1,893 | Allowed (38 MB) |

### Count first, with a bounded count

Before loading, the server counts the search's rows with the same filters, stopping at the
limit: `query.Take(MaxRows + 1).CountAsync()`, which Postgres runs as a `LIMIT` subquery. In
`drug_dev` this takes about 30 ms for "tablet", "metformin" and `ndc=1` alike, and sends no
rows. If the count is over the limit, the server refuses without loading anything.

The other way, loading `MaxRows + 1` rows and checking the count, would hold about 100 MB of
entities in memory before refusing the search. On the Pi, that's worse than running an
extra 30 ms count before every search.

The count and the load run in one `REPEATABLE READ` transaction, so they read the same snapshot.
Under Postgres's default `READ COMMITTED`, each query sees what's committed when it starts, and
a weekly ETL load that commits between them could push a search that passed the count past the
limit. That would add at most one week of new rows (about 3,000 for "capsule" over the last
year), but the transaction makes the cap exact for both endpoints at no real cost. The
transaction only reads, so it can't fail with a serialization error. `Take` on the load can't
do the same for FDA, because its prices are nested lists in one projection.

### The refusal: 422 with a code

The server answers `422 Unprocessable Content` with:

```json
{
  "code": "too-many-rows",
  "message": "This search matches more than 200,000 prices, too many to show. Make the search terms more specific or shorten the Dates.",
  "limit": 200000
}
```

The `code` lets the client tell this refusal apart from other errors, since validation failures
are 400s with only a `message`. The message follows the writing style guide and names the
Dates control. The server builds it from `MaxRows`, so the number in it stays right.

### The page shows a notice

The results show the server's message as a notice above the table, in the `notice` slot that
`HiddenResultsNotice` uses, with a Help button for `searching`. It stays until the next search.
A toast would go away and leave an empty table with nothing to explain it. The page shows no
toast for this refusal, so the message isn't said twice. Every other error keeps
`QueryErrorToast`.

### Real client IPs: skipped

Passing the real client IP from Cloudflare (`CF-Connecting-IP`) to the API needs
`UseForwardedHeaders` with the right proxy trusted, and that depends on whether nginx sits
between `cloudflared` and Kestrel. The repo doesn't say. Nothing in the app needs the IP while
Cloudflare does the rate limiting, so this waits.

## Steps

One feature branch, `feat/search-result-cap`, off `coordinated-work`, with one PR into
`coordinated-work`; it ships with the [labeler search](fda-strength-activity-labeler.md) and
[search privacy](search-privacy.md) plans. The labeler search and search privacy change 4 wait
for this PR to merge, so it goes first. Steps 1 through 5 are server changes, 6 and 7 are client changes, and 8
is docs.

### 1. Validate the NDC

- Normalize the NDC the way the client's `toStoredNadacNdc` (`library/ndc.ts`) does for input
  without dashes: trim it, then strip leading zeros. The client always sends that form, so this
  matters only for direct API calls, but today `ndc=00001` would pass a length check and search
  for "00001" as a substring (90 NDCs and 15,159 price rows in `drug_dev`), while the client
  turns the same input into "1" and refuses it.
- `NadacService.ValidateNdc` checks the normalized value: 5 to 11 ASCII digits (11 is the
  longest an NDC can be).
- `GetWithSearch`: an `ndc` that's given but invalid returns 400 with a readable `message`
  ("An NDC search needs at least 5 digits, not counting leading zeros."), and isn't dropped. A
  valid one is searched in its normalized form, so `00003089321` finds `3089321`.
  The description keeps today's behavior; the backlog item "Block searches for generic terms
  like "tablet"" changes it to match.
- Remove the `ValidateNdc` line from AGENTS.md's known rough edges and the "Wire it into
  `GetWithSearch` in this item" bullet from that backlog item.

### 2. Cap search rows

- `server/Constants/SearchLimits.cs`: `MaxRows = 200_000`.
- Each repository counts and loads in one method, because the transaction needs the
  `DbContext`, which only repositories hold. The method opens the transaction
  (`_db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, cancellationToken)`), runs
  the bounded count, and returns "too many rows" or loads and returns the rows. It returns a
  small result type that says which, rather than a `null` that could be read as "no results".
- `NadacRepository`: `ListSearchResultsAsync` gains a `limit` and does the above. Move its
  filter into one private method that the count and the load both use, so they can't drift
  apart.
- `FdaProductRepository`: move `ListAdvancedSearchResultsAsync`'s three queries (products,
  packages, prices) into one private builder. Its count adds a bounded count of the matched
  products' packages and a bounded count of those packages' prices in the dates.
- The services (`NadacService`, `FdaProductService`) pass `SearchLimits.MaxRows` and hand the
  result to the endpoint, which maps "too many rows" to the 422 above. The response body is built
  in one place (for example a `SearchErrors.TooManyRows()` helper in `Endpoints/`) so both
  endpoints send the same shape.
- `CacheWarmingService` calls the repository directly with fixed terms and doesn't need the cap.

### 3. Delete the FDA name search endpoint

Remove `GET /api/fda-products/search`: `GetWithNameSearch`, `FdaProductService.ListSearchResultsAsync`,
the repository method and its interface entry, and `CacheKeys.DrugProductSearch`. Keep
`ValidateNameSearch`, which advanced search uses. Update AGENTS.md's API list. This removes the
unbounded per-term cache that the review found, and an endpoint with no date limit.

### 4. Bound the cache

- `AddMemoryCache(o => o.SizeLimit = 500_000)`, in rows. Once `SizeLimit` is set, every `Set`
  without a `Size` throws, so every `Set` must give one.
- Add one helper, for example `CacheExtensions.SetList(this IMemoryCache, key, list, duration)`
  in `Data/`, that sets `Size = list.Count`. Use it for every `Set`: the dosage form and route
  lists, the as-of dates, and `CacheWarmingService`'s default searches. AGENTS.md's convention
  "A repository method that calls `TryGetValue` must also `_cache.Set`" gains "through
  `SetList`".
- 500,000 rows guesses about 250 MB at roughly 500 bytes per cached `NadacPrice`. Check it on
  the Pi once the NADAC cache fix lands (see "Not in this plan"); nothing large is cached before
  then.

### 5. Pass cancellation through

- Each search endpoint takes a `CancellationToken` (minimal APIs bind `RequestAborted`) and
  passes it to the service, which passes it to the repository's transaction, count and load.
- Fix `NadacService.ListSearchResultsAsync`, which accepts a token and drops it.

### 6. Client: typed errors, no retries on 4xx, abort superseded searches

- `library/apiErrors.ts`: `class ApiError extends Error` with `status` and an optional `code`,
  `isTooManyRows(error)`, and `shouldRetry(failureCount, error)` (no retry for a 4xx, else up to
  3, as today). Tests beside it.
- `api/api.ts`: `parseErrorMessage` becomes `toApiError(response)`, which reads `message` and
  `code` and keeps today's fallback text. `nadacEndpoints.ts` and `fdaEndpoints.ts` throw it.
- `App.tsx`: `retry: shouldRetry` in the query client's `defaultOptions`.
- `useNadacSearch` and `useFdaSearch` pass React Query's `signal` to the endpoint functions,
  which pass it to `fetch`. A search replaced by a new one is aborted, and step 5 stops its work
  on the server.

### 7. Client: the notice

- `ResultsSection/TooManyRowsNotice.tsx`: a `warning` `Alert` with the server's message and a
  Help button for `searching`, laid out like `HiddenResultsNotice`.
- `NadacResults` and `FdaResults` read `error` from their search hook and pass the notice in the
  `notice` slot when `isTooManyRows(error)`. The hidden-results hint needs a successful result,
  so the two never show at once.
- `NadacSearch` and `FdaSearch` pass `QueryErrorToast` only errors that aren't `isTooManyRows`.
- Check with the keyboard and the Simulator: the notice is announced (MUI's `Alert` has
  `role="alert"`), Search lights up again after the refusal (a failed search re-enables it), and
  a workspace tab restored with a too-large search shows the notice when first shown.

### 8. Docs

- `src/content/help/searching.md`: a short paragraph saying that a search matching more than
  200,000 prices shows a message instead of results, and how to narrow it. Draft the copy in
  `docs/content/` first, per the style guide.
- AGENTS.md: the API list (step 3), a server gotcha for the cap ("Every search counts its rows
  first and refuses past `SearchLimits.MaxRows` with a 422 `too-many-rows`"), the cache
  convention (step 4), and the known rough edges (step 1).
- `docs/future-work.md`: remove this plan's entry when it ships.

## Verification

Against the local API on a worktree slot, using `drug_dev`:

- `ndc=1` and `ndc=00001` return 400 with the NDC message. `ndc=12345` returns 200, and
  `ndc=00003089321` returns the same prices as `ndc=3089321`.
- NADAC "tablet" over all dates returns 422 within about 100 ms. "capsule" over the last year
  returns 200, and "metformin" over all dates returns 200 with the same body as before.
- FDA advanced search "chloride" (generic name) returns 422 and "metformin" returns 200.
- `GET /api/fda-products/search` returns 404.
- The API starts without an `InvalidOperationException` from a `Set` without a `Size`
  (cache warming runs on startup), and the dosage forms load.
- In the browser, "tablet" on each page shows the notice with no toast, after one request in
  the network panel (no retries). Typing a new search over a slow one aborts the first
  request.
- `npm run lint`, `npm test` and `npm run build` pass, and `dotnet build` shows no new
  warnings.

### Near-limit check

This sets the starting cap, and it has to pass before the cap ships to `main`. Today's
production API has no cap, so these searches already run there in full, and the check needs no
deploy. It can run before or during implementation.

- **Searches:** NADAC "capsule" with the default dates (the last 12 months, 169,380 rows in
  `drug_dev`) and the FDA generic name "acetaminophen" with All dates (about 120,000 rows).
  Check their row counts in production first. If either is far from 200,000 there, pick a
  production search closer to it.
- **On the Pi:** time each search with `curl -w '%{time_total} %{size_download}'` from another
  machine, and watch the API's resident memory (`ps -o rss` on the `drugpricing` process)
  while it runs. It passes if each search finishes in under 15 seconds and the API's memory
  stays under 1.5 GB (the Pi has 3.71 GB, and about 800 MB is in use with everything running).
- **On a real phone:** run each search on the production site. It passes if the results table
  pages and sorts, the Line chart draws, and the page doesn't reload or stop responding. The
  Simulator doesn't count here, because it runs with the Mac's memory.
- **If either fails:** lower `SearchLimits.MaxRows` to a size that passes, with the same
  checks, and update the plan's table and the Help copy to the new number. 100,000 is the next
  value to try: it still allows NADAC "metformin" and "acetaminophen" over all dates.

## Not in this plan

- **Rate limiting and real client IPs**: Cloudflare limits requests on the tunnel. See "Real
  client IPs: skipped" above.
- **Caching NADAC searches** (a known rough edge): step 4 makes it safe to fix. Fixing it would
  cut repeat database work, and it's the point to check the cache's size on the Pi.
- **Response compression**: JSON this repetitive usually compresses 10× or more. Cloudflare may
  already compress responses to browsers. Measure the tunnel before adding
  `AddResponseCompression`.
- **Lowering the limit further**: the near-limit check sets the starting cap. Whether it
  should come down for other reasons, such as a slow connection, can wait until the cap ships.
- **Blocking generic terms** and the description validation change: the existing backlog item
  "Block searches for generic terms like "tablet"".

Size: medium. One PR (server, client, Help, AGENTS.md).
