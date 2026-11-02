-- FDA products whose packages are priced in more than one NADAC pricing unit.
--
-- A package never changes unit, but a product can hold packages that NADAC prices differently:
-- single-dose packets per each next to a bulk canister per gram. The client never combines
-- units, so at product level these rows show "Mixed units" with their latest price date
-- (summarizeByUnit, ResultTables/priceColumns.tsx), and their charts split by unit (UnitSplit).
-- Use them to test both.
--
-- One row per product and unit: how many listed packages NADAC prices in that unit, the last
-- weekly file that priced one, and the price range across those packages in that file.

WITH priced AS (
  SELECT
    pk."ProductNdc",
    pk."NdcPackageCode",
    n."PricingUnit",
    n."AsOfDate",
    n."NadacPerUnit",
    n."NdcDescription"
  FROM "FdaPackages" pk
  JOIN "NadacPrices" n ON n."Ndc" = pk."NdcPackageCodeStripped"
  WHERE pk."DelistedAt" IS NULL
),
mixed AS (
  SELECT "ProductNdc"
  FROM priced
  GROUP BY 1
  HAVING count(DISTINCT "PricingUnit") > 1
),
by_unit AS (
  SELECT
    "ProductNdc",
    "PricingUnit",
    count(DISTINCT "NdcPackageCode") AS packages,
    max("AsOfDate") AS last_priced
  FROM priced
  WHERE "ProductNdc" IN (SELECT "ProductNdc" FROM mixed)
  GROUP BY 1, 2
)
SELECT
  pr."ProprietaryName",
  u."ProductNdc",
  pr."LabelerName",
  pr."DosageFormName",
  u."PricingUnit" AS unit,
  u.packages,
  u.last_priced,
  round(min(p."NadacPerUnit"), 4) AS low_price,
  round(max(p."NadacPerUnit"), 4) AS high_price,
  string_agg(DISTINCT p."NdcDescription", ' | ') AS descriptions
FROM by_unit u
JOIN "FdaProducts" pr ON pr."ProductNdc" = u."ProductNdc"
JOIN priced p
  ON p."ProductNdc" = u."ProductNdc"
  AND p."PricingUnit" = u."PricingUnit"
  AND p."AsOfDate" = u.last_priced
GROUP BY 1, 2, 3, 4, 5, 6, 7
ORDER BY pr."ProprietaryName", u."ProductNdc", u."PricingUnit";
