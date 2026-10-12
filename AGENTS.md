# AGENTS

Orientation map for coding and review agents. This is the single source of project
guidance — `CLAUDE.md` only points here.

## What this project is

DrugPricing is a portfolio full-stack app for storing, serving, and visualizing US drug
pricing data. Three deployable pieces plus a database:

- **Postgres** — stores NADAC prices and FDA NDC product/package reference data.
- **`etl/`** — Python scripts that download, parse, and load NADAC and FDA data.
- **`server/`** — .NET 10 minimal-API web app; mostly a read API over the DB.
- **`client/`** — React 19 + TypeScript + Vite + MUI UI for searching and graphing
  average prices and price changes over time.

Data sources:

- **NADAC** (National Average Drug Acquisition Cost) — weekly CSVs from
  `download.medicaid.gov`. The price series the app graphs.
- **FDA NDC directory** — `accessdata.fda.gov/cder/ndctext.zip`. Product/package
  reference data used to resolve and filter drugs.

This is a learning/portfolio project. Agents are welcome to be opinionated in review and
to lead on tasks the author flags as outside their skill set.

## Repository layout

```text
client/       React + Vite front end
etl/          Python ETL (NADAC + FDA)
server/       .NET 10 minimal API + EF Core
reporting/    Ad-hoc analysis SQL (reporting/sql/)
.github/      CI: workflows/deploy.yml (self-hosted runner -> Raspberry Pi)
```

## Server (`server/`) — .NET 10, EF Core, Npgsql

Entry point is `server/Program.cs`: CORS policies, `IMemoryCache`, `DbContext`
registration, repository/service DI, Swagger (dev only), endpoint mapping, then
`db.Database.Migrate()` on startup.

| Concern | Where |
| --- | --- |
| HTTP routes | `Endpoints/` — `NadacPriceEndpoints.cs`, `FdaProductEndpoints.cs`, `AppInitEndpoints.cs` |
| Request/response DTOs | `Endpoints/*Request.cs`, `Endpoints/*Response.cs` |
| Business logic + validation | `Services/NadacService.cs`, `Services/FdaProductService.cs` |
| Data access + caching | `Data/Repositories/` (`INadacRepository`/`NadacRepository`, `IFdaProductRepository`/`FdaProductRepository`) |
| EF entities | `Models/`, enums in `Models/Enums/` |
| EF mapping | `Data/Configurations/` (applied via `ApplyConfigurationsFromAssembly`) |
| DbContext | `Data/DrugPricingContext.cs` |
| Migrations | `Migrations/` |
| Cache keys / TTLs | `Constants/CacheKeys.cs`, `Constants/CacheExpiration.cs` |
| Startup cache warming | `Services/CacheWarmingService.cs`, seeded by `Data/DefaultSearches.json` |

Layering convention: endpoint → service → repository → `DrugPricingContext`. Caching
currently lives in the repositories (see the TODO in `CacheWarmingService`); keep new
caching there unless changing that deliberately.

API surface, all under `/api`:

- `GET /api/up` — liveness.
- `GET /api/app-init` — NADAC as-of date range, unique dosage form names, route names. The
  client (`useAppInit`) uses only the date range, for the NADAC search form's default dates and
  input limits. The name lists are unused as of 2026-10.
- `GET /api/nadac-prices/{id}`
- `GET /api/nadac-prices/search?ndcDescription=&ndc=&minDate=&maxDate=`
- `GET /api/nadac-prices/advanced-search` — **incomplete**, currently returns an empty `Ok()`.
- `GET /api/fda-products/search?proprietaryName=`
- `GET /api/fda-products/advanced-search?jsonString=` — takes a JSON-encoded
  `AdvancedFdaSearchRequest` in a query string.

Notes and gotchas:

- NADAC description search (`/nadac-prices/search`) is an `ILIKE '%term%'` contains match on
  `DrugPackages.NdcDescriptionLower`, joined back to prices. Trigram similarity (threshold
  `0.3`) is used only by `ListAdvancedSearchResultsAsync`, behind the stubbed `advanced-search`
  endpoint. A fresh DB still needs `CREATE EXTENSION IF NOT EXISTS pg_trgm;` for the GIN/GiST
  `*_trgm_ops` indexes created in `InitialCreate`.
