-- How much do NADAC drug packages vary in price? Share of packages under each band, for
-- three measures, by generic / brand / all. Basis of the "Price activity" Stable/Changed rule
-- (see ../NADAC_PRICE_VARIATION.md).
--
-- A package is one NDC. Over the window (as-of dates from :ws to the latest file), per package:
--   range    = (max price - min price) / min price     <- the rule's measure
--   maxstep  = largest |change| between consecutive weekly files
--   net      = |last price / first price - 1|
-- Only packages with 2+ observations in the window count. Brand = classification not 'G'.
-- Columns "<5%" etc. are the share (percent) of packages whose measure is below that band;
-- p50..p99 are percentiles of the measure, in percent.
--
-- Window: -v weeks=N, default 52 (the window starts N*7 days before the latest as-of date).
--   docker exec -i dev-pgsql-drug psql -U appuser -d drug_dev -v weeks=52 -f - < nadac_variation_bands.sql

\if :{?weeks} \else \set weeks 52 \endif
SELECT (max("AsOfDate") - (:weeks)::int * 7)::date AS ws FROM "NadacPrices" \gset

WITH obs AS MATERIALIZED (
  SELECT "Ndc" AS ndc, "AsOfDate" AS d, "NadacPerUnit" AS p,
         CASE WHEN "ClassificationForRateSetting" = 'G' THEN 'generic' ELSE 'brand' END AS cls,
         lag("NadacPerUnit") OVER w AS pp
  FROM "NadacPrices"
  WHERE "AsOfDate" >= :'ws'::date
  WINDOW w AS (PARTITION BY "Ndc" ORDER BY "AsOfDate")
), pkg AS MATERIALIZED (
  SELECT ndc, max(cls) AS cls, count(*) AS n, min(p) AS mn, max(p) AS mx,
         (array_agg(p ORDER BY d))[1] AS f, (array_agg(p ORDER BY d DESC))[1] AS l,
         max(abs(p / nullif(pp, 0) - 1)) AS ms
  FROM obs GROUP BY ndc
), pk AS MATERIALIZED (
  SELECT *, (mx - mn) / nullif(mn, 0) AS rng, abs(l / nullif(f, 0) - 1) AS net
  FROM pkg WHERE n >= 2
), m AS (
  SELECT cls, 'range' AS metric, rng AS v FROM pk
  UNION ALL SELECT cls, 'maxstep', ms FROM pk
  UNION ALL SELECT cls, 'net', net FROM pk
  UNION ALL SELECT 'all', 'range', rng FROM pk
  UNION ALL SELECT 'all', 'maxstep', ms FROM pk
  UNION ALL SELECT 'all', 'net', net FROM pk
)
SELECT metric, cls, count(*) AS packages,
  round(100.0 * avg((v = 0)::int), 1) AS "=0",
  round(100.0 * avg((v < .01)::int), 1) AS "<1%",
  round(100.0 * avg((v < .02)::int), 1) AS "<2%",
  round(100.0 * avg((v < .03)::int), 1) AS "<3%",
  round(100.0 * avg((v < .05)::int), 1) AS "<5%",
  round(100.0 * avg((v < .075)::int), 1) AS "<7.5%",
  round(100.0 * avg((v < .10)::int), 1) AS "<10%",
  round(100.0 * avg((v < .15)::int), 1) AS "<15%",
  round(100.0 * avg((v < .25)::int), 1) AS "<25%",
  round((percentile_cont(.5) WITHIN GROUP (ORDER BY v) * 100)::numeric, 2) AS p50,
  round((percentile_cont(.75) WITHIN GROUP (ORDER BY v) * 100)::numeric, 2) AS p75,
  round((percentile_cont(.9) WITHIN GROUP (ORDER BY v) * 100)::numeric, 2) AS p90,
  round((percentile_cont(.95) WITHIN GROUP (ORDER BY v) * 100)::numeric, 2) AS p95,
  round((percentile_cont(.99) WITHIN GROUP (ORDER BY v) * 100)::numeric, 2) AS p99
FROM m
GROUP BY metric, cls
ORDER BY metric, cls;
