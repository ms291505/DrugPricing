-- Gap check for NadacPrices: is the weekly series complete, and are NDCs present every week?
-- Extends nadac_week_coverage.sql (rows per week by quarter, and the 11-character NDC check);
-- run that one too. Seven result sets, in this order:
--
--   1. freshness       first and last as-of date, days since the last, weeks expected vs present
--   2. missing_weeks   weekly dates (7 days apart, first to last) with no rows, and any as-of
--                      date that is not 7 days after the previous one; no rows = none missing
--   3. odd_weeks       the 12 weeks whose row count or distinct-NDC count is furthest from the
--                      median of the other weeks within 4 weeks either side (a partial load shows
--                      as a big negative pct); also the 11-character NDC count, the other known
--                      load failure
--   4. ndc_absences    NDCs that vanish for whole weeks and come back, by how many weeks they
--                      were missing (one NDC can appear in several rows); plus NDCs that left
--                      NADAC and never came back
--   5. absence_dates   the as-of dates NDCs came back on, most first: many returning on one date
--                      points at a load problem or a NADAC list change, a spread at ordinary
--                      churn
--   6. recent_absences like 5 but only for returns inside the last 52 weeks, with how long the
--                      NDCs had been missing (these are the gaps that hit a 12-month window)
--   7. row_quality     duplicate NDC + as-of date pairs, null or non-positive prices, other oddities
--
-- No parameters.
--   docker exec -i dev-pgsql-drug psql -U appuser -d drug_dev -f - < nadac_gap_check.sql

\echo '1. freshness'
SELECT min("AsOfDate") AS first_asof, max("AsOfDate") AS last_asof,
       current_date - max("AsOfDate") AS days_since_last,
       (max("AsOfDate") - min("AsOfDate")) / 7 + 1 AS weeks_expected,
       count(DISTINCT "AsOfDate") AS weeks_present,
       count(*) AS rows, count(DISTINCT "Ndc") AS ndcs
FROM "NadacPrices";

\echo '2. missing_weeks (no rows means none missing)'
WITH d AS (SELECT DISTINCT "AsOfDate" AS d FROM "NadacPrices"),
expected AS (
  SELECT g::date AS d
  FROM generate_series((SELECT min(d) FROM d), (SELECT max(d) FROM d), interval '7 days') g
)
SELECT e.d AS missing_week, 'no rows' AS problem
FROM expected e LEFT JOIN d USING (d)
WHERE d.d IS NULL
UNION ALL
SELECT s.d, 'not 7 days after previous (' || s.gap || ' days)'
FROM (SELECT d, d - lag(d) OVER (ORDER BY d) AS gap FROM d) s
WHERE s.gap <> 7
ORDER BY 1;

\echo '3. odd_weeks (furthest from the weeks around them)'
WITH w AS (
  SELECT "AsOfDate" AS d, count(*) AS n, count(DISTINCT "Ndc") AS ndcs,
         count(DISTINCT "Ndc") FILTER (WHERE length("Ndc") = 11) AS ndc11
  FROM "NadacPrices" GROUP BY 1
), c AS (
  SELECT d, n, ndcs, ndc11,
    (SELECT percentile_cont(.5) WITHIN GROUP (ORDER BY x.n) FROM w x
      WHERE x.d BETWEEN w.d - 28 AND w.d + 28 AND x.d <> w.d)::numeric AS med_n,
    (SELECT percentile_cont(.5) WITHIN GROUP (ORDER BY x.ndcs) FROM w x
      WHERE x.d BETWEEN w.d - 28 AND w.d + 28 AND x.d <> w.d)::numeric AS med_ndcs
  FROM w
)
SELECT d AS as_of_date, n AS rows, round(med_n) AS neighbor_median_rows,
       round(100.0 * (n - med_n) / med_n, 1) AS rows_pct,
       ndcs, round(med_ndcs) AS neighbor_median_ndcs,
       round(100.0 * (ndcs - med_ndcs) / med_ndcs, 1) AS ndcs_pct, ndc11
FROM c
ORDER BY greatest(abs(n - med_n) / med_n, abs(ndcs - med_ndcs) / med_ndcs) DESC
LIMIT 12;