- **`ProductNdc` is the FDA product key**, not `ProductId`. The FDA reissues `ProductId`
  (`{ProductNdc}_{guid}`) every time a product record changes, so it is a rotating version
  stamp kept only for traceability. `FdaProducts.ProductNdc` is unique and
  `FdaPackages.ProductNdc` is the FK — never join or upsert on `ProductId`.
- **NADAC NDCs are stored without leading zeros.** CMS publishes 11-digit NDCs (always 5-4-2),
  but the ETL reads the column as a number, so `NadacPrices.Ndc` holds `3089321` for
  `00003-0893-21`. FDA's `NdcPackageCodeStripped` follows the same convention (pad to 11 digits,
  drop leading zeros), and it is the join key between the two, so nothing is lost and no data
  change is needed. Don't rebuild an FDA-style dashed code from a NADAC NDC: 4-4-2, 5-3-2, and
  5-4-1 are ambiguous; take the dashed code from the FDA join. NDC search is a "contains"
  match on the stored form, so the client converts input with `toStoredNadacNdc`
  (`client/src/library/ndc.ts`) before searching: dashed input is padded per segment to
  5-4-2, then leading zeros are dropped. Display shows the stored form on purpose.
- `NdcExcludeFlag` is dead weight, not a gap to close. It is carried on both FDA entities
  and both Pydantic models, but no query filters on it, neither `FdaProductDetail` nor
  `FdaPackageDetail` exposes it, and the client never mentions it. The ETL populates it for
  packages and not for products; that asymmetry is harmless. The source files do not
  meaningfully use the flag either — see the note in `Models/Enums/NdcEcludeFlag.cs`.
  `Services/FdaPackageSearchResult.cs` is likewise declared and never referenced.
- **`DelistedAt` is a soft delete.** The FDA load stamps every row it touches with the run
  timestamp, then delists anything left behind (`etl/fda/tombstone_fda.py`). Rows are never
  hard-removed, and a row that reappears in a later file is un-delisted by the upsert. Every
  FDA query in `FdaProductRepository` filters `DelistedAt == null`; nothing is exposed to the
  client, so new FDA queries must add the filter themselves.
- Minimum `ndcDescription` search length is 5 (shortest real description as of the
  2026-04-22 data). Mirrored client-side in `client/src/library/constants.ts` — change both.
- Dev requires `server/appsettings.Development.json` (gitignored); copy
  `server/example.appsettings.Development.json`. `DevClientHost` must be set or startup throws.
- Production reads `PGHOST`/`PGPORT`/`PGDATABASE`/`PGUSER`/`PGPASSWORD` env vars instead
  of the connection string.
- Production CORS origins are hardcoded in `Program.cs`.
- Style: 2-space indent for C# (`server/.editorconfig`); nullable and implicit usings enabled.

Commands (run from `server/`):

```bash
docker compose up -d          # local Postgres (drug_dev on :5432)
dotnet run                    # http://localhost:5250, Swagger at /swagger
dotnet build
dotnet ef migrations add <Name>
```

There is currently no server test project.

## Client (`client/`) — React 19, TypeScript, Vite, MUI

| Concern | Where |
| --- | --- |
| App shell + routing | `src/App.tsx` (BrowserRouter, MUI theme, React Query provider) |
| API calls | `src/api/` — `api.ts` (base URL/helpers), `nadacEndpoints.ts`, `fdaEndpoints.ts`, `appInitEndpoints.ts`, `types.ts` (wire types + mappers) |
| Domain types + transforms | `src/library/` — `types.ts`, `explorerItems.ts`, `persist.ts`, `dates.ts`, `createLineVizData.ts`, `chartSeries.ts`, `chartScale.ts`, `chartTitles.ts`, `seriesColors.ts`, `seriesSummary.ts`, `ndc.ts`, `flagNadacPriceChange.ts`, `fdaDataToNadacPrices.ts` |
| Shared constants | `src/library/constants.ts` |
| Hooks | `src/hooks/` — React Query (`useNadacSearch.ts`, `useFdaSearch.ts`, `useAppInit.ts`), chart origin for new pinned items (`useFdaChartOrigin`, `useNadacChartOrigin`), the resolved chart dates (`useChartWindow`), the page's series colors (`useSeriesColors`), chart styling (`useChartTheme`), and UI (`useMobile`, `useScrolled`) |
| Global state | `src/Context/` — `WorkspaceContext`, `TabInstanceContext`, `SearchContext`, `FdaSearchContext`, `ExplorerItemsContext`, `GlobalModalContext`, `SettingsContext` (app-wide settings); per-tab provider stacks in `TabProviders.tsx` |
| Theme | `src/theme.ts` (including the chart series palette, `palette.chart.series`) |

