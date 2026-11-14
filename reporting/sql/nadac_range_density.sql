-- Is there a natural break in how much packages vary? Packages per 1-point slice of range
-- (max - min) / min, from 0% to 20%, with the rest in one row. A natural cutoff would show as a
-- dip in the counts; a steady slope means any cutoff is a judgement call. Window and measure
-- as in nadac_variation_bands.sql; generic and brand are split. Three result sets: the slices,
-- the packages on either side of 5%, and how the 5% comparison changes with where and how it is
-- rounded (numeric, float8, 0.1%, 1%).
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

-- Where the comparison runs. NadacPerUnit is numeric(19,4), so Postgres computes the range
-- exactly; the client computes it in doubles (float8 here is the same IEEE math as JS), where a
-- range of exactly 5% can come out just under 0.05 ((0.21 - 0.2) / 0.2 = 0.04999999999999993).
-- Packages Stable under each rule, and how many each rule labels differently from exact numeric:
--   numeric   range < 0.05 in numeric (the rule this report measures)
--   float8    range < 0.05 in doubles (a naive client)
--   0.1%      Math.round(range * 1000) / 1000 < 0.05, in doubles (classify on the shown 0.1%)
--   1%        Math.round(range * 100) / 100 < 0.05, in doubles (classify on a whole percent)
-- floor(x + 0.5) is Math.round; Postgres round(float8) rounds half to even.
SELECT r.rule, count(*) FILTER (WHERE r.stable) AS stable,
       count(*) FILTER (WHERE r.stable <> (rn < .05)) AS differs_from_numeric,
       count(*) FILTER (WHERE rn = .05) AS exactly_5pct_in_numeric
FROM (
  SELECT (max("NadacPerUnit") - min("NadacPerUnit")) / min("NadacPerUnit") AS rn,
         (max("NadacPerUnit")::float8 - min("NadacPerUnit")::float8) / min("NadacPerUnit")::float8 AS rf
  FROM "NadacPrices"
  WHERE "AsOfDate" >= :'ws'::date AND "NadacPerUnit" > 0
  GROUP BY "Ndc" HAVING count(*) >= 2
) x
CROSS JOIN LATERAL (VALUES
  (1, 'numeric', rn < .05),
  (2, 'float8', rf < .05),
  (3, '0.1% (x1000)', floor(rf * 1000 + .5) / 1000 < .05),
  (4, '1% (x100)', floor(rf * 100 + .5) / 100 < .05)
) r(ord, rule, stable)
GROUP BY r.ord, r.rule ORDER BY r.ord;
