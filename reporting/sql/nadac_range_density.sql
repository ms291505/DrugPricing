-- Is there a natural break in how much packages vary? Packages per 1-point slice of range
-- (max - min) / min, from 0% to 20%, with the rest in one row. A natural cutoff would show as a
-- dip in the counts; a steady slope means any cutoff is a judgement call. Window and measure
-- as in nadac_variation_bands.sql; generic and brand are split.
--
-- Window: -v weeks=N, default 52.
--   docker exec -i dev-pgsql-drug psql -U appuser -d drug_dev -v weeks=52 -f - < nadac_range_density.sql

\if :{?weeks} \else \set weeks 52 \endif
SELECT (max("AsOfDate") - (:weeks)::int * 7)::date AS ws FROM "NadacPrices" \gset

WITH pk AS (
  SELECT "Ndc",
         CASE WHEN max("ClassificationForRateSetting") = 'G' THEN 'generic' ELSE 'brand' END AS cls,
         (max("NadacPerUnit") - min("NadacPerUnit")) / nullif(min("NadacPerUnit"), 0) AS rng
  FROM "NadacPrices"
  WHERE "AsOfDate" >= :'ws'::date
  GROUP BY "Ndc" HAVING count(*) >= 2
), b AS (
  SELECT cls, CASE WHEN rng >= .20 THEN 20 ELSE floor(rng * 100)::int END AS slice FROM pk
)
SELECT CASE WHEN slice = 20 THEN '20%+' ELSE slice || '-' || (slice + 1) || '%' END AS range_slice,
       count(*) FILTER (WHERE cls = 'generic') AS generic,
       count(*) FILTER (WHERE cls = 'brand') AS brand,
       count(*) AS all_packages
FROM b GROUP BY slice ORDER BY slice;

-- The 5% edge: packages whose range lands within 0.5 point of the line. Many brand packages
-- took a list-price increase of about 5%, so the cutoff splits them on rounding: just under
-- 5% is Stable, 5% or more is Changed.
SELECT cls, count(*) FILTER (WHERE rng >= .045 AND rng < .0495) AS "4.5-4.95%",
       count(*) FILTER (WHERE rng >= .0495 AND rng < .05) AS "4.95-5.0% (Stable)",
       count(*) FILTER (WHERE rng >= .05 AND rng < .0505) AS "5.0-5.05% (Changed)",
       count(*) FILTER (WHERE rng >= .0505 AND rng < .055) AS "5.05-5.5%"
FROM (
  SELECT CASE WHEN max("ClassificationForRateSetting") = 'G' THEN 'generic' ELSE 'brand' END AS cls,
         (max("NadacPerUnit") - min("NadacPerUnit")) / nullif(min("NadacPerUnit"), 0) AS rng
  FROM "NadacPrices"
  WHERE "AsOfDate" >= :'ws'::date
  GROUP BY "Ndc" HAVING count(*) >= 2
) x
GROUP BY cls ORDER BY cls;
