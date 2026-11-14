-- Cross-checks behind choosing range over net change or largest step, plus data-shape counts
-- for the same window as nadac_variation_bands.sql (read its header for the measures).
--
-- One row. Columns:
--   packages_2plus / packages_all / rows / single_obs / dates   what the window holds
--   zero_prices / tiny_price_pk   observations priced <= 0; packages whose minimum is under $0.01
--   rN_n_lt     packages with range >= N% that ended within N% of where they started (a round
--               trip: a range rule calls it Changed, a net-change rule would call it Stable)
--   rN_nostep   packages with range >= N% but no single weekly step of N% (drift in small
--               steps, which a largest-step rule would miss)
--   rN          packages with range >= N%       step10   packages with a weekly step >= 10%
--   label_*     the planned labels: Stable (range < 5%); else Changed, split into a significant
--               week (step >= 10%), no such week but net change >= 5% ("ended elsewhere"), and
--               no such week with net change < 5% ("ended near start"). They sum to packages_2plus.
--   big / big_tiny / ge100 / max_step_pct / sub1c   weekly steps >= 10%; of those, with the
--               lower price under $0.05; steps of +100% or more; the largest step; observations
--               priced under $0.01
-- Window: -v weeks=N, default 52.
--   docker exec -i dev-pgsql-drug psql -U appuser -d drug_dev -v weeks=52 -x -f - < nadac_variation_checks.sql

\if :{?weeks} \else \set weeks 52 \endif
SELECT (max("AsOfDate") - (:weeks)::int * 7)::date AS ws FROM "NadacPrices" \gset

WITH obs AS MATERIALIZED (
  SELECT "Ndc" AS ndc, "AsOfDate" AS d, "NadacPerUnit" AS p,
         lag("NadacPerUnit") OVER w AS pp
  FROM "NadacPrices"
  WHERE "AsOfDate" >= :'ws'::date
  WINDOW w AS (PARTITION BY "Ndc" ORDER BY "AsOfDate")
), pkg AS MATERIALIZED (
  SELECT ndc, count(*) AS n, min(p) AS mn, max(p) AS mx,
         (array_agg(p ORDER BY d))[1] AS f, (array_agg(p ORDER BY d DESC))[1] AS l,
         max(abs(p / nullif(pp, 0) - 1)) AS ms
  FROM obs GROUP BY ndc
), pk AS MATERIALIZED (
  SELECT *, (mx - mn) / nullif(mn, 0) AS rng, abs(l / nullif(f, 0) - 1) AS net
  FROM pkg WHERE n >= 2
), st AS (
  SELECT count(*) FILTER (WHERE abs(p / pp - 1) >= .1) AS big,
         count(*) FILTER (WHERE abs(p / pp - 1) >= .1 AND least(p, pp) < .05) AS big_tiny,
         count(*) FILTER (WHERE abs(p / pp - 1) >= 1) AS ge100,
         max(p / pp - 1) AS max_step,
         count(*) FILTER (WHERE p < .01) AS sub1c
  FROM obs WHERE pp > 0
)
SELECT
  count(*) AS packages_2plus,
  (SELECT count(DISTINCT ndc) FROM obs) AS packages_all,
  (SELECT count(*) FROM obs) AS rows,
  (SELECT count(*) FROM pkg WHERE n = 1) AS single_obs,
  (SELECT min(d) || ' .. ' || max(d) FROM obs) AS dates,
  (SELECT count(*) FROM obs WHERE p <= 0) AS zero_prices,
  count(*) FILTER (WHERE mn < .01) AS tiny_price_pk,
  count(*) FILTER (WHERE rng >= .03 AND net < .03) AS r3_n_lt,
  count(*) FILTER (WHERE rng >= .03 AND ms < .03) AS r3_nostep,
  count(*) FILTER (WHERE rng >= .05 AND net < .05) AS r5_n_lt,
  count(*) FILTER (WHERE rng >= .05 AND ms < .05) AS r5_nostep,
  count(*) FILTER (WHERE rng >= .10 AND net < .10) AS r10_n_lt,
  count(*) FILTER (WHERE rng >= .10 AND ms < .10) AS r10_nostep,
  count(*) FILTER (WHERE rng >= .03) AS r3,
  count(*) FILTER (WHERE rng >= .05) AS r5,
  count(*) FILTER (WHERE rng >= .10) AS r10,
  count(*) FILTER (WHERE ms >= .10) AS step10,
  count(*) FILTER (WHERE rng < .05) AS label_stable,
  count(*) FILTER (WHERE rng >= .05 AND ms >= .10) AS label_significant,
  count(*) FILTER (WHERE rng >= .05 AND ms < .10 AND net >= .05) AS label_ended_elsewhere,
  count(*) FILTER (WHERE rng >= .05 AND ms < .10 AND net < .05) AS label_ended_near_start,
  (SELECT big FROM st) AS big,
  (SELECT big_tiny FROM st) AS big_tiny,
  (SELECT ge100 FROM st) AS ge100,
  round(100 * (SELECT max_step FROM st), 1) AS max_step_pct,
  (SELECT sub1c FROM st) AS sub1c
FROM pk;
