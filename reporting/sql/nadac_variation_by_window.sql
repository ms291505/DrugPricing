-- How the Stable share depends on the window: share of packages with range under 3%, 5% and
-- 10% when the window is the last 1, 3, 6, 12 or 24 months, or all dates.
--
-- Same range measure and 2+ observation rule as nadac_variation_bands.sql. A window is a
-- whole number of weeks back from the latest as-of date: 1 month = 4 weeks, 3 = 13, 6 = 26,
-- 12 = 52, 24 = 104. Edit the windows list to try others. No parameters.
--   docker exec -i dev-pgsql-drug psql -U appuser -d drug_dev -f - < nadac_variation_by_window.sql

WITH windows(label, weeks) AS (
  VALUES ('1 month', 4), ('3 months', 13), ('6 months', 26), ('12 months', 52),
         ('24 months', 104), ('all dates', 100000)
), latest AS (SELECT max("AsOfDate") AS d FROM "NadacPrices"),
pk AS (
  SELECT w.label, w.weeks, n."Ndc" AS ndc,
         CASE WHEN max(n."ClassificationForRateSetting") = 'G' THEN 'generic' ELSE 'brand' END AS cls,
         (max(n."NadacPerUnit") - min(n."NadacPerUnit")) / nullif(min(n."NadacPerUnit"), 0) AS rng
  FROM windows w CROSS JOIN latest
  JOIN "NadacPrices" n ON n."AsOfDate" >= latest.d - w.weeks * 7
  GROUP BY w.label, w.weeks, n."Ndc"
  HAVING count(*) >= 2
)
SELECT label, cls, count(*) AS packages,
  round(100.0 * avg((rng < .03)::int), 1) AS "<3%",
  round(100.0 * avg((rng < .05)::int), 1) AS "<5%",
  round(100.0 * avg((rng < .10)::int), 1) AS "<10%"
FROM (SELECT label, weeks, cls, rng FROM pk
      UNION ALL SELECT label, weeks, 'all', rng FROM pk) x
GROUP BY label, weeks, cls
ORDER BY weeks, cls;
