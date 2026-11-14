-- Distribution of week-to-week price changes, and the spacing between an NDC's consecutive
-- observations.
--
-- A step is one NDC's |price / previous price - 1| between consecutive observations in the
-- window. "Non-zero" drops the steps where the price did not change (most of them).
-- Columns: pct_zero is the share of all steps that are exactly zero; "<5%" etc. are shares of
-- the non-zero steps; p50..p99 are percentiles of the non-zero steps, in percent.
-- g7 / g14 / gt14 / gt30 / lt7 / g8_13 count steps whose two observations were exactly 7 days
-- apart, 14 apart, more than 14, more than 30, fewer than 7, or 8 to 13 apart. Anything other
-- than g7 means the NDC was absent from a weekly file (see nadac_gap_check.sql).
-- Window: -v weeks=N, default 52.
--   docker exec -i dev-pgsql-drug psql -U appuser -d drug_dev -v weeks=52 -x -f - < nadac_weekly_steps.sql

\if :{?weeks} \else \set weeks 52 \endif
SELECT (max("AsOfDate") - (:weeks)::int * 7)::date AS ws FROM "NadacPrices" \gset

WITH obs AS MATERIALIZED (
  SELECT "NadacPerUnit" AS p, "AsOfDate" AS d,
         lag("NadacPerUnit") OVER w AS pp, lag("AsOfDate") OVER w AS pd
  FROM "NadacPrices"
  WHERE "AsOfDate" >= :'ws'::date
  WINDOW w AS (PARTITION BY "Ndc" ORDER BY "AsOfDate")
), s AS (
  SELECT abs(p / nullif(pp, 0) - 1) AS a, d - pd AS gap FROM obs WHERE pp IS NOT NULL
), nz AS (SELECT a FROM s WHERE a > 0)
SELECT (SELECT count(*) FROM s) AS steps,
  round(100.0 * (SELECT avg((a = 0)::int) FROM s), 1) AS pct_zero,
  (SELECT count(*) FROM nz) AS nonzero,
  round(100.0 * (SELECT avg((a < .01)::int) FROM nz), 1) AS "<1%",
  round(100.0 * (SELECT avg((a < .02)::int) FROM nz), 1) AS "<2%",
  round(100.0 * (SELECT avg((a < .03)::int) FROM nz), 1) AS "<3%",
  round(100.0 * (SELECT avg((a < .05)::int) FROM nz), 1) AS "<5%",
  round(100.0 * (SELECT avg((a < .075)::int) FROM nz), 1) AS "<7.5%",
  round(100.0 * (SELECT avg((a < .10)::int) FROM nz), 1) AS "<10%",
  round(100.0 * (SELECT avg((a < .15)::int) FROM nz), 1) AS "<15%",
  round(100.0 * (SELECT avg((a < .25)::int) FROM nz), 1) AS "<25%",
  (SELECT round(percentile_cont(.5) WITHIN GROUP (ORDER BY a)::numeric * 100, 2) FROM nz) AS p50,
  (SELECT round(percentile_cont(.75) WITHIN GROUP (ORDER BY a)::numeric * 100, 2) FROM nz) AS p75,
  (SELECT round(percentile_cont(.9) WITHIN GROUP (ORDER BY a)::numeric * 100, 2) FROM nz) AS p90,
  (SELECT round(percentile_cont(.95) WITHIN GROUP (ORDER BY a)::numeric * 100, 2) FROM nz) AS p95,
  (SELECT round(percentile_cont(.99) WITHIN GROUP (ORDER BY a)::numeric * 100, 2) FROM nz) AS p99,
  (SELECT count(*) FROM s WHERE gap = 7) AS g7,
  (SELECT count(*) FROM s WHERE gap = 14) AS g14,
  (SELECT count(*) FROM s WHERE gap > 14) AS gt14,
  (SELECT count(*) FROM s WHERE gap > 30) AS gt30,
  (SELECT count(*) FROM s WHERE gap < 7) AS lt7,
  (SELECT count(*) FROM s WHERE gap > 7 AND gap < 14) AS g8_13;
