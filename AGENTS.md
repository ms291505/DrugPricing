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
- `GET /api/app-init` — NADAC as-of date range, unique dosage form names, route names.
  The client calls this on boot to populate filters.
- `GET /api/nadac-prices/{id}`
- `GET /api/nadac-prices/search?ndcDescription=&ndc=&minDate=&maxDate=`
- `GET /api/nadac-prices/advanced-search` — **incomplete**, currently returns an empty `Ok()`.
- `GET /api/fda-products/search?proprietaryName=`
- `GET /api/fda-products/advanced-search?jsonString=` — takes a JSON-encoded
  `AdvancedFdaSearchRequest` in a query string.

Notes and gotchas:

- Description search uses Postgres trigram similarity (threshold `0.3`). A fresh DB needs
  `CREATE EXTENSION IF NOT EXISTS pg_trgm;`.
- **`ProductNdc` is the FDA product key**, not `ProductId`. The FDA reissues `ProductId`
  (`{ProductNdc}_{guid}`) every time a product record changes, so it is a rotating version
  stamp kept only for traceability. `FdaProducts.ProductNdc` is unique and
  `FdaPackages.ProductNdc` is the FK — never join or upsert on `ProductId`.
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
| API calls | `src/api/` — `api.ts` (base URL/helpers), `nadacEndpoints.ts`, `fdaEndpoints.ts`, `types.ts` (wire types + mappers) |
| Domain types + transforms | `src/library/` — `types.ts`, `createLineVizData.ts`, `flagNadacPriceChange.ts`, `nadacPriceToDrug*.ts`, `fdaDataToNadacPrices.ts`, `dollarFormatter.ts` |
| Shared constants | `src/library/constants.ts` |
| React Query hooks | `src/hooks/` — `useNadacSearch.ts`, `useFdaSearch.ts`, plus UI hooks (`useMobile`, `useOnScreen`, `useScrolled`) |
| Global state | `src/Context/` — `WorkspaceContext`, `TabInstanceContext`, `SearchContext`, `FdaSearchContext`, `GlobalModalContext` |
| Theme | `src/theme.ts` |

Feature folders under `src/Components/`:

- `Workspace/` — the primary UI. A tabbed, multi-pane workspace (`WorkspaceContext` owns
  tabs, `layoutMode`, and `paneAssignment`); `TabInstance` renders a tab's content by
  `TabType`, resolved in `src/library/types.ts`.
- `NadacSearch/` — NADAC search plus the visualizations (`LineViz`, `BarViz`, `TableViz`,
  MUI X chart variants, `CreateChart`, `VizTools`).
- `FDA/` — FDA product/package explorer, tables, column defs, and filters.
- `DrugPricingBar/`, `GlobalModal/`, `About/`, `OnBoarding/`, `DataPane/`,
  `ExplorerGrid/`, `TabCreator/`, `ui/` — supporting UI.

Notes:

- Both `recharts` and `@mui/x-charts` are in use (`LineViz`/`BarViz` vs `MuiLineViz`/`MuiBarViz`).
- API base URL comes from `VITE_API_URL` (`client/.env.development` → `http://localhost:5250/api`).
- Wire responses are converted to domain types by the `map*` helpers in `src/api/types.ts` —
  date strings become `Date` objects there, not in components.

Commands (from `client/`):

```bash
npm install
npm run dev      # Vite dev server
npm run build    # tsc -b && vite build
npm run lint     # eslint
```

There is currently no client test suite.

## ETL (`etl/`) — Python 3.13

Interactive entry point: `etl/drug_pricing_etl.py <mode>`, where `<mode>` selects
`.env.<mode>` (`dev`, `test`, `prod`). It prompts whether to update FDA and/or NADAC.

- `config.py` — loads `.env.<mode>` into a module-level `Environment` (`init_env`/`get_env`).
- `library/models.py` — Pydantic models (`Environment`, `NadacPrice`, FDA models, enums).
  These mirror the C# entities in `server/Models/`; keep the two in sync.
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
- `tests/` — pytest; only `test_nadac_models.py` exists today. `pytest.ini` sets `pythonpath = .`.

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
`NADAC_FILE_DATES` (mm-dd-yyyy list — the comment says commas, `config.py` splits on `.`;
that mismatch is a known wart).

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
Raspberry Pi). It builds the client and rsyncs `client/dist/` to `/var/www/DrugPricing/`,
publishes the server with `dotnet publish -c Release`, rsyncs it to the app directory
(excluding `appsettings.json`), and restarts the `drugpricing` systemd service.

Branching: work happens on `dev`; `main` is the deploy branch and the PR target.

## Conventions and agent guidance

- Keep the three NADAC representations aligned: `server/Models/NadacPrice.cs`,
  `etl/library/models.py`, and `client/src/library/types.ts` + `src/api/types.ts`.
- Constants duplicated across server and client (min search lengths, date bounds) must be
  changed on both sides.
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

- `/api/nadac-prices/advanced-search` is stubbed out and returns nothing useful.
- `AdvancedSearchRequest` is bound `[FromBody]` on a `MapGet` route; the FDA equivalent
  smuggles JSON through a query-string parameter.
- `Console.WriteLine` debug logging in `FdaProductEndpoints`; `console.log` in `api.ts`.
- No automated tests for the server or client; ETL coverage is one model test.
- `NadacPrice.loaded_at` in `etl/library/models.py` still defaults to
  `datetime.now(timezone.utc)` evaluated at **import** time, so a run shares one timestamp by
  accident. Harmless today because nothing keys off it; the FDA models had the same default
  removed because tombstoning depends on an explicit per-run timestamp.
