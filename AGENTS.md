# AGENTS

Orientation for coding and review agents; the single source of project guidance (`CLAUDE.md`
only points here). Chart and card design rules are in [client/CHARTS.md](client/CHARTS.md).

## What this project is

A portfolio full-stack app for storing, serving, and graphing US drug prices:

- **Postgres** — NADAC prices and FDA NDC product/package reference data.
- **`etl/`** — Python that downloads, parses, and loads NADAC (weekly CSVs from
  `download.medicaid.gov`, the price series) and the FDA NDC directory
  (`accessdata.fda.gov/cder/ndctext.zip`, used to resolve and filter drugs).
- **`server/`** — .NET 10 minimal API, mostly reads.
- **`client/`** — React 19 + TypeScript + Vite + MUI; search and chart prices over time.
- `reporting/sql/` — ad-hoc analysis SQL. `.github/workflows/deploy.yml` — deploy to a Pi.

It is a learning project: be opinionated in review, and lead on tasks the author flags as
outside their skill set.

## Server (`server/`)

`Program.cs` wires CORS, `IMemoryCache`, the `DbContext`, DI, Swagger (dev), endpoints, then
runs `Database.Migrate()`. Layering: `Endpoints/` → `Services/` → `Data/Repositories/` →
`Data/DrugPricingContext.cs`. Caching lives in the repositories (keys and TTLs in `Constants/`);
`Services/CacheWarmingService.cs` warms it from `Data/DefaultSearches.json`. EF mapping is in
`Data/Configurations/`, entities in `Models/`.

API (`/api`): `up`, `app-init` (NADAC date range; the client uses only that, not the name
lists), `nadac-prices/{id}`, `nadac-prices/search?ndcDescription=&ndc=&minDate=&maxDate=`,
`nadac-prices/advanced-search` (stub), `fda-products/search?proprietaryName=`,
`fda-products/advanced-search?jsonString=` (JSON `AdvancedFdaSearchRequest` in the query).

Gotchas:

- NADAC description search is an `ILIKE '%term%'` match on `DrugPackages.NdcDescriptionLower`.
  Trigram similarity is used only behind the stubbed advanced search, but a fresh DB still needs
  `CREATE EXTENSION IF NOT EXISTS pg_trgm;` for the `*_trgm_ops` indexes.
- **Every `EF.Functions.ILike` on a search term goes through `LikePattern`** (`Data/LikePattern.cs`):
  `EF.Functions.ILike(column, LikePattern.Contains(term), LikePattern.EscapeCharacter)`. Never
  interpolate a term into a pattern: `_____` passes the minimum length and matches every row.
- **`ProductNdc` is the FDA product key**, not `ProductId`, which the FDA reissues
  (`{ProductNdc}_{guid}`) on every change. Never join or upsert on `ProductId`.
- **NADAC NDCs are stored without leading zeros** (`3089321` for `00003-0893-21`), the same as
  FDA's `NdcPackageCodeStripped`, the join key. Don't rebuild a dashed code from a NADAC NDC
  (4-4-2, 5-3-2, 5-4-1 are ambiguous); take it from the FDA join. The client converts NDC input
  with `toStoredNadacNdc` (`library/ndc.ts`) and displays the stored form on purpose.
- **`DelistedAt` is a soft delete**: the FDA load stamps the rows it touches and delists the
  rest (`etl/fda/tombstone_fda.py`); a row that comes back is un-delisted. Every FDA query must
  filter `DelistedAt == null`.
- `NdcExcludeFlag` and `Services/FdaPackageSearchResult.cs` are unused, not gaps to close.
- Dev needs `server/appsettings.Development.json` (gitignored; copy the `example.` file) with
  `DevClientHost` set. Production reads the `PG*` env vars, and its CORS origins are hardcoded.
- C# uses 2-space indents (`server/.editorconfig`), nullable and implicit usings.

```bash
docker compose up -d          # local Postgres (drug_dev on :5432)
dotnet run                    # http://localhost:5250, Swagger at /swagger
dotnet ef migrations add <Name>
```

## Client (`client/`)

`src/App.tsx` (router, theme, React Query) · `src/api/` (calls; `types.ts` maps wire types to
domain types, including date strings to `Date`) · `src/library/` (domain types and pure logic,
unit tested) · `src/hooks/` · `src/Context/` (global and per-tab state; per-tab provider stacks
in `TabProviders.tsx`) · `src/theme.ts` (every color; see Theme below) ·
`src/library/constants.ts`.