Feature folders under `src/Components/`:

- `Workspace/` — the primary UI. A tabbed, multi-pane workspace (`WorkspaceContext` owns
  tabs, `layoutMode`, and `paneAssignment`); `TabInstance` renders a tab's provider and
  content by `TabType`, resolved in `src/library/tabTypeRegistry.ts`. Hidden tabs stay
  mounted (`display: none`), so per-tab state survives switching tabs.
- `NadacSearch/` — NADAC search, its results table (`TableViz`), and its tools panel (`VizTools`).
- `Charts/` — the recharts charts both search pages and pinned cards draw with: `LineViz`,
  `BarViz`, and `UnitSplit`, which splits by pricing unit and clips to the chart's dates.
- `FDA/` — FDA product/package explorer, tables, column defs, and filters.
- `ExplorerGrid/` — the card system both search pages share: `ExplorerGridItem` (card shell),
  `PinnedSection`/`PinnedItemCard`/`PinnedChartDates`, `PinButton`, `AddChartControl`, `ChartDatesControl`,
  `ChartItemBody`.
- `DrugPricingBar/`, `GlobalModal/`, `About/`, `OnBoarding/`, `DataPane/`,
  `TabCreator/`, `ui/` — supporting UI.

Notes:

- Charts are recharts (`Charts/LineViz`, `Charts/BarViz`).
- **Explorer items: system vs. pinned.** A search tab shows two kinds of cards.
  - *System* items (the results table, auto charts, price-change charts) are derived from the
    current search on every render and never stored.
  - *Pinned* items are snapshots in `ExplorerItemsContext` (one provider per tab, wired in
    `TabProviders.tsx`). Add Chart and Pin create them; new searches and filter changes never
    touch them. Don't clear them on search, and don't write system charts into them. The
    Pinned section renders on both pages regardless of search state (on the FDA page it sits in
    `FdaSearch`, outside the `isSuccess` gate), so pins show while a search is missing,
    loading, or failing.
  - An item is an `ExplorerItem` (`library/explorerItems.ts`), a union on `kind` (only `"chart"`
    today). A chart stores its data as `ChartSeriesSnapshot[]` (`ndc`, `label`, `unit`,
    `points: [ms, price][]`), which is plain JSON so it can be persisted. `fromChartSeries` turns
    it back into `ChartPrice[]` for `LineViz`/`BarViz`.
  - **Chart dates are a view setting, not a filter.** A chart item keeps *every* date of its
    series and stores the dates it shows as `dateWindow` (`DateWindow` in `library/dates.ts`:
    ms, inclusive, a null end is open). The window can be widened later from the card's dates
    chip. `UnitSplit` clips to the window, and `LineViz` stretches the x-axis across the whole window,
    so a series that starts late shows a gap rather than a shorter axis.
  - The Page Tools "Chart dates" control (`ChartDatesControl`, both pages) sets `chartDates` in
    `ExplorerItemsContext`: fixed dates, or a **recent** preset ("Last year", "6 months", …)
    stored as the preset itself, so it follows the data as new weeks load. `useChartWindow`
    resolves it against the current search result on both pages: presets count back from the
    result's last date, and the inputs are limited to its range. Auto charts show the resolved
    window, and Add Chart and Pin start new items at it. Pinned items store fixed dates only,
    since their data never changes. The setting is not part of `FdaResultFilter`, doesn't touch
    the results table or which changes get flagged, and a new search keeps it.
  - Price-change charts (`PriceChangeCard`) open on ±`PRICE_CHANGE_WINDOW_MONTHS` around the
    change, with the change shaded (`changeSpan`, stored on pinned copies too), and toggle to the
    full history. They follow the chart dates like the other auto charts: only changes whose
    new price starts inside them get a card (`priceChangesInWindow`), and a note counts the
    rest. `MAX_AUTO_PRICE_CHANGE_CHARTS` applies to the changes inside the dates; past it, the
    note says how many there are instead of charting them. `NadacPriceChange` carries the
    `oldPrice` and `newPrice` the callout draws.
  - **"Match scale" is per chart**, not per section: a pinned line chart's menu toggles
    `ChartItem.matchScale`, and the matched charts in one pricing unit share a fitted price axis
    (`matchedPriceRange`), marked by a "Matched scale" chip. New pins start unmatched. A
    tab-wide switch matched unrelated pins with each other: $0.25 metformin on humira's
    $0–$8K axis is flat. So don't match charts the user didn't choose.
  - An item's `source` (its provenance chip) is computed by `createChartItem` from the item's data
    compared with the whole unfiltered search result (`ChartOrigin.resultPrices`, from the
    `use*ChartOrigin` hooks), never from filter state, so it stays true once stored. `filtered`
    compares whole series, not windows: the snapshot holds every date, so missing points can
    only come from page filters (e.g. an excluded package of a product). What a
    series is is stored as `seriesKind` (`"product" | "package" | "ndc"`), not display text;
    wording comes from one table in `explorerItems.ts`.
  - Every card uses `ExplorerGridItem`: a `<section>` labelled by its heading (`h2` for page
    cards, `h3` inside Pinned), with a collapse toggle wired with `aria-expanded`/`aria-controls`.
