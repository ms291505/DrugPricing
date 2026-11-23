# DrugPricing

A full-stack web app for exploring weekly US drug acquisition prices. Search NADAC by drug
description or National Drug Code (NDC), or find products and packages in the FDA directory
by brand or generic name and chart their matching NADAC prices. The app began as a way to
learn new skills end to end, from database to deployment.

**Live demo:** <https://drugpricing.mikesteiner.info>

## What it does

- Searches NADAC prices by drug description or NDC, over a date range.
- Searches and filters FDA products and packages (name, dosage form, route, and more),
  then charts the NADAC prices for what matched.
- Draws line charts of price over time and bar charts comparing series by latest or
  average price.
- Flags notable package price changes and lets you scan at a threshold you choose.
- Saves pinned charts and price change lists in your browser. The standalone searches share
  pins, and each Workspace tab has its own. Copy a search and its pins to a new tab from the
  search panel.
- Offers a data table and CSV download under every chart.
- Supports keyboard navigation and a screen-reader readout of the active point.

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

See [`AGENTS.md`](AGENTS.md) for the full map of the code, conventions, and known rough edges,
and the [documentation index](docs/README.md) for plans, review notes, published Help and
[future work](docs/future-work.md).

## Data sources

- **NADAC (National Average Drug Acquisition Cost):** weekly files from
  [download.medicaid.gov](https://download.medicaid.gov), published by the Centers for
  Medicare & Medicaid Services (CMS). This is the price series the app charts.
- **FDA NDC Directory:** [`ndctext.zip`](https://www.accessdata.fda.gov/cder/ndctext.zip)
  from the FDA. This is the product and package reference data used to find and filter drugs.

### Disclaimer

DrugPricing is an independent learning project. It isn’t affiliated with or endorsed by CMS or the
FDA. NADAC estimates what retail community pharmacies pay to acquire drugs. It doesn’t show what patients
pay at the pharmacy, and it isn’t a retail price or a reimbursement rate. The data may be incomplete or
out of date. DrugPricing does not provide medical, financial or pricing advice.

## Getting started

You need Docker, the .NET 10 SDK, Node.js 20.19+ or 22.12+, and Python 3.13. To add
migrations you also need the EF Core tool: `dotnet tool install --global dotnet-ef`.

### 1. Database

From `server/`:

```bash
docker compose up -d
```

This starts Postgres with a `drug_dev` database on port 5432 (user `appuser`, password
`devpassword`). Before starting the server for the first time, enable the trigram extension.
The first migration builds trigram indexes and fails without it:

```bash
docker compose exec postgres psql -U appuser -d drug_dev -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
```

### 2. Server

1. Copy `server/example.appsettings.Development.json` to
   `server/appsettings.Development.json` and fill it in. It is gitignored. Use:
   - `ConnectionStrings:Default`:
     `Host=localhost;Port=5432;Database=drug_dev;Username=appuser;Password=devpassword`
   - `DevClientHost`: `http://localhost:5173` (Vite's default port). It must be set or the
     server will not start, and CORS rejects the client if it doesn't match.
2. From `server/`:

   ```bash
   dotnet run
   ```

The API listens on <http://localhost:5250>, with Swagger at `/swagger`. Migrations are
applied on startup.

### 3. Load data (ETL)

1. Copy `etl/.env.example` to `etl/.env.dev` and set:
   - `DATABASE_URL`: the same database as the server.
   - `NADAC_FILE_DATES`: the NADAC files to load, as comma-separated `mm-dd-yyyy` dates (no
     spaces), one per Wednesday. If it is empty, the NADAC load exits without loading anything.
2. From `etl/`:

   ```bash
   python3.13 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   python drug_pricing_etl.py dev
   ```

The script asks whether to update FDA data, NADAC data, or both. Each NADAC file is
cumulative for the year to date (over a million rows late in the year), so leave
`NADAC_FILTER_BEFORE_INSERT` on to skip rows that are already loaded.

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

To run the ETL without prompts, use `python drug_pricing_etl.py <mode> --fda --nadac` with
either or both flags. `--nadac` selects the most recent Wednesday’s file without reading
`NADAC_FILE_DATES`. Before noon Eastern on Wednesdays, it selects the previous week’s file, so a
run before noon reloads last week’s. From noon on it asks for that Wednesday’s file, but CMS may
not have published it yet: the run then exits with `NADAC_NOT_200`, and nothing retries it.
Schedule the job at noon Eastern or later, and retry it until the file is available.

## Attributions

The medicine and graph icons are free resources from Flaticon:

- [Medicine icons created by Freepik - Flaticon](https://www.flaticon.com/free-icons/medicine)
- [Graph icons created by Bamicon - Flaticon](https://www.flaticon.com/free-icons/graph)

## License

Copyright © 2026 Michael Steiner. All rights reserved.

This source code is made available for viewing and evaluation only, as a demonstration of the
author's work. Beyond the rights granted by GitHub's Terms of Service, no permission is granted to copy,
modify, distribute, sublicense, or use this code, in whole or in part, in any product or
service, without the author's prior written consent. Requests for permission may be made through the author's GitHub profile.

The software is provided "as is", without warranty of any kind, express or implied. The author
is not liable for any claim, damages, or other liability arising from its use.

Third-party data and icons remain subject to their owners' terms.