Feature folders in `src/Components/`: `Workspace/` (the primary UI), `NadacSearch/`, `FdaSearch/`,
`SearchPanel/` and `ResultsSection/` (the frames and fields both search pages are built from),
`Charts/` (`LineViz`, `BarViz`, `UnitSplit`, legend, View data), `ExplorerGrid/` (the card system
both pages share), `ResultTables/` (the NADAC, FDA product and FDA package results tables), plus
supporting UI. Each search page is its panel (`*SearchPanel`), its results (`*Results`, in a
`ResultsSection`) and `PinnedSection`.

### Result tables

Each table is one file in `ResultTables/` that takes its search's data and `loading` as props,
lists its columns, and renders `ResultTable` (paging, and the selection that Chart selected charts).
`ResultsSection` gives it its `Paper`. Rows are built in `library/resultRows.ts` (tested): each
carries `priceSummaries` (`summarizeByUnit`, from the prices the row's chart would draw, keyed the
same way), and `createPriceColumns` (`priceColumns.tsx`) shows them, each price with its unit and
sorted by unit first. A row without prices can't be selected. Keep Latest Price second or third:
on a phone it must show without scrolling.

### Workspace

`WorkspaceContext` owns the tabs, `layoutMode` and `paneAssignment`; `TabInstance` renders a
tab's provider and page from `library/tabTypeRegistry.ts`. Hidden tabs stay mounted.

- **A workspace always has a tab.** Startup falls back to one blank tab, and closing the only tab
  leaves a blank one: `removeTab` passes the reducer a `fallback` and returns the tab that takes
  over the pane, which the drawer focuses.
  "Clear workspace" (`clearWorkspace`, the reducer's `reset`) starts over with one blank tab and
  deletes every tab's saved state; it takes two clicks (`ui/ConfirmButton`).
- **Keep imports acyclic and provider modules component-only**, or dev hot updates break.
  `tabTypeRegistry.ts` imports every page, so `library/tabType.ts` (types, default titles)
  imports no components. The workspace contexts and hooks are in `Context/workspaceContexts.ts`
  (null defaults that throw outside the provider), and `WorkspaceContext.tsx` exports only the
  provider.
- **A tab switch must not re-render hidden tabs.** The context is split into narrow hooks:
  `useWorkspaceTabs`/`useWorkspaceTab(id)`, `useWorkspacePanes` (changes on every switch),
  `useMobileDrawer` (every tab tap on a phone), and `useWorkspaceActions` (stable). Code inside a
  tab or drawer row must not read the panes or the drawer state; don't bring back one catch-all
  value. `workspaceReducer` (`library/workspace.ts`) keeps the identity of every tab it doesn't
  change, and `TabInstance`/`DrawerTab` are `memo`'d on that. `TabInstance` also memoizes its
  page element, so showing or hiding a tab doesn't re-render the page.
- Hidden panes use `content-visibility: hidden` (else `display: none`), all in one grid cell, so
  showing a tab reuses its layout and its charts see no resize. Split layouts would need their
  own grid.
- A search tab is renamed after its first search while it has its default title (NADAC:
  `nadacTabTitle` in `library/nadacSearch.ts`). Reading the tab list re-renders a page on every
  tab change, so only the search panels read it (`useRenameAfterSearch`), and `NadacResults` and
  `FdaResults` are `memo`'d.

### Data rules that apply everywhere

- **Dates:** API dates are calendar days that `new Date("YYYY-MM-DD")` reads as UTC midnight.
  Every display goes through the UTC helpers in `library/dates.ts`; local formatting shows the
  day before in the Americas.
- **Never assume one price per NDC per date.** At FDA product level, several packages share a
  series; charts and tables average them per date (`seriesByDate` in `library/prices.ts`, which
  holds the price math both share).
- **Never put two pricing units on one axis** (`UnitSplit`) **or in one figure.** A few products
  (19 as of 2026-11, EA and GM) have packages priced in different units; the FDA product table
  shows them as "Mixed units" with their latest price date (`summarizeByUnit`).
- **Price axes may exaggerate a change at most `MAX_AXIS_EXAGGERATION` times** (`fittedPriceAxis`);
  don't fit tighter.
- **Pinned items are snapshots**: searches and filters never change them, and system items
  (derived from the search) are never stored. A change to one redraws only its card: read the
  narrow hooks in `Context/pinnedItemsContexts.ts`, never the whole list from a card. Details in
  [client/CHARTS.md](client/CHARTS.md).
- **Search criteria** (`library/searchCriteria.ts`, plan in `plans/search-filters.md`): one
  object per search type, edited in one panel per page (`SearchPanel`). *Load* fields (text
  terms, Dates) go to the server on Search; *refine* fields narrow the loaded result in the
  client at once, never fetching. `nextLoad` keeps what's loaded when only the dates narrowed.
  Each page calls its view hook once (`useRefinedNadacSearch`/`useRefinedFdaSearch`) and passes
  the result down: the refined rows (`refineNadac`/`refineFda`), the dates shown, the
  from-results lists' options and the hidden counts. Chart provenance and colors read the loaded
  result. A from-results list offers what the page could show before exclusions
  (`*FilterOptions`), so it never lists a value an Include box hides. Tabs hold criteria
  through `useSearchLoad`. FDA always loads sample and no-price packages and hides them by
  default, and both pages hide OTC by default (Include boxes, each with a "(N hidden)" count).
  When the filters hide every result, the table says why and offers the fix
  (`hiddenResultsHint`).
- **Search dates** default to the last `DEFAULT_NADAC_SEARCH_MONTHS` of loaded data (ending
  today if `app-init` fails) on both pages, and are the window of everything on the page (there
  is no separate chart dates control). NADAC's server snaps both dates to loaded as-of dates;
  FDA's filters strictly, so the client widens its request (`widenToAsOfDates`) and snaps the
  same way (`fdaShownDates`). The snap reaches less than one week (as-of dates are weekly).
- React Query doesn't refetch on focus or reconnect: every mounted tab would refetch at once.
- **A search's toasts show only while its page is on screen** (`PageVisibleContext` in
  `Context/pageVisibility.ts`): a workspace tab while shown on the workspace route, a standalone
  page while mounted. Errors (`QueryErrorToast`) come back each time the page is shown. Results
  ("N products found") and flagged price changes (`SearchResultToast`) show once per new result,
  waiting if it arrived while hidden, and never for the search a restored tab re-runs on load
  (`useNewSearchResult`). App-wide toasts: failed storage writes, another window's changes, Pin.

