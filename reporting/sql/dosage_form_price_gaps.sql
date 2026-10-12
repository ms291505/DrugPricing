-- Same ingredient and strength, different dosage form, very different price, in one weekly file.
--
-- Tablet vs capsule, IR vs ER, tablet vs ODT, and so on: pairs of NADAC descriptions whose
-- single active ingredient and strength match but whose FDA dosage form differs. Generics only
-- by default, since NADAC prices a generic per description and that's where the gaps are
-- hardest to explain. Set brand_too to include brand classes (matched by proprietary name
-- is *not* required here: a brand tablet against a generic capsule is a fair comparison).
--
-- FDA attributes are attached to each NADAC description by majority vote over its NDCs (see
-- strength_price_inversions.sql for why). Single-ingredient products only.
--
-- price_ratio = pricier form / cheaper form, per NADAC pricing unit. Only EA (each) by default,
-- because one tablet and one capsule are comparable doses and one mL of two liquids may not be.

WITH params AS (
  SELECT
    (SELECT max("AsOfDate") FROM "NadacPrices") AS as_of,
    5::numeric AS min_ratio,      -- pricier form must cost at least this many times more
    0.05::numeric AS min_price,   -- skip pairs where the cheaper price is under this
    'EA'::text AS pricing_unit,
    false AS brand_too
),
fda AS (
  SELECT DISTINCT ON (pk."NdcPackageCodeStripped")
    pk."NdcPackageCodeStripped" AS ndc,
    pr."SubstanceName"[1] AS substance,
    pr."DosageFormName" AS dosage_form,
    pr."StrengthUnit"[1] AS strength_unit,
    pr."StrengthNumber"[1] AS strength_text
  FROM "FdaPackages" pk
  JOIN "FdaProducts" pr ON pr."ProductNdc" = pk."ProductNdc"
  WHERE cardinality(pr."SubstanceName") = 1
    AND pr."StrengthNumber"[1] ~ '^[0-9]+(\.[0-9]+)?$'
  ORDER BY pk."NdcPackageCodeStripped", pk."DelistedAt" NULLS FIRST, pk."LoadedAt" DESC
),
priced AS (
  SELECT
    n."NdcDescription" AS description,
    n."ClassificationForRateSetting" AS class,
    mode() WITHIN GROUP (ORDER BY f.substance) AS substance,
    mode() WITHIN GROUP (ORDER BY f.dosage_form) AS dosage_form,
    mode() WITHIN GROUP (ORDER BY f.strength_unit) AS strength_unit,
    mode() WITHIN GROUP (ORDER BY f.strength_text)::numeric AS strength,
    avg(n."NadacPerUnit") AS price,
    count(*) AS ndc_count
  FROM "NadacPrices" n
  JOIN fda f ON f.ndc = n."Ndc"
  JOIN params p
    ON n."AsOfDate" = p.as_of
   AND n."PricingUnit" = p.pricing_unit
   AND (p.brand_too OR n."ClassificationForRateSetting" = 'G')
  GROUP BY n."NdcDescription", n."ClassificationForRateSetting"
)
SELECT
  hi.substance,
  hi.strength || ' ' || hi.strength_unit AS strength,
  hi.dosage_form AS pricier_form,
  hi.description AS pricier,
  hi.class AS pricier_class,
  round(hi.price, 4) AS pricier_price,
  lo.dosage_form AS cheaper_form,
  lo.description AS cheaper,
  lo.class AS cheaper_class,
  round(lo.price, 4) AS cheaper_price,
  round(hi.price / lo.price, 1) AS price_ratio
FROM priced hi
JOIN priced lo
  ON lo.substance = hi.substance
 AND lo.strength = hi.strength
 AND lo.strength_unit = hi.strength_unit
 AND lo.dosage_form <> hi.dosage_form
 AND lo.price < hi.price
CROSS JOIN params p
WHERE lo.price >= p.min_price
  AND hi.price / lo.price >= p.min_ratio
ORDER BY hi.price / lo.price DESC
LIMIT 100;