- **Chart data rules** (charts take `ChartPrice[]`, which `NadacPrice` satisfies):
  - A chart series is one `NadacPrice.ndc`. At FDA product level that is the *product* NDC, so
    several packages share a series and can disagree on a date. `createLineVizData` averages
    them per date and keeps their min–max as `rangeKey(ndc)`, which `LineViz` shades. Never
    assume one price per NDC per date.
  - Never put two pricing units on one axis. `LineViz` and `BarViz` render through `UnitSplit`,
    which splits by `pricingUnit` and captions each chart with its unit.
  - Auto-added charts are gated on **series** count, not price rows (one package has about
    250 weekly rows). Both pages call `shouldAutoChart` in `chartSeries.ts`.
  - API dates are calendar days that `new Date("YYYY-MM-DD")` reads as UTC midnight. Every date
    display, in charts or anywhere else, goes through the UTC helpers in `library/dates.ts`
    (`formatDate`, `toDateInput`; axis ticks from `dateTicks` in `chartScale.ts`). Local formatting shows the day before in
    the Americas.
  - **Price axes are fitted, but may exaggerate a change at most `MAX_AXIS_EXAGGERATION` times**
    (`constants.ts`, 4: a 10% change fills at most 40% of the chart height). `fittedPriceAxis`
    in `chartScale.ts` makes the visible span at least `max / MAX_AXIS_EXAGGERATION`, centers it on
    the data, never goes below $0, and rounds the ends to round ticks. Line charts use it, and
    Match scale feeds it one shared range per unit. Bar lengths always
    start at $0 (`zeroBasedAxis`). Don't fit an axis tighter than this rule; the author
    considers small changes drawn as big ones misleading. Tick labels come from
    `priceTickFormatter` (precision follows the tick step), value labels on the chart from
    `formatPriceLabel` (three significant digits under $1, so neighbors look alike), and full
    prices in tooltips and tables from `formatPrice`.
  - **Series colors** come from the theme palette (`palette.chart.series`: 10 color-blind-safe
    colors, each at least 3:1 on the card; `chartPalette.test.ts` checks it). Each NDC prefers
    the slot of its position in the *unfiltered* search result, so filters never move it.
    `useSeriesColors` resolves clashes once per page over the series shown, so every chart on a
    page agrees and visible series never share a color while there are 10 or fewer. Add Chart and
    Pin store each series' `color` in the snapshot, because the result the slots came from is
    gone after the next search. Pass the page's map to `LineViz`/`BarViz` as `colors`.
  - **Bar charts** are horizontal and sorted. Each row shows the latest price or the average
    over the chart's dates (`BarValue`; a Latest/Average toggle on every bar card, stored on
    pinned bars), plus the range from the lowest to the highest price over the same dates.
    `summarizeSeries` computes all of these from the per-date values the line chart draws, so
    at product level the range is that of the averaged line over time, never the spread
    between packages. The app-wide `barStyle` setting picks how a row is drawn:
    - `dot` (default): a dot at the price on a track over the range, on a fitted axis (the
      exaggeration cap applies) with a faint rail per row from the label to the dot;
    - `bar`: a bar from $0 to the price, with a gray range track under it.

    A caption says what the marks mean. Rows are drawn in the `Bar` `shape` from the row's
    band and the axis domain. Don't use recharts' `ErrorBar`: it kept a stale scale and drew
    ranges at half their prices. Don't set `allowDataOverflow` on the value axis either,
    because it clips the value labels to the plot.
  - Line charts draw steps (`type="stepAfter"`): a NADAC price holds until the next weekly
    file. Charts split by unit share one date axis. A single series has no legend; the
    title names it. When a line averages several packages, a caption under the chart says so
    and what the band means, once, rather than in every tooltip row.
  - **Tooltips are drawn by the charts** (`LineTooltip`, `BarTooltip`), not recharts' default
    list, and they must work on a phone, where a chart is about 350px wide and a finger sits on
    it. The line tooltip lists the date and unit once, then a swatch, the NDC and the price per
    series. Descriptions, package ranges and package counts show only from `md` up. On a phone
    the line tooltip stays at the top of the chart. The bar tooltip goes above the plot, over the
    caption and toggle, because a bar chart's rows fill it and any spot inside would cover one. The tooltip box (`useChartTheme().tooltip`) is capped at
    `min(360px, 100vw − 64px)`. Before adding a line to a tooltip, check it at phone width.
  - Titles are generated (`chartTitles.ts`): the title says what is common ("Humira: 7
    products over time"), and the subtitle gives the count and the dates shown. Price-change
    cards name the change (the percent), its date, and the package.
  - **Price changes are called out on the line**, not with a shaded band: dots at the old
    and new price on the step, the old price continued as a dashed line, and a pill
    beside the step with the prices before and after ("$9.69 → $5.52"; `ChartChangeSpan.from`/
    `to`). The percent stays in the title, which a collapsed card still shows. The pill is
    outlined green for a drop and in the theme's `error` color for a rise. Spans pinned before
    the prices were stored get a dashed line at the date, labeled with the percent.
  - Chart animations are off (`isAnimationActive={false}`). Recharts morphs the old line into the new
    one point by point, which drew made-up prices whenever the dates changed, and re-renders
    kept restarting it.
  - FDA table row ids are the NDC that level's chart data uses (product NDC or package NDC),
    which is what Add Chart filters on. `setFdaResultDetailLevel` in `FdaSearchContext`
    clears the selection on every level change.
- API base URL comes from `VITE_API_URL`. `client/.env.development` is gitignored; copy
  `client/.env.example` to it for local dev (`http://localhost:5250/api`).
- Wire responses are converted to domain types by the `map*` helpers in `src/api/types.ts` —
  date strings become `Date` objects there, not in components.
- **FDA search filters on two layers, on purpose.** The search params (`AdvancedFdaSearchParams`
  → `/fda-products/advanced-search`) decide what data is loaded. The results-page filters
  (`FdaResultFilter`, stored as exclusions and applied by `applyFdaResultFilter` in
  `src/library/types.ts`) narrow that
  data locally, so users can start with a broad search and hunt through it without hitting the
  server again. The overlap is not a bug to dedupe. Rule of thumb: a filter that limits
  payload belongs on the server, and a filter for hunting through results belongs on the client.
  Two counts follow from this: the toast in `useFdaSearch` reports what was fetched, and the
  tables show what survives the client filters. Rough edges as of 2026-10: sample packages are
  filtered on both layers, and the server excludes them by default, which leaves the client's
  "Include Sample Packages" toggle disabled. The no-price filter exists only on the server.
- **The NADAC page has no two-layer model yet.** Its Drug page filter is stored as
  `excludedNdcDescriptions` in `SearchContext`; the selection and `vizData` are derived from it,
  and a new search clears it. Only Add Chart reads `vizData`: the results table and auto charts
  always show the full result (`data.prices`). Moving it onto a client filter like
  `FdaResultFilter` is planned NADAC/FDA parity work.
- **The global modal** (`Components/GlobalModal`, opened with `setGlobalModal`) owns its width
  (`min(700px, 100vw − 32px)`, so a phone keeps 16px of screen at each edge), its height and
  its padding. What it shows (Settings, Help/Welcome, About) brings no `Container` or outer
  padding, and wide parts such as tables scroll on their own. The dialog role and its name sit on the
  inner box, because MUI's `Modal` root is `role="presentation"`. The phone drawer closes before
  a modal opens from it. The `/about` and `/welcome`
  routes wrap the same components in a `Container` for page gutters.
- **Settings** (`library/settings.ts`, `SettingsContext`, `Components/Settings/SettingsPanel`)
  are app-wide preferences for choices most people never change, kept out of the always-visible
  Page Tools. The panel opens from the gear in the app bar or SETTINGS in the workspace drawer
  (the global modal's `"settings"`). Today it holds only `barStyle`. Settings are saved once
  under `drugpricing.v<VERSION>.settings` and validated field by field (`loadSettings`), and
  pruning keeps them. Other windows follow a settings change (`watchSettings`) instead of going
  read-only like they do for tab state. New preferences belong here, not in Page Tools.
- **Persistence (`library/persist.ts`).** The workspace (tabs, layout, pane assignment) and each
  search tab's state (FDA: search params, result filter, detail level; NADAC: search params,
  excluded Drug descriptions; both: pinned items, chart dates) are saved to `localStorage` and restored on
  load. A restored tab re-runs its search; pinned items come back from their snapshots. Row
  selection and card collapse state of system cards are not saved.
  - Keys are `drugpricing.v<VERSION>.workspace` and `drugpricing.v<VERSION>.tab.<tabId>`. Bump
    `VERSION` when a stored shape changes incompatibly; old data is then ignored, not misread.
    `pruneStoredState` deletes every `drugpricing.` key outside the current version's prefix on
    load, so old snapshots don't keep using quota. Keep that if you change the key scheme.
  - Every read is validated and falls back to defaults. Tab state is validated field by field
    (`loadFdaTabState`/`loadNadacTabState`), each field with its own default, so a bad field or
    a malformed pinned item never costs the tab its other pinned items. A page filter is kept
    only with a valid search. Writes that fail (storage full or blocked) warn once with a toast.
  - Adding a field doesn't need a `VERSION` bump: make it optional when reading and give it a
    default. Pinned charts saved before chart dates existed have no `dateWindow` and load showing
    all dates. Bump only when old data would be misread.
  - Tab providers (`TabProviders.tsx`) load once on mount and save on every change; they get
    `tabId` as a prop from `TabInstance`. The standalone `/fda-search` and `/nadac-search` pages
    persist under `STANDALONE_TAB_IDS`. Blank "new" tabs save nothing.
  - A restored tab doesn't run its search until it is first shown: `TabInstance` passes
    `active` (has been visible) to the provider, which sets `searchEnabled` for `useFdaSearch`/
    `useNadacSearch`. Pinned items render from snapshots meanwhile.
  - **Several browser windows:** each window holds its own copy. When another window changes a
    stored value this window didn't write, `watchOtherWindows` makes this window read-only (no
    more writes or deletes) and a toast asks the user to reload. Without that, the last window
    to write would win, and pruning would then delete tabs the other window had added.
  - Closing a tab or changing its type removes its saved state, and load prunes state for tabs
    that are no longer in the workspace.
  - Anything that resets state when data loads will undo a restore. Store restorable state so
    it needs no reset: both page filters store *exclusions* (`FdaResultFilter.excluded*`,
    `excludedNdcDescriptions`), so results that are new since the save still show, and a new
    search clears the filter explicitly.