### UI conventions

- **Theme:** `src/theme.ts` is the only place a color is written. It names each one once in
  `COLORS`, maps them to MUI roles, and adds two custom roles: `palette.chart` (series, `rise`,
  `drop`) and `palette.inverse` (light surfaces: the tab button, `HtmlTooltip`). Components use
  roles only (`"text.secondary"` in `sx`, `theme.palette.divider` in code, via `useTheme`, never
  by importing `theme`). ESLint rejects hex, `rgb()`/`hsl()` and named colors elsewhere in `src/`
  (tests are exempt).
  There are two themes, `darkTheme` (the app's own) and `lightTheme` (MUI's default plus the
  custom roles), picked by the `colorMode` setting (`THEMES`, applied in `App.tsx`). Pinned charts
  store series colors, so `ChartItemBody` redraws them in the current palette's slot
  (`themedSeriesColor`). To retheme, edit `COLORS` and run `npm test`; the steps are at the top of
  `theme.ts`. Corners
  come from `BORDER_RADIUS` there (`shape.borderRadius`; `sx` `borderRadius: 1` is one unit).
- **Global modal** (`setGlobalModal`) is an MUI `Dialog`: 600px (`maxWidth="sm"`), full screen
  below `sm`, its title and close button in one header row (`TitleBar`). It owns the width,
  height and padding; its contents bring no `Container`, outer padding or page heading (`About`
  and `OnBoarding` take `showHeading={false}`). Settings apply at once, so it has no Save button.
  The phone drawer closes before a modal opens.
- **Settings** (`library/settings.ts`, `SettingsContext`) hold app-wide preferences most people
  never change (`barStyle`, `colorMode`), saved once under `drugpricing.v<VERSION>.settings` and
  validated field by field. Other windows follow a change (`watchSettings`). New preferences go
  here, not in the search panel.

### Persistence (`library/persist.ts`)

The workspace and each search tab's state (search criteria, detail level, pinned
items) go to `localStorage` and are restored on load; a restored tab re-runs its
search when first shown (`active` → `searchEnabled`). Selection and system-card collapse state
aren't saved.

- Keys: `drugpricing.v<VERSION>.workspace` and `.tab.<tabId>`. Bump `VERSION` only when old data
  would be misread; a new field is optional with a default. `pruneStoredState` deletes keys
  outside the current prefix and state for tabs no longer in the workspace.
- Every read is validated field by field with its own default, so one bad pin never costs the
  others. Failed writes warn once with a toast.
- Tab providers load once on mount and save on every change. Blank tabs save nothing. Closing a
  tab or changing its type removes its state. Standalone pages use `STANDALONE_TAB_IDS`.
- **Several windows:** when another window writes a value this one didn't, `watchOtherWindows`
  makes this one read-only and asks for a reload, or pruning would delete the other's tabs.
- Anything that resets state when data loads undoes a restore. Store restorable state so it
  needs no reset: filters store *exclusions*, and a search for new terms clears them
  explicitly (`apply*Search`). Tabs saved before criteria existed are read into criteria
  (`legacy*Criteria` in `persist.ts`) instead of bumping `VERSION`.

