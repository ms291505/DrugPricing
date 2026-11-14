# NADAC price variation: choosing the "Stable" band, and a gap check of the dev data

Measured 2026-11-13 on the local dev database. It holds weekly NADAC files from 2022-01-05 to
**2026-11-11** (254 files, 7,157,174 rows, 42,603 NDCs). Unless a table says otherwise, the window
is the **last 52 weeks: 2026-11-11 back to 2025-11-12 (53 files)**, and a package is one NDC with
two or more prices in the window (33,411 of 33,504; the other 93 are covered under
[Caveats](#caveats)). Prices are `NadacPerUnit`. Brand means classification not `G` (2,733
packages); generic is `G` (30,678). Queries are in [`sql/`](sql/); each file's header says what it
answers, and every number below comes from running them (commands are in
[Reproducing](#reproducing)).

## Conclusion

The results tables will label each package's price activity from the prices in the dates shown:

- **Stable** when its **range**, (highest price - lowest price) / lowest price, is under **5%**;
  otherwise **Changed**.
- A single week-to-week move of 10% or more stays flagged as significant, as it is today.

The data supports a 5% band on range, with two honest qualifications. It does not pick 5% out of the
data: package ranges slope smoothly through 3-10% with no gap to cut at (see
[Why 5%](#why-5)). And over a 12-month window most packages are Changed, not Stable
(84%), because NADAC generic prices move all the time. The band is a labelling choice, not a
finding.

What the label does at the planned settings, 12 months, 33,411 packages:

| Label | Packages | Share |
| --- | ---: | ---: |
| Stable (range under 5%) | 5,288 | 15.8% |
| Changed, with a week of 10% or more ("Dropped 25% on Apr 1") | 6,470 | 19.4% |
| Changed, no such week, net change 5% or more ("Up 14% over 52 weeks") | 14,778 | 44.2% |
| Changed, no such week, ended within 5% of the start ("Dipped 8% in April") | 6,875 | 20.6% |

("Ended near where it started" is taken here as net change under 5%, the same band; the design
does not fix this, so the 20.6% moves with it.)

Product rows, Stable only when every package is, come out about the same: 15.6% of 20,326 FDA
products (see [Product rows](#product-rows)). The 5% comparison should be made on the range
rounded to 0.1%, so the client's doubles and the label cannot disagree with the state; that
moves 77 packages to Changed (see [Where the 5% comparison runs](#where-the-5-comparison-runs)).

### Why range, not net change or the largest single step

Range is the height of the line a user sees. The two alternatives each call visibly moving
packages Stable:

| Measure, 12 months | Share Stable at 5% | Hidden by it |
| --- | ---: | --- |
| **Range** (max - min) / min | **15.8%** | |
| Net change, first to last price | 38.7% | 7,633 of the 28,123 packages with range of 5% or more (27%) ended within 5% of the start: they went up or down 5% or more and came back. A net rule calls them Stable. |
| Largest single weekly step | 46.5% | 10,234 of those 28,123 (36%) never moved 5% in one week: they drifted in small steps. A step rule calls them Stable. |

Range needs only the prices on screen, is not fooled by a round trip, and sees drift. Its cost is
that it is the strictest of the three. It is also the measure that grows with the window (see
[Window](#the-window-changes-the-answer)).

### Why 5%

Share of packages with range under each band (12 months; `sql/nadac_variation_bands.sql`):

| Group | Packages | under 1% | under 3% | **under 5%** | under 10% | under 25% | Median range |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| All | 33,411 | 6.7% | 9.9% | **15.8%** | 35.2% | 73.6% | 14.3% |
| Generic | 30,678 | 3.0% | 5.3% | **10.5%** | 29.9% | 71.6% | 15.6% |
| Brand | 2,733 | 48.3% | 60.7% | **75.7%** | 94.5% | 96.3% | 1.3% |

- **No natural break.** Packages per 1-point slice of range (`sql/nadac_range_density.sql`): 3-4%
  949, 4-5% 1,042, 5-6% 1,594, 6-7% 1,216, 7-8% 1,313. Counts rise gently from 1% to 6% and stay
  near 1,200 out to 15%; no dip marks a cutoff.
- **5% is above the usual week.** Of the weekly changes that are not zero, the median is 1.8%, 5%
  is about the 83rd percentile and 10% the 96th (table below). A band under about 2% would label
  almost every moving package Changed for ordinary noise. A band of 10% would call 35% Stable,
  including packages that moved 9% in one week.
- **Brand and generic behave differently**, so no single band suits both. A 5% band calls three
  brands in four Stable and one generic in ten.
- **The 5% edge splits one common move.** Many brands took a list-price rise of about 5%. Brand
  packages with range 4.95-5.0% (Stable) number 41; 5.0-5.05% (Changed) number 137. Whether a 5%
  rise reads Stable or Changed depends on 4-decimal rounding of the stored prices, and on where
  the comparison runs (next section).

### Where the 5% comparison runs

`NadacPerUnit` is `numeric(19,4)`, so Postgres (and this report) computes the range exactly. The
client computes it in doubles, where a range of exactly 5% can come out just under 0.05:
`(0.21 - 0.2) / 0.2` is `0.04999999999999993` in JS. In the 12-month window **9 packages have a
range of exactly 5.0000%; in doubles 5 of them fall under 0.05**, so a client comparing the raw
double would call them Stable while this report calls them Changed. Packages Stable under each
rule (`sql/nadac_range_density.sql`, last result set):

| Rule, 12 months | Stable | Labelled differently from exact numeric |
| --- | ---: | ---: |
| Exact numeric, range < 5% (this report) | 5,288 (15.8%) | |
| Raw double, range < 0.05 | 5,293 (15.8%) | 5 |
| **Range rounded to 0.1%**, `Math.round(range * 1000) / 1000 >= 0.05` is Changed | **5,211 (15.6%)** | **77** |
| Range rounded to a whole percent, `Math.round(range * 100) / 100 >= 0.05` is Changed | 4,758 (14.2%) | 530 |

**Recommendation:** classify on the range rounded to the precision the label displays, so a
label can never show "5.0%" on a Stable row or "within 5%" beside a Changed one. At 0.1%
precision that is `Math.round(range * 1000) / 1000 >= 0.05`: the 77 packages it moves are those
with range 4.95-5.0% (they display as 5.0% and become Changed), and the 5 float misses disappear;
in this window it gives the same answer whether computed in numeric or in doubles. Rounding to a
whole percent moves 530 packages (4.5-5.0%) and is fragile in its own way: 38 packages have a
range of exactly 4.5%, the rounding boundary, where doubles and numeric round differently. The
plan's Stable labels show whole percents ("within 2%"); rounded up, "within 5%" for a 4.6% range
is still true, so the label can stay whole-percent while the state is decided at 0.1%. Every
other share in this report uses exact numeric; the 0.1% rule lowers the 12-month Stable share by
0.2 points.

### The window changes the answer

Share Stable (range under 5%) by window length (`sql/nadac_variation_by_window.sql`):

| Window | All | Generic | Brand |
| --- | ---: | ---: | ---: |
| 1 month (4 weeks) | 82.0% | 80.4% | 99.8% |
| 3 months (13 weeks) | 49.3% | 45.1% | 98.4% |
| 6 months (26 weeks) | 29.4% | 23.7% | 95.4% |
| 12 months (52 weeks) | 15.8% | 10.5% | 75.7% |
| 24 months (104 weeks) | 9.4% | 5.1% | 56.2% |
| All dates (254 weeks) | 7.2% | 4.3% | 38.5% |

The label means "stable within the dates shown", so a user who shortens the dates sees more
Stable and one who widens them sees fewer. The label is not a property of the drug. The UI copy
should say so, for example by naming the window ("Stable over 12 months").

### Product rows

The plan classifies an FDA product row from its packages, never from the averaged line: a
product is Stable only when every package is. `sql/nadac_product_variation.sql` joins each NADAC
NDC to `FdaPackages` on `NdcPackageCodeStripped` and then to `FdaProducts`, both with
`DelistedAt IS NULL`. In the 12-month window **20,382 products have at least one priced
package**; 56 have only single-observation packages (Insufficient history), and the shares below
are of the other 20,326. No NDC matches more than one product, and none is priced in more than
one pricing unit in the window.

| Products, 12 months | Products | Stable at 3% | **Stable at 5%** | Stable at 10% |
| --- | ---: | ---: | ---: | ---: |
| All | 20,326 | 9.8% | **15.6%** | 32.9% |
| Brand (all packages brand) | 1,850 | 59.4% | **76.6%** | 95.4% |
| Generic (all packages generic) | 18,475 | 4.9% | **9.4%** | 26.6% |
| With 1 package | 13,988 | 12.0% | 18.0% | 33.8% |
| With 2 packages | 4,807 | 5.6% | 11.0% | 30.1% |
| With 3-4 packages | 1,484 | 3.8% | 7.8% | 32.7% |
| With 5-9 packages | 47 | 2.1% | 6.4% | 48.9% |
| Matched packages, for comparison | 28,497 | 9.0% | 14.8% | 33.9% |

One product mixes brand and generic packages. The product share about equals the package
share only because 69% of products have one priced package; each added package lowers it
(18.0% with one, 7.8% with three or four). So the product table's Price Activity column, like
the package tables', will read mostly Changed over 12 months: about five products in six.

### Weekly steps

`sql/nadac_weekly_steps.sql`, 12 months, 1,568,508 week-to-week steps:

| | |
| --- | --- |
| Steps that are exactly zero | 78.6% |
| Non-zero steps under 1% / 2% / 3% / 5% / 10% | 31.6% / 53.0% / 67.7% / 83.5% / 95.9% |
| Non-zero steps, p50 / p90 / p95 / p99 | 1.83% / 6.65% / 9.25% / 16.14% |

Per package, the largest single step has a median of 5.2% (generic 5.6%, brand 0.8%), and 6,470
packages (19.4%) have a step of 10% or more. Packages with range 5% or more and no step of 10%
or more are the 21,653 labelled by net change or "ended near start" above.

## Gap check of the dev database

`sql/nadac_gap_check.sql` and the existing `sql/nadac_week_coverage.sql`. Result: **no gaps in the
weekly series; the gaps that exist are NDCs entering and leaving NADAC.**

| Check | Result |
| --- | --- |
| Missing weekly as-of dates, first to last | **None.** 254 files expected from 2022-01-05 to 2026-11-11, 254 present, every one 7 days after the previous. |
| Latest as-of date | **2026-11-11, 2 days before 2026-11-13.** Current. NADAC files appear on Wednesdays, so the 2026-11-18 file is the next. |
| Weeks with too few or too many rows | **None.** Compared with the median of the 4 weeks either side, the largest deviations are 2024-04-17 (+3.2%) and 2024-04-10 (-3.2%, the same step seen from the other side); every other week is within 0.8%. Rows and distinct NDCs are identical each week (one row per NDC per file). |
| Weeks missing 11-character NDCs (the old FK load failure) | **None.** `nadac_week_coverage.sql`: weekly rows run 24,851 (2022) to 30,597 (2026) with no dip, and the lowest week of every quarter still has 19k-24.5k 11-character NDCs. The 2025-01 to 2026-04 weeks noted in [FINDINGS.md](FINDINGS.md) are fully loaded. |
| Duplicate NDC + as-of date | **0.** |
| Null or zero or negative prices; null classification | **0.** (`ClassificationForRateSetting` is also `NOT NULL` in the schema.) |
| Prices under $0.01 | 24,839 rows (88 packages in the 12-month window); real but distorting, see Caveats. |
| `EffectiveDate` after `AsOfDate` | 410 rows over 28 files and 347 NDCs, at most 5 days ahead. Not a hole (the as-of date is the file's date). Unused here, and the cause was not investigated. |

**The 2024-04-17 jump is real.** Rows rise from about 27,100 to 28,900 in that one file and by
2024-07 to about 29,500. The 535 NDCs that return on 2024-04-17 are also the largest returns on any
date (next largest: 59). It matches CMS growing its pharmacy survey in April 2024 (see
[FINDINGS.md](FINDINGS.md)), so it is a change in NADAC's coverage, not a partial load, and the
file for 2024-04-10 is complete.

### NDCs that disappear and come back

An NDC is "present" in a week when it has a row. Over all history, 1,823 NDCs left for at least
one whole week and later returned (1,906 returns in all); a further 12,446 left and never
returned (29% of all NDCs, normal churn for old and discontinued products).

| Weeks missing before the return | Returns |
| --- | ---: |
| 1 | 3 |
| 2 | 30 |
| 3-4 | 74 |
| 5-8 | 125 |
| 9-13 | 295 |
| 14-26 | 386 |
| 27-52 | 414 |
| 53 or more | 579 |

- **Short gaps, the kind a missed or partial load would leave, are rare:** 107 returns after 4
  weeks missing or fewer in 4.8 years. A few small clusters exist (28 NDCs returning 2022-02-02
  after 2 weeks, 17 on 2025-04-23, 13 on 2023-10-18), but each is under 0.2% of that week's
  NDCs and no week is short of rows, so none is a partial load. A load problem would show as
  thousands of NDCs missing the same weeks. The 28 on 2022-02-02 are in the first weeks of the
  data and could be a load artifact; they are outside every window this report uses.
- **Most absences are months or years long**, which is NADAC dropping an NDC from its survey
  results and relisting it later, not our loader. The one cluster (2024-04-17, above) is the
  survey change.
- **In the 12-month window** 252 returns on 16 dates (3 to 36 NDCs each; 3 returns after 3
  weeks missing or fewer), spread across the year with no cluster. Effect on the report: 129 of
  1,568,508 consecutive pairs inside the window (0.008%) are more than 14 days apart (127 over 30
  days), none are shorter than 7 days, and the "weekly step" for those spans several weeks.

## Caveats

- **Tiny prices inflate percentages.** 88 packages in the window have a minimum under $0.01 per
  unit, and 4,028 observations are under a cent. The largest weekly step is +1,099%; 453 of the
  13,679 weekly steps of 10% or more involve a price under 5 cents, and 3 are +100% or more. One
  cent on a $0.01 drug is 100%. A minimum price or an absolute-change guard (for example, also
  require a change of at least 1 cent) would stop these labelling as dramatic; this report did
  not measure how many packages it would move.
- **Window dependence** (above): the same package changes label as the dates change. Every
  percentage here is for one window, and the 12-month window is a choice.
- **Brand and generic** differ in everything: at 12 months the median range is 1.3% for brand and
  15.6% for generic. Generics are 92% of packages, so the all-packages numbers are mostly generic.
  Classification `B`, `B-ANDA` and `B-BIO` are all counted as brand.
- **Few observations.** 93 packages have one price in the window and cannot be labelled by range:
  61 first appear in the latest file (2026-11-11), 25 were last seen on the window's first date,
  and 7 are scattered. The plan labels these Insufficient history. With only two or three
  prices, "Changed" can rest on one step.
- **Spacing is not exactly weekly** for 129 consecutive pairs; the range ignores dates, so this
  does not move the label, but the "Dipped 8% in April" wording should not assume weekly spacing.
- **Packages are NDCs.** Product rows are classified from their packages, never from the
  averaged line (package changes can cancel in an average), so the product range is not a
  measure here; [Product rows](#product-rows) measures the every-package rule. That join covers
  only NDCs in both datasets: 4,929 of the window's 33,504 NADAC packages have no listed FDA
  package (268 of them match only a delisted one) and are in no product row.
- **Not measured:** the product-level share for windows other than 12 months (the file takes
  `-v weeks=N`, but only 52 was run); how much a minimum-price guard would change the counts;
  the share of Changed packages whose significant week is a rise vs a drop; how the
  "near start" threshold (5% here) changes the 20.6% / 44.2% split; behavior in a 12-month window
  that starts at a different point in the NADAC calendar.
- This is the dev database. Production loads the same files, but this report did not check it.
- An earlier pass at as-of 2026-10-14 agreed within a point.

## Reproducing

Needs the dev Postgres container (see `server/docker-compose.yml`); the queries only read. Run
from `reporting/sql/`, and set the window in weeks with `-v weeks=N` (default 52, counted back from
the latest as-of date), so rerunning next year regenerates every table:

```bash
q() { docker exec -i dev-pgsql-drug psql -U appuser -d drug_dev "${@:2}" -f - < "$1"; }
q nadac_variation_bands.sql -v weeks=52          # bands table (all, generic, brand)
q nadac_variation_checks.sql -v weeks=52 -x      # labels split, round trips, tiny prices
q nadac_weekly_steps.sql -v weeks=52 -x          # weekly steps and spacing
q nadac_variation_by_window.sql                  # window table
q nadac_range_density.sql -v weeks=52            # slices of range, the 5% edge, numeric vs double
q nadac_product_variation.sql -v weeks=52        # product rows: FDA join, every-package rule
q nadac_gap_check.sql                            # gap check, seven result sets
q nadac_week_coverage.sql                        # rows per week by quarter
```
