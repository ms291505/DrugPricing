# DrugPricing

A full-stack web app for storing, serving, and charting US drug pricing data. Search the
NADAC weekly pricing series by drug name or NDC, or explore the FDA NDC directory and chart
the prices for the products and packages you find. The app began as a way to learn new
skills end to end, from database to deployment.

**Live demo:** <https://drugpricing.mikesteiner.info>

## What it does

- Searches NADAC prices by drug description or NDC, over a date range.
- Searches and filters FDA products and packages (name, dosage form, route, and more),
  then charts the NADAC prices for what matched.
- Draws line charts (a price holds until the next weekly file, so lines are steps) and
  bar charts that compare series by latest or average price, with the price range.
- Flags price changes and charts them in context.
- Lets you pin charts into a tabbed, multi-pane workspace that is saved in your browser.
- Offers a data table and CSV download under every chart, keyboard navigation, and a
  screen-reader readout of the active point.

## Architecture

| Piece | Path | Tech |
| --- | --- | --- |
| Database | `server/docker-compose.yml` (local) | PostgreSQL 17 |
| ETL | `etl/` | Python 3.13, pandas, Pydantic, psycopg |
| API | `server/` | .NET 10 minimal API, EF Core, Npgsql |
| Client | `client/` | React 19, TypeScript, Vite, MUI, TanStack Query, recharts |
| Ad-hoc analysis | `reporting/sql/` | SQL |

Data flows one way: the ETL downloads and loads NADAC and FDA data into Postgres, the API
reads it (with in-memory caching), and the client queries the API.

On the server, requests go endpoint → service → repository → `DrugPricingContext`. See
[`AGENTS.md`](AGENTS.md) for the full map of the code, conventions, and known rough edges,
and [`FUTURE_WORK.md`](FUTURE_WORK.md) for planned work.

## Data sources

- **NADAC (National Average Drug Acquisition Cost):** weekly files from
  [download.medicaid.gov](https://download.medicaid.gov), published by the Centers for
  Medicare & Medicaid Services (CMS). This is the price series the app charts.
- **FDA NDC Directory:** [`ndctext.zip`](https://www.accessdata.fda.gov/cder/ndctext.zip)
  from the FDA. This is the product and package reference data used to find and filter drugs.

### Disclaimer

DrugPricing is a personal learning project. It is not affiliated with or endorsed by CMS or
the FDA. NADAC is a survey-based estimate of what pharmacies pay to acquire a drug. It is
not what a patient pays, a retail price, or a reimbursement rate. The data may be incomplete
or out of date, and nothing here is medical, financial, or pricing advice.

## Getting started

You need Docker, the .NET 10 SDK, Node.js, and Python 3.13.

### 1. Database

From `server/`:

```bash
docker compose up -d
```

This starts Postgres with a `drug_dev` database on port 5432. On a fresh database, enable
the trigram extension once (the search indexes need it):

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### 2. Server

1. Copy `server/example.appsettings.Development.json` to
   `server/appsettings.Development.json` and fill it in. `DevClientHost` must be set or
   the server will not start.
2. From `server/`:

   ```bash
   dotnet run
   ```

The API listens on <http://localhost:5250>, with Swagger at `/swagger`. Migrations are
applied on startup.

### 3. Load data (ETL)

1. Copy `etl/.env.example` to `etl/.env.dev` and set `DATABASE_URL`.
2. From `etl/`:

   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   python drug_pricing_etl.py dev
   ```

The script asks whether to update FDA data, NADAC data, or both. Each NADAC file is
cumulative for the year to date (over a million rows late in the year), so leave
`NADAC_FILTER_BEFORE_INSERT` on to skip rows that are already loaded.

NADAC files have been available as early as about 6:17 AM on Wednesdays, so a scheduled
job should start early and retry every 30 minutes.

### 4. Client

1. Copy `client/.env.example` to `client/.env.development`. It points at
   `http://localhost:5250/api`.
2. From `client/`:

   ```bash
   npm install
   npm run dev
   ```

## Development

| Where | Command | What it does |
| --- | --- | --- |
| `client/` | `npm run lint` | ESLint |
| `client/` | `npm test` | Vitest unit tests (`src/library/`) |
| `client/` | `npm run build` | Type-check and production build |
| `etl/` | `pytest` | Model and parsing tests |
| `server/` | `dotnet build` | Build the API |
| `server/` | `dotnet ef migrations add <Name>` | Add a migration |

There is no server test project yet, and the client has no component tests. Work happens
on feature branches that open pull requests against `dev`; `dev` is merged into `main` to
ship.

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml` on a self-hosted runner (a Raspberry
Pi). It syncs the ETL, builds and publishes the client, publishes the server, and restarts
the `drugpricing` service. Production reads its database settings from the standard `PG*`
environment variables (`PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`).

## Attributions

The medicine and graph icons are free resources from Flaticon:

- [Medicine icons created by Freepik - Flaticon](https://www.flaticon.com/free-icons/medicine)
- [Graph icons created by Bamicon - Flaticon](https://www.flaticon.com/free-icons/graph)