```bash
npm run dev      # Vite; copy .env.example to .env.development (VITE_API_URL)
npm run build    # tsc -b && vite build
npm run lint
npm test         # Vitest, src/library/*.test.ts
```

Tests run in Node (no DOM, no component tests) with `TZ=America/Chicago`, so local-time date
bugs fail. `persist.test.ts` re-imports the module per test because it keeps module state.

## ETL (`etl/`) — Python 3.13

`python drug_pricing_etl.py <dev|test|prod>` loads `.env.<mode>` (`config.py`) and asks whether
to update FDA and/or NADAC. `nadac/update_nadac.py` and `fda/update_fda.py` orchestrate
fetch → parse → load, then NADAC runs `update_drug_package` (it fills `DrugPackages`, which
description search reads) and FDA runs `tombstone_fda.py`. `library/timing.py`'s `timed(label)`
prints the `[timing] <stage>: <s>s (ok|failed)` lines in the cron log. Models are in `library/models.py` and mirror
`server/Models/`; keep them in sync. Tests: `pytest` (models and parsing only).

- **Connection ownership.** The two orchestrators own the connection, the run timestamp and the
  single `commit()`. Loaders and queries take `conn` first, never connect or commit, and raise
  (never `sys.exit()`) so the transaction rolls back. The whole FDA load is one transaction.
- `library/db.py`'s `test_connection` borrows its connection: don't use it with
  `with connection as conn:`, which closes the connection in psycopg3.
- **Parsing** (`library/parsing.py`): only `None`/NaN counts as missing; anything else unexpected
  raises. Never call `pd.to_datetime` on a scalar or use `iterrows()` per row (they were most of
  the old parse time).
- **FDA duplicates**: one file can have several rows per `ProductNdc`; `load_fda_products.py`
  keeps one per group (`DISTINCT ON`, latest `StartMarketingDate`), which inherits all the
  group's packages. Packages are filtered on loaded `product_ndc`, never `product_id`. Groups
  that disagree on dosage form, product type or ingredients are logged as a warning and merged
  anyway (~11 as of the 2026-09 file): FDA data rot, not a code fault.
- Each NADAC file is cumulative year to date (~1.2M rows by late year): keep
  `NADAC_FILTER_BEFORE_INSERT` on. Files have appeared as early as ~6:17 AM Wednesday; a
  scheduled job should start early and retry every 30 minutes.

## Deployment and branching

A push to `main` runs `deploy.yml` on a self-hosted Raspberry Pi runner: it rsyncs `etl/` and
the built client (both `--delete`), publishes the server (keeping its `appsettings.json`), and
restarts the `drugpricing` service. The client builds with the `.env.production` copied from
`/home/ghrunner/config/drugpricing-client/`; check it when a deploy calls the wrong API.
Feature branches open PRs against `dev`; `dev` is merged
into `main` to ship. Never target `main` from a feature branch.

## Conventions

- Keep the NADAC types aligned: `server/Models/NadacPrice.cs`, `etl/library/models.py`,
  `client/src/library/types.ts` + `src/api/types.ts`.
- Minimum search lengths are duplicated: server `NadacService`/`FdaProductService`, client
  `library/constants.ts`. Change both.
- New server logic goes in `Services/`, data access in `Data/Repositories/`, not in endpoints.
- A repository method that calls `TryGetValue` must also `_cache.Set`, with its own `CacheKeys`
  key (a shared key serves one list as another).
- Markdown line length (`MD013`) is not linted.
- Never read, echo, or commit `etl/.env*` (except `.env.example`) or
  `server/appsettings.Development.json`; they hold real credentials.
- Don't search or edit `client/dist/`, `server/bin/`, `server/obj/`, `etl/.venv/`.

## Known rough edges (fair game for review)

Planned work is in [FUTURE_WORK.md](FUTURE_WORK.md). Don't flag its items as new findings; add
to it rather than fixing them inside unrelated work.

- `nadac-prices/advanced-search` is a stub; its request is bound `[FromBody]` on a GET, and the
  FDA equivalent passes JSON in a query string.
- Debug logging: `Console.WriteLine` in `FdaProductEndpoints`, `console.log` in `api.ts`.
- `NadacRepository.ListSearchResultsAsync` never calls `_cache.Set`, so NADAC searches aren't
  cached.
- `NadacService.ValidateNdc` is never called: `ndc=1` returns 47,072 rows for one week.
- No server tests; client tests cover `library/` only; ETL fetch, load and tombstone are untested.
- `NadacPrice.loaded_at` defaults to `datetime.now()` at import time (harmless; nothing keys off
  it). Don't copy it: the FDA models dropped that default because tombstoning needs an explicit
  per-run timestamp.
