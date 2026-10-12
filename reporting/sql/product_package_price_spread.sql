-- FDA products whose packages carry different NADAC prices in the same weekly file.
--
-- At FDA product level the client charts one series per product NDC and averages its
-- packages per date, shading the min-max between them (createLineVizData, rangeKey). Most
-- products have one price for every package, so the shading is invisible; these are the ones
-- where it shows, which makes them useful for testing that chart. Usually the packages fall
-- under different NADAC descriptions (a unit-dose pack vs a bottle, a kit vs a single pen).
--
-- spread_ratio = highest package price / lowest, per NADAC pricing unit. Packages in two
-- pricing units are kept apart, as the charts keep them on separate axes.

WITH params AS (
  SELECT
    (SELECT max("AsOfDate") FROM "NadacPrices") AS as_of,
    1.5::numeric AS min_ratio,
    0.05::numeric AS min_price
),
priced AS (
  SELECT
    pk."ProductNdc",
    n."PricingUnit",
    n."NdcDescription",
    n."NadacPerUnit",
    pk."NdcPackageCode"
  FROM "NadacPrices" n
  JOIN params p ON n."AsOfDate" = p.as_of
  JOIN "FdaPackages" pk ON pk."NdcPackageCodeStripped" = n."Ndc" AND pk."DelistedAt" IS NULL
)
SELECT
  pr."ProprietaryName",
  pr."ProductNdc",
  pr."LabelerName",
  x."PricingUnit" AS unit,
  x.packages,
  round(x.low, 4) AS low_price,
  round(x.high, 4) AS high_price,
  round(x.high / x.low, 2) AS spread_ratio,
  x.descriptions
FROM (
  SELECT
    "ProductNdc",
    "PricingUnit",
    count(*) AS packages,
    min("NadacPerUnit") AS low,
    max("NadacPerUnit") AS high,
    string_agg(DISTINCT "NdcDescription", ' | ') AS descriptions
  FROM priced
  GROUP BY 1, 2
) x
JOIN "FdaProducts" pr ON pr."ProductNdc" = x."ProductNdc"
CROSS JOIN params p
WHERE x.low >= p.min_price
  AND x.high / x.low >= p.min_ratio
ORDER BY x.high / x.low DESC
LIMIT 100;