Commands (from `client/`):

```bash
npm install
npm run dev      # Vite dev server
npm run build    # tsc -b && vite build
npm run lint     # eslint
npm test         # vitest run
```

Tests are Vitest unit tests next to the code they test (`src/library/*.test.ts`): dates and
windows, axis scales and tick formats (including the exaggeration cap), series colors, bar
summaries, chart titles, the palette's contrast, chart item provenance, Match scale, and `persist.ts` (loading saved state, pruning,
the multi-window read-only switch). `persist.test.ts` re-imports the module for each test
because it keeps module state. They run in
the Node environment (no DOM) with `TZ=America/Chicago` set in `vite.config.ts`, so a
local-time date bug fails them. There are no component tests yet.

## ETL (`etl/`) — Python 3.13

Interactive entry point: `etl/drug_pricing_etl.py <mode>`, where `<mode>` selects
`.env.<mode>` (`dev`, `test`, `prod`). It prompts whether to update FDA and/or NADAC.

- `config.py` — loads `.env.<mode>` into a module-level `Environment` (`init_env`/`get_env`).
- `library/models.py` — Pydantic models (`Environment`, `NadacPrice`, FDA models, enums).
  These mirror the C# entities in `server/Models/`; keep the two in sync.
- `library/parsing.py` — row-to-model helpers (`parse_date`, `split_values`, `str_or_none`,
  `is_missing`, `iter_records`) and the source date formats (`FDA_DATE_FORMAT`,
  `NADAC_DATE_FORMAT`). Only `None`/NaN counts as missing; any other unexpected value must
  raise. Never call `pd.to_datetime` on a scalar or use `iterrows()` in a per-row loop —
  both were the bulk of the old parse time (~40s for FDA on a Mac, minutes on the Pi).