\echo '4. ndc_absences (whole weeks missing before the NDC returned)'
WITH o AS (
  SELECT "Ndc" AS ndc, "AsOfDate" AS d,
         lag("AsOfDate") OVER (PARTITION BY "Ndc" ORDER BY "AsOfDate") AS pd
  FROM "NadacPrices"
), runs AS (
  SELECT ndc, d, (d - pd) / 7 - 1 AS weeks_missing FROM o WHERE d - pd > 7
)
SELECT CASE WHEN weeks_missing = 1 THEN '1' WHEN weeks_missing = 2 THEN '2'
            WHEN weeks_missing <= 4 THEN '3-4' WHEN weeks_missing <= 8 THEN '5-8'
            WHEN weeks_missing <= 13 THEN '9-13' WHEN weeks_missing <= 26 THEN '14-26'
            WHEN weeks_missing <= 52 THEN '27-52' ELSE '53+' END AS weeks_missing,
       count(*) AS returns, count(DISTINCT ndc) AS ndcs
FROM runs GROUP BY 1 ORDER BY min(weeks_missing);

SELECT (SELECT count(*) FROM (SELECT "Ndc" FROM "NadacPrices" GROUP BY "Ndc"
                              HAVING max("AsOfDate") < (SELECT max("AsOfDate") FROM "NadacPrices")) x)
         AS ndcs_that_left_and_never_returned,
       (SELECT count(*) FROM (SELECT 1 FROM (
          SELECT "Ndc", "AsOfDate" - lag("AsOfDate") OVER (PARTITION BY "Ndc" ORDER BY "AsOfDate") AS gap
          FROM "NadacPrices") g WHERE gap > 7 GROUP BY "Ndc") x) AS ndcs_with_any_return;

\echo '5. absence_dates (as-of dates NDCs returned on, all history)'
WITH o AS (
  SELECT "Ndc" AS ndc, "AsOfDate" AS d,
         lag("AsOfDate") OVER (PARTITION BY "Ndc" ORDER BY "AsOfDate") AS pd
  FROM "NadacPrices"
)
SELECT d AS returned_on, count(*) AS ndcs, min((d - pd) / 7 - 1) AS min_weeks_missing,
       max((d - pd) / 7 - 1) AS max_weeks_missing
FROM o WHERE d - pd > 7
GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 10;

\echo '6. recent_absences (returns in the last 52 weeks)'
WITH o AS (
  SELECT "Ndc" AS ndc, "AsOfDate" AS d,
         lag("AsOfDate") OVER (PARTITION BY "Ndc" ORDER BY "AsOfDate") AS pd
  FROM "NadacPrices"
)
SELECT d AS returned_on, count(*) AS ndcs, min((d - pd) / 7 - 1) AS min_weeks_missing,
       max((d - pd) / 7 - 1) AS max_weeks_missing,
       count(*) FILTER (WHERE d - pd <= 28) AS missing_3_weeks_or_less
FROM o
WHERE d - pd > 7 AND d > (SELECT max("AsOfDate") - 364 FROM "NadacPrices")
GROUP BY 1 ORDER BY 1;

\echo '7. row_quality'
SELECT
  (SELECT count(*) FROM (SELECT 1 FROM "NadacPrices" GROUP BY "Ndc", "AsOfDate" HAVING count(*) > 1) x)
    AS ndc_dates_with_duplicates,
  count(*) FILTER (WHERE "NadacPerUnit" IS NULL) AS null_price,
  count(*) FILTER (WHERE "NadacPerUnit" <= 0) AS nonpositive_price,
  count(*) FILTER (WHERE "NadacPerUnit" < 0.01) AS under_one_cent,
  count(*) FILTER (WHERE "Ndc" = '') AS empty_ndc,
  count(*) FILTER (WHERE "EffectiveDate" > "AsOfDate") AS effective_after_asof,
  -- NOT IN is never true for NULL, so nulls get their own column; the other queries' CASE
  -- would count a null classification as brand.
  count(*) FILTER (WHERE "ClassificationForRateSetting" IS NULL) AS null_classification,
  count(*) FILTER (WHERE "ClassificationForRateSetting" NOT IN ('G', 'B', 'B-ANDA', 'B-BIO')) AS other_classification
FROM "NadacPrices";
