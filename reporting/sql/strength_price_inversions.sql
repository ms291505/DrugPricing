-- Higher strengths priced below lower strengths of the same drug, in one weekly file.
--
-- "Same drug" means same active ingredient(s), same FDA dosage form (so ER and IR tablets are
-- never compared), same strength unit, same NADAC pricing unit, and same NADAC class. Brand
-- and brand-like classes (B, B-ANDA, B-BIO) also match on proprietary name; generics (G) pool
-- every labeler, since NADAC prices a generic description, not an NDC.
--
-- Strength and dosage form come from the FDA directory: NADAC's Ndc joins
-- FdaPackages.NdcPackageCodeStripped (both drop leading zeros). Single-ingredient products only,
-- because a combination's strength isn't one number. Delisted FDA rows are kept on purpose:
-- this reads NADAC history, and a package delisted since still describes what was sold.
--
-- price_ratio = lower strength's price / higher strength's price for the same pricing unit
-- (per tablet, per mL, ...). Above 1 means the bigger dose costs less per unit. A flat price
-- across strengths (ratio exactly 1, as with Eliquis or Jardiance) is excluded by min_ratio;
-- set it to 1.0 to include those.

WITH params AS (
  SELECT
    (SELECT max("AsOfDate") FROM "NadacPrices") AS as_of,  -- or e.g. date '2025-06-04'
    1.10::numeric AS min_ratio,   -- report when the lower strength costs >= 10% more
    0.05::numeric AS min_price    -- skip pairs where the cheaper price is under this
),
fda AS (
  -- One FDA product per stripped package code. A code can repeat across delisted rows; take
  -- the listed one first, then the newest.
  SELECT DISTINCT ON (pk."NdcPackageCodeStripped")
    pk."NdcPackageCodeStripped" AS ndc,
    pr."SubstanceName"[1] AS substance,
    pr."DosageFormName" AS dosage_form,
    pr."StrengthUnit"[1] AS strength_unit,
    pr."StrengthNumber"[1] AS strength_text,
    upper(pr."ProprietaryName") AS proprietary_name
  FROM "FdaPackages" pk
  JOIN "FdaProducts" pr ON pr."ProductNdc" = pk."ProductNdc"
  WHERE cardinality(pr."SubstanceName") = 1
    AND pr."StrengthNumber"[1] ~ '^[0-9]+(\.[0-9]+)?$'
  ORDER BY pk."NdcPackageCodeStripped", pk."DelistedAt" NULLS FIRST, pk."LoadedAt" DESC
),
priced AS (
  -- One row per NADAC description: NADAC's own pricing group. FDA attributes are attached by
  -- majority vote over the description's NDCs, because grouping by FDA attributes instead
  -- merges descriptions NADAC prices separately (an ODT coded as plain TABLET, ER beside IR).
  SELECT
    mode() WITHIN GROUP (ORDER BY f.substance) AS substance,
    mode() WITHIN GROUP (ORDER BY f.dosage_form) AS dosage_form,
    mode() WITHIN GROUP (ORDER BY f.strength_unit) AS strength_unit,
    mode() WITHIN GROUP (ORDER BY f.strength_text)::numeric AS strength,
    n."PricingUnit" AS pricing_unit,
    n."ClassificationForRateSetting" AS class,
    CASE WHEN n."ClassificationForRateSetting" = 'G' THEN ''
         ELSE mode() WITHIN GROUP (ORDER BY f.proprietary_name) END AS brand,
    avg(n."NadacPerUnit") AS price,
    n."NdcDescription" AS description,
    count(*) AS ndc_count
  FROM "NadacPrices" n
  JOIN fda f ON f.ndc = n."Ndc"
  JOIN params p ON n."AsOfDate" = p.as_of
  GROUP BY n."NdcDescription", n."PricingUnit", n."ClassificationForRateSetting"
)
SELECT
  lo.substance,
  lo.dosage_form,
  lo.class,
  lo.brand,
  lo.pricing_unit AS unit,
  lo.description AS lower_strength,
  round(lo.price, 4) AS lower_price,
  hi.description AS higher_strength,
  round(hi.price, 4) AS higher_price,
  round(lo.price / hi.price, 2) AS price_ratio,
  -- What one unit of the lower strength costs per unit of drug, relative to the higher one.
  round((lo.price / lo.strength) / (hi.price / hi.strength), 1) AS per_mg_ratio,
  lo.ndc_count AS lower_ndcs,
  hi.ndc_count AS higher_ndcs
FROM priced lo
JOIN priced hi
  ON hi.substance = lo.substance
 AND hi.dosage_form = lo.dosage_form
 AND hi.strength_unit = lo.strength_unit
 AND hi.pricing_unit = lo.pricing_unit
 AND hi.class = lo.class
 AND hi.brand = lo.brand
 AND hi.strength > lo.strength
CROSS JOIN params p
WHERE hi.price >= p.min_price
  AND lo.price / hi.price >= p.min_ratio
ORDER BY lo.price / hi.price DESC
LIMIT 100;
