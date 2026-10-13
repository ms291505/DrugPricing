-- NADAC per description in two weekly files, and the % change between them.
--
-- Built for list-price events (the 2024-01 Medicaid AMP-cap cuts, the 2026-01 Medicare
-- negotiated-price start), but any two as-of dates work. Two ways to pick rows:
--   * names: first word of the NADAC description, e.g. '{ELIQUIS,JARDIANCE}'. Leave NULL to
--     scan everything.
--   * min_drop_pct / min_rise_pct: keep only descriptions that moved at least this much.
--     With names set, use 0 for both to see every description including the flat ones.
--
-- Always compare per description, never a brand's average across descriptions: new strengths
-- or package types entering the average fake a price move. In 2026 the Austedo average
-- "doubled" because XR 30-48 mg tablets launched at $316-500, while each existing tablet rose
-- ~5%; the Zepbound average "fell 36%" because the 2.4 mL multi-dose KwikPen is priced per mL
-- below the single-dose pens, with no same-description change at all.
--
-- The default is the first Medicare negotiation list (prices effective 2026-01-01), plus the
-- related combinations and generics, across the last file of 2025 and the latest file.

WITH params AS (
  SELECT
    date '2025-12-31' AS before_as_of,
    (SELECT max("AsOfDate") FROM "NadacPrices") AS after_as_of,
    '{ELIQUIS,JARDIANCE,XARELTO,JANUVIA,FARXIGA,ENTRESTO,ENBREL,IMBRUVICA,STELARA,NOVOLOG,FIASP,
      GLYXAMBI,SYNJARDY,TRIJARDY,XIGDUO,JANUMET,DAPAGLIFLOZIN,RIVAROXABAN,SACUBITRIL-VALSARTAN,
      SITAGLIPTIN,TRESIBA}'::text[] AS names,
    '{B,B-ANDA,B-BIO,G}'::text[] AS classes,
    0::numeric AS min_drop_pct,
    0::numeric AS min_rise_pct
),
both_weeks AS (
  SELECT
    n."NdcDescription",
    n."PricingUnit",
    n."ClassificationForRateSetting" AS class,
    avg(n."NadacPerUnit") FILTER (WHERE n."AsOfDate" = p.before_as_of) AS before_price,
    avg(n."NadacPerUnit") FILTER (WHERE n."AsOfDate" = p.after_as_of) AS after_price,
    -- NADAC re-dates most rates at each monthly refresh even when the price barely moves, so
    -- this says how fresh the after price is, not when the change happened. To date a change,
    -- use largest_weekly_moves.sql or a weekly series.
    max(n."EffectiveDate") FILTER (WHERE n."AsOfDate" = p.after_as_of) AS after_effective,
    count(*) FILTER (WHERE n."AsOfDate" = p.after_as_of) AS ndc_count
  FROM "NadacPrices" n
  JOIN params p
    ON n."AsOfDate" IN (p.before_as_of, p.after_as_of)
   AND n."ClassificationForRateSetting" = ANY (p.classes)
   AND (p.names IS NULL OR split_part(n."NdcDescription", ' ', 1) = ANY (p.names))
  GROUP BY 1, 2, 3
)
SELECT
  b."NdcDescription",
  b."PricingUnit" AS unit,
  b.class,
  round(b.before_price, 4) AS before_price,
  round(b.after_price, 4) AS after_price,
  round(100 * (b.after_price / b.before_price - 1), 1) AS pct,
  b.after_effective,
  b.ndc_count
FROM both_weeks b
CROSS JOIN params p
WHERE (b.after_price IS NULL OR b.before_price IS NULL)  -- new or gone: shown, sorted last
   OR b.after_price <= b.before_price * (1 - p.min_drop_pct / 100)
   OR b.after_price >= b.before_price * (1 + p.min_rise_pct / 100)
ORDER BY (b.after_price / b.before_price) NULLS LAST, b."NdcDescription"
LIMIT 500;