- `library/timing.py` — `timed(label)` context manager; the orchestrators print
  `[timing] <stage>: <s>s (ok|failed)` lines for the cron log.
- `library/db.py` — `psycopg` connection from `DATABASE_URL`, plus `test_connection`.
  `test_connection` borrows the connection it is given; it must not be used with
  `with connection as conn:`, which closes the connection in psycopg3.
- `nadac/` — `update_nadac.py` orchestrates `fetch_nadac` → `parse_nadac` → `load_nadac`,
  then `update_drug_package`. `get_loaded_as_of_dates.py` supports the
  `NADAC_FILTER_BEFORE_INSERT` skip-already-loaded path. `sql/load_nadac.sql` is marked TODO.
- `fda/` — `update_fda.py` orchestrates `fetch_fda` (the NDC zip) →
  `parse_fda_products`/`parse_fda_packages` → the matching `load_*` modules →
  `tombstone_fda.py`. Packages are filtered to the set of loaded **`product_ndc`** values;
  filtering on `product_id` would drop packages belonging to a merged-away duplicate row.
- `tests/` — pytest: `test_nadac_models.py`, `test_fda_models.py`, `test_parsing.py`.
  `pytest.ini` sets `pythonpath = .`.

**Connection ownership.** `update_fda` and `update_nadac` own the connection, the run
timestamp, and the single `commit()` for their path. Every loader and query module takes
`conn` as a required first parameter, never calls `get_connection()` or `commit()` itself,
and raises instead of `sys.exit()` so the orchestrator's transaction rolls back. The whole
FDA load is one transaction.

