# Self-hosted observability for DrugPricing

## Context

Which self-hosted observability options fit this codebase. What's there today:

- **Server** (.NET 10 minimal API, EF Core + Npgsql, `IMemoryCache`): default ASP.NET console
  logging only, which systemd sends to journald. Two `Console.WriteLine` calls in
  `server/Endpoints/FdaProductEndpoints.cs:45,49`. `/api/up` returns a constant and never touches
  the DB. No metrics, no traces, no cache hit rate.
- **ETL** (Python, weekly cron): `timed()` in `etl/library/timing.py` prints `[timing]` lines to
  the cron log, and `ExitCode` (`etl/library/exit_codes.py`) has meaningful exit codes. Nothing
  alerts when a run fails or never starts. This is the most likely thing to break unnoticed,
  because NADAC files arrive at unpredictable times.
- **Client**: static files under `/var/www/DrugPricing` (likely served by nginx). No error
  reporting from browsers.
- **Host**: one Raspberry Pi running the API, Postgres, the web server, the ETL and the GitHub
  runner. RAM is the main limit on what you can run there.

## Options, grouped by what they answer

| Question | Tool (all ARM64, self-hostable) | Pi cost | Notes |
|---|---|---|---|
| Is the site up? | **Uptime Kuma** or **Gatus** | ~50–100 MB | Ping `/api/up` and the client. Best run on a machine other than the Pi, so it still works when the Pi is down. |
| Did the weekly ETL run? | **Healthchecks** (self-hosted) | ~100 MB | Dead-man's switch: the ETL pings `/start`, then success or `/fail` with its exit code. You get an alert when no ping arrives. |
| Exceptions, with stack traces | **GlitchTip** (Sentry-compatible) | ~300–500 MB with its own Postgres/Redis | Sentry SDKs for .NET, React and Python all work with it. Self-hosted Sentry itself needs about 16 GB, too much for a Pi. |
| Host health and Postgres | **Netdata**, or **node_exporter + postgres_exporter** | 50–150 MB | Netdata needs no setup. Add `pg_stat_statements` to see slow queries, such as the `ILIKE '%term%'` search. |
| API metrics, traces, logs (the full picture) | **OpenTelemetry → Grafana stack** (Alloy, Prometheus/Mimir, Loki, Tempo, Grafana) | 0.6–1.5 GB | Industry standard and worth learning. `grafana/otel-lgtm` runs all of it in one container for local dev. |
| Same, lighter | **OpenObserve** (single Rust binary, accepts OTLP) | ~100–300 MB | Logs, metrics and traces in one UI. Fits a Pi. Smaller ecosystem than Grafana. |
| Avoid on a Pi | SigNoz, Uptrace, HyperDX (need ClickHouse), Elastic/ELK, self-hosted Sentry | GBs | — |

Another option: run the heavier backend (Grafana stack or GlitchTip) on another machine and send
OTLP to it over Tailscale/LAN. That keeps load off the Pi, and the monitoring keeps working when
the Pi is down.

## Recommendation

**Instrument with OpenTelemetry once, then choose the backend.** OTLP works with every backend
in the table, so the code doesn't depend on the stack you pick.

### Step 1 — Server instrumentation (code, PR against `dev`)

