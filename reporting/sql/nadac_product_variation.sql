-- How many FDA products would the product table call Stable? The plan classifies a product row
-- from its packages, never from the averaged line: a product is Stable only when every one of
-- its packages is (range under the band). See ../NADAC_PRICE_VARIATION.md.
--
-- A package is one NADAC NDC, joined to FdaPackages on NdcPackageCodeStripped (NADAC NDCs are
-- stored without leading zeros, the same form), then to FdaProducts on ProductNdc; both FDA
-- rows must have DelistedAt IS NULL. Range = (max - min) / min over the window, as in
-- nadac_variation_bands.sql. A package with one observation in the window is Insufficient
-- history and is left out of its product's rule; a product with no package of 2+ observations
-- is counted as insufficient. Brand = classification not 'G'; a product is brand or generic
-- when all its classified packages agree, otherwise "mixed". Two result sets:
--
--   1. join_coverage  NADAC packages in the window, how many have no listed FDA match (and of
--                     those, how many match only a delisted FDA package), and two checks that
--                     should be 0: NDCs matching several FDA products, and NDCs priced in more
--                     than one pricing unit in the window
--   2. stable_share   share Stable at 3%, 5%, 10% under the every-package rule: all products,
--                     by brand / generic / mixed, and by the number of classified packages per
--                     product; the last row is matched packages, for comparison
--
-- Window: -v weeks=N, default 52 (the window starts N*7 days before the latest as-of date).
--   docker exec -i dev-pgsql-drug psql -U appuser -d drug_dev -v weeks=52 -f - < nadac_product_variation.sql

\if :{?weeks} \else \set weeks 52 \endif
SELECT (max("AsOfDate") - (:weeks)::int * 7)::date AS ws FROM "NadacPrices" \gset

\echo '1. join_coverage'
WITH pkg AS (
  SELECT "Ndc" AS ndc, count(*) AS n, count(DISTINCT "PricingUnit") AS units
  FROM "NadacPrices" WHERE "AsOfDate" >= :'ws'::date GROUP BY "Ndc"
), pkg_fda AS (
  SELECT DISTINCT p.ndc, fp."ProductNdc" AS product
  FROM pkg p
  JOIN "FdaPackages" fk ON fk."NdcPackageCodeStripped" = p.ndc AND fk."DelistedAt" IS NULL
  JOIN "FdaProducts" fp ON fp."ProductNdc" = fk."ProductNdc" AND fp."DelistedAt" IS NULL
)
SELECT count(*) AS nadac_packages,
       count(*) FILTER (WHERE n >= 2) AS with_2plus_prices,
       count(*) FILTER (WHERE ndc NOT IN (SELECT ndc FROM pkg_fda)) AS no_listed_fda_match,
       count(*) FILTER (WHERE n >= 2 AND ndc NOT IN (SELECT ndc FROM pkg_fda)) AS no_match_2plus,
       count(*) FILTER (WHERE ndc NOT IN (SELECT ndc FROM pkg_fda)
                          AND ndc IN (SELECT "NdcPackageCodeStripped" FROM "FdaPackages"))
         AS no_match_but_delisted_in_fda,
       (SELECT count(*) FROM (SELECT ndc FROM pkg_fda GROUP BY ndc HAVING count(*) > 1) x)
         AS ndcs_matching_several_products,
       count(*) FILTER (WHERE units > 1) AS ndcs_with_several_pricing_units
FROM pkg;

\echo '2. stable_share (every-package rule)'
WITH pkg AS (
  SELECT "Ndc" AS ndc, count(*) AS n,
         CASE WHEN max("ClassificationForRateSetting") = 'G' THEN 'generic' ELSE 'brand' END AS cls,
         (max("NadacPerUnit") - min("NadacPerUnit")) / nullif(min("NadacPerUnit"), 0) AS rng
  FROM "NadacPrices" WHERE "AsOfDate" >= :'ws'::date GROUP BY "Ndc"
), pkg_fda AS (
  SELECT DISTINCT p.ndc, fp."ProductNdc" AS product
  FROM pkg p
  JOIN "FdaPackages" fk ON fk."NdcPackageCodeStripped" = p.ndc AND fk."DelistedAt" IS NULL
  JOIN "FdaProducts" fp ON fp."ProductNdc" = fk."ProductNdc" AND fp."DelistedAt" IS NULL
), prod AS (
  -- one row per product: its classified packages' largest range, and their classes
  SELECT f.product,
         count(*) FILTER (WHERE p.n >= 2) AS pkgs,
         max(p.rng) FILTER (WHERE p.n >= 2) AS worst,
         CASE WHEN count(DISTINCT p.cls) FILTER (WHERE p.n >= 2) > 1 THEN 'mixed'
              ELSE max(p.cls) FILTER (WHERE p.n >= 2) END AS cls
  FROM pkg_fda f JOIN pkg p USING (ndc)
  GROUP BY f.product
), shares AS (
  SELECT CASE WHEN GROUPING(cls) = 0 THEN 'class' WHEN GROUPING(bucket) = 0 THEN 'packages'
              ELSE 'all' END AS grp,
         coalesce(cls, bucket, 'all products') AS products_with,
         min(pkgs) AS sort_key,
         count(*) AS products, count(*) FILTER (WHERE pkgs = 0) AS insufficient,
         round(100.0 * avg((worst < .03)::int) FILTER (WHERE pkgs > 0), 1) AS "stable <3%",
         round(100.0 * avg((worst < .05)::int) FILTER (WHERE pkgs > 0), 1) AS "stable <5%",
         round(100.0 * avg((worst < .10)::int) FILTER (WHERE pkgs > 0), 1) AS "stable <10%"
  FROM (SELECT *, CASE WHEN pkgs = 0 THEN NULL WHEN pkgs = 1 THEN '1 package'
                       WHEN pkgs = 2 THEN '2 packages' WHEN pkgs <= 4 THEN '3-4 packages'
                       WHEN pkgs <= 9 THEN '5-9 packages' ELSE '10+ packages' END AS bucket
        FROM prod) x
  GROUP BY GROUPING SETS ((), (cls), (bucket))
  HAVING GROUPING(cls) = 1 OR cls IS NOT NULL
)
SELECT products_with, products, insufficient, "stable <3%", "stable <5%", "stable <10%"
FROM (
  SELECT *, CASE grp WHEN 'all' THEN 0 WHEN 'class' THEN 1 ELSE 2 END AS ord
  FROM shares
  WHERE NOT (grp = 'packages' AND products_with = 'all products')
  UNION ALL
  SELECT 'other', 'matched packages (for comparison)', 0, count(*), count(*) FILTER (WHERE n < 2),
         round(100.0 * avg((rng < .03)::int) FILTER (WHERE n >= 2), 1),
         round(100.0 * avg((rng < .05)::int) FILTER (WHERE n >= 2), 1),
         round(100.0 * avg((rng < .10)::int) FILTER (WHERE n >= 2), 1), 3
  FROM pkg WHERE ndc IN (SELECT ndc FROM pkg_fda)
) r
ORDER BY ord, sort_key, products_with;