**FDA duplicate merge.** A single NDC file can carry several rows per `ProductNdc` with
disjoint package sets, so `load_fda_products.py` collapses each group with
`DISTINCT ON ("ProductNdc")` ordered by `StartMarketingDate DESC, "ProductId"` — the
surviving row inherits the union of its group's packages via the `ProductNdc` FK. Groups
that disagree on dosage form, product type, or ingredients are logged as a warning and
merged anyway (~11 as of the 2026-09 file; FDA-side data rot, not a code fault).

Env vars (`etl/.env.example`): `DATABASE_URL`, `NADAC_FILTER_BEFORE_INSERT`,
`NADAC_FILE_DATES` (comma-separated mm-dd-yyyy list). Each NADAC file is cumulative
year to date (~1.2M rows by late year), so keep `NADAC_FILTER_BEFORE_INSERT` on.

Commands (from `etl/`):

```bash
source .venv/bin/activate
pip install -r requirements.txt
python drug_pricing_etl.py dev
pytest
```

Operational note: NADAC files have been available as early as ~6:17 AM Wednesday; a
scheduled job should start early and retry every 30 minutes.

## Deployment

`.github/workflows/deploy.yml` runs on push to `main` on a self-hosted runner (a
Raspberry Pi). In order, it:

1. Rsyncs `etl/` to `/home/ghrunner/apps/drugpricing-etl/` with `--delete`: anything in that
   directory that is not in the checkout is removed on every deploy.