In `server/server.csproj` add `OpenTelemetry.Extensions.Hosting`,
`OpenTelemetry.Exporter.OpenTelemetryProtocol`, `OpenTelemetry.Instrumentation.AspNetCore`,
`OpenTelemetry.Instrumentation.Runtime` (or use .NET's built-in `System.Runtime` meter) and
`Npgsql.OpenTelemetry`.

In `server/Program.cs`:
- `builder.Services.AddOpenTelemetry().ConfigureResource(r => r.AddService("drugpricing-api"))`,
  with tracing (AspNetCore + `AddNpgsql()`), metrics (AspNetCore, runtime, Npgsql) and
  `builder.Logging.AddOpenTelemetry(...)`.
- Turn on the OTLP exporter only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. Then production and
  dev behave exactly as they do today until a backend exists. The endpoint goes in the Pi's
  systemd env or the kept `appsettings.json`, the same way the `PG*` vars do.
- Health checks: `AddHealthChecks().AddDbContextCheck<DrugPricingContext>()` (package
  `Microsoft.Extensions.Diagnostics.HealthChecks.EntityFrameworkCore`), mapped at
  `/api/health`. Leave `/api/up` alone.
- Optional: a `Meter("DrugPricing.Cache")` counter for hits and misses in the repositories (keys
  are in `Constants/`). It would show that NADAC searches are never cached, a known rough edge.
- Replace the two `Console.WriteLine` calls with `ILogger`. This removes one known rough edge.

### Step 2 — ETL alerting (small code change)

- In `etl/drug_pricing_etl.py`, add an optional `HEALTHCHECK_URL` from `.env.<mode>`. Ping
  `/start` at launch, then `/<exit code>` on exit (Healthchecks treats a nonzero code as a
  failure). Skip it when the URL isn't set.
- Optional: add the `timed()` durations to the ping body so the Healthchecks UI keeps a history
  of stage times.

### Step 3 — Backends (infra on the existing Pi; nothing in the repo needs this)

The Pi has 3.71 GB of RAM and uses about 800 MB today with everything running. The stack adds
roughly 1–1.5 GB. The weekly ETL peak hasn't been measured.

0. **Measure first.** Run `/usr/bin/time -v python drug_pricing_etl.py prod` once and note
   "Maximum resident set size". Watch `free -m` during the NADAC insert to see how much Postgres
   adds. Go ahead if steady state + stack + ETL peak stays under about 3.2 GB.
1. Put the stack in its own compose project, e.g. `/home/ghrunner/apps/observability/` (not in
   the repo's deploy). Run one instance for every service on the Pi. Data is told apart by
   `service.name` and labels.
   - Grafana Alloy: receives OTLP from the API, scrapes host metrics, tails journald for nginx,
     Postgres and the cron logs.
   - Prometheus, Loki and Tempo in single-binary mode, plus Grafana. No Mimir.
   - Uptime Kuma checking `/api/health` and the client. Healthchecks for the ETL.
2. **Guards:**
   - Set `mem_limit` on every container, about 1.2 GB total (e.g. Prometheus 350M, Loki 250M,
     Tempo 250M, Grafana 200M, Alloy 150M). Under memory pressure the monitoring then takes the
     hit, not Postgres or the API.
   - Retention: metrics and logs 30 days, traces 7 days.
   - Keep the volumes off the SD card if the Pi has an SSD.
3. **Moving it later:** to put the stack on a second Pi, move the compose project and change
   `OTEL_EXPORTER_OTLP_ENDPOINT`. Keep a single Alloy on the app Pi for host metrics and logs.
   A second box also keeps monitoring up when the app Pi is down.
4. Optional later: GlitchTip for client and server exceptions. Browser error reporting needs the
   same privacy decision `FUTURE_WORK.md` raises for logging searches.

### Local dev

Add an optional `otel-lgtm` service (`grafana/otel-lgtm`, ports 3000/4317/4318) to
`server/docker-compose.yml`. Set `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317` in
`example.appsettings.Development.json` or the launch profile. Document it in `AGENTS.md`
(Server section).

## Verification

1. `docker compose up -d` with the `otel-lgtm` service. The `dotnet watch` server on :5250
   reloads by itself.
2. Run a few searches in the client (`fda-products/search`, `nadac-prices/search`).
3. In Grafana (:3000), check:
   - Tempo has a trace per request with an Npgsql child span showing the SQL.
   - Prometheus has `http.server.request.duration` and runtime metrics.
   - Loki has the API logs.
4. `curl :5250/api/health` returns Healthy. With Postgres stopped it returns Unhealthy (503).
5. Start the server without `OTEL_EXPORTER_OTLP_ENDPOINT` and confirm it starts and serves
   normally, with no exporter errors.
6. Run the ETL in `dev` mode with `HEALTHCHECK_URL` pointed at a local Healthchecks container.
   Check that a start ping and an exit-code ping arrive, including a forced failure.
