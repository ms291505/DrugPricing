-- Largest one-week NADAC price moves, grouped by NDC description.
--
-- NADAC mostly prices generics per description, not per NDC: every NDC of
-- "DAPAGLIFLOZIN 10 MG TABLET" carries the same price whatever its labeler. Grouping by
-- description (and pricing unit) turns 20 identical NDC rows into one finding; ndc_count
-- says how many NDCs moved together, and prev_price/price are their averages. Topicals and
-- liquids are the exception: packages of one description can differ by package size (see
-- product_package_price_spread.sql). Brand descriptions usually map to one or a few NDCs.
--
-- A move compares an NDC's price with its own previous weekly file. Weeks where an NDC is
-- absent are skipped, so a "week" can span a gap.
--
-- Parameters: min_price drops penny-priced noise (a $0.01 -> $0.03 move is +200%);
-- min_pct is the absolute % change to report; direction is 'up', 'down', or 'both';
-- since/until bound the as-of dates. Rises are unbounded and drops stop at -100%, so 'both'
-- is mostly rises: run 'down' on its own to see the largest drops.

WITH params AS (
  SELECT
    0.10::numeric AS min_price,   -- the lower of old/new price must be at least this
    50::numeric AS min_pct,       -- report moves of at least +/- this many percent
    'both'::text AS direction,
    date '2022-01-01' AS since,
    date '2100-01-01' AS until
),
moves AS (
  SELECT
    n."NdcDescription",
    n."PricingUnit",
    n."Ndc",
    n."AsOfDate",
    n."EffectiveDate",
    n."ClassificationForRateSetting",
    lag(n."NadacPerUnit") OVER w AS prev_price,
    n."NadacPerUnit" AS price
  FROM "NadacPrices" n
  WINDOW w AS (PARTITION BY n."Ndc" ORDER BY n."AsOfDate")
)
SELECT
  m."NdcDescription",
  m."PricingUnit" AS unit,
  m."ClassificationForRateSetting" AS class,
  m."AsOfDate" AS as_of,
  min(m."EffectiveDate") AS effective,
  round(avg(m.prev_price), 4) AS prev_price,
  round(avg(m.price), 4) AS price,
  round(100 * (avg(m.price) / avg(m.prev_price) - 1), 1) AS pct,
  count(*) AS ndc_count,
  min(m."Ndc") AS example_ndc
FROM moves m, params p
WHERE m.prev_price IS NOT NULL
  AND m."AsOfDate" BETWEEN p.since AND p.until
  AND least(m.prev_price, m.price) >= p.min_price
  AND abs(100 * (m.price / m.prev_price - 1)) >= p.min_pct
  AND (p.direction = 'both'
    OR (p.direction = 'up' AND m.price > m.prev_price)
    OR (p.direction = 'down' AND m.price < m.prev_price))
GROUP BY 1, 2, 3, 4
ORDER BY abs(avg(m.price) / avg(m.prev_price) - 1) DESC
LIMIT 100;