2. Copies `/home/ghrunner/config/drugpricing-client/.env.production` into `client/`, then
   builds the client and rsyncs `client/dist/` to `/var/www/DrugPricing/` (also `--delete`).
3. Publishes the server with `dotnet publish -c Release` and rsyncs it to
   `/home/ghrunner/apps/drugpricing/`, excluding `appsettings.json`.
4. Restarts the `drugpricing` systemd service.

Branching: work happens on feature branches that open PRs against `dev`. When `dev` is
ready to ship, it is merged into `main`; `main` is the deploy branch (a push to it runs
`deploy.yml`). Never target `main` directly from a feature branch.

## Conventions and agent guidance

- Keep the three NADAC representations aligned: `server/Models/NadacPrice.cs`,
  `etl/library/models.py`, and `client/src/library/types.ts` + `src/api/types.ts`.
- Minimum search lengths are duplicated across server and client and must be changed on both
  sides: server `MIN_NDC_DESCRIPTION_LENGTH`/`MIN_NDC_LENGTH` (`NadacService`) and
  `MIN_NAME_LENGTH` (`FdaProductService`); client `client/src/library/constants.ts`. NADAC search
  dates default to the last `DEFAULT_NADAC_SEARCH_MONTHS` of loaded data (from `app-init`;
  ending today if that fails); the server snaps both dates to loaded as-of dates.
- Prefer adding new server logic in `Services/` and new data access in `Data/Repositories/`
  rather than in endpoint handlers.
- Repository methods that `TryGetValue` must also `_cache.Set` before returning, and must use
  their own key from `CacheKeys` — a shared key silently serves one list as another.
- Markdown: `MD013` (line length) is disabled — see `.markdownlint.json`.
- Never read, echo, or commit `etl/.env*` (except `.env.example`) or
  `server/appsettings.Development.json`; they hold real credentials and are gitignored.
- `client/dist/`, `server/bin/`, `server/obj/`, and `etl/.venv/` are build/vendor output —
  do not search or edit them.

## Known rough edges (fair game for review)

Planned work is in [FUTURE_WORK.md](FUTURE_WORK.md): decided directions (such as removing the
standalone `/fda-search` and `/nadac-search` routes), cleanups, and feature ideas that should
shape current structure. Don't flag its items as new findings, and add to it rather than fixing
them inside unrelated work.

- `/api/nadac-prices/advanced-search` is stubbed out and returns nothing useful.
- `AdvancedSearchRequest` is bound `[FromBody]` on a `MapGet` route; the FDA equivalent
  smuggles JSON through a query-string parameter.
- `Console.WriteLine` debug logging in `FdaProductEndpoints`; `console.log` in `api.ts`.
- `flagNadacPriceChange` sorts the `nadacPrices` array it is given in place, which mutates the
  React Query cache's package data. Harmless today (date order is the natural order).
- `NadacRepository.ListSearchResultsAsync` calls `TryGetValue` but never `_cache.Set`, so NADAC
  search results are never cached (it breaks the cache rule under Conventions).
- `NadacService.ValidateNdc` is never called, so the server does not enforce the NDC minimum:
  `ndc=1` returns 47,072 rows for a one-week window. Only the client enforces it.
- No server tests. The client has Vitest coverage for `library/` logic only (no component
  tests). ETL has pytest coverage for model parsing and helpers only (see `etl/tests/`); fetch,
  load, and tombstone are untested.
- `NadacPrice.loaded_at` in `etl/library/models.py` still defaults to
  `datetime.now(timezone.utc)` evaluated at **import** time, so a run shares one timestamp by
  accident. Harmless today because nothing keys off it; the FDA models had the same default
  removed because tombstoning depends on an explicit per-run timestamp.
