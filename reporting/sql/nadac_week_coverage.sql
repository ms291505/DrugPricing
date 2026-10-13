-- NADAC rows per weekly file, rolled up by quarter.
--
-- A complete weekly file has ~25k (2022) to ~30k (2026) rows. A quarter whose min is far
-- below its neighbours means some weeks loaded only part of the file. In 2026-10 the dev DB
-- had 69 weeks (2025-01-01 .. 2026-04-29) at ~5.2k rows: every NDC stored as 11 characters
-- (a 5-digit labeler) was missing because those files were loaded while NadacPrices.Ndc had
-- a foreign key to FdaPackages (migration FK1, dropped in FK4). Rerunning a file with
-- NADAC_FILTER_BEFORE_INSERT=false fills such gaps; ON CONFLICT keeps existing rows.
--
-- Drop the outer query to see the individual weeks.

SELECT
  date_trunc('quarter', "AsOfDate")::date AS quarter,
  count(*) AS weeks,
  min(row_count) AS min_rows,
  max(row_count) AS max_rows,
  round(avg(row_count)) AS avg_rows,
  -- Rows by stored NDC length: a week with no 11-character NDCs is the FK-era gap again.
  min(ndc11_count) AS min_11_char_ndcs
FROM (
  SELECT
    "AsOfDate",
    count(*) AS row_count,
    count(*) FILTER (WHERE length("Ndc") = 11) AS ndc11_count
  FROM "NadacPrices"
  GROUP BY "AsOfDate"
) weeks
GROUP BY 1
ORDER BY 1;
