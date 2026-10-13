# NADAC findings: price events and comparisons for visuals and testing

Dev database as of the 2026-10-07 NADAC file (weekly files from 2022-01-05). Queries live in
[`sql/`](sql/); each file explains its parameters at the top. Prices are NADAC per pricing
unit (`EA` each, `ML`, `GM`). **Search** is what to type into the NADAC search (description
contains, 5+ characters) to reproduce a finding in the app.

## How to read NADAC (lessons that shaped every query)

- **One row per NDC per weekly file.** The same rate repeats each week until it changes;
  `EffectiveDate` is re-stamped at most monthly refreshes even when the price barely moves,
  so it dates the latest rate, not the last change.
- **Generics are priced per description, not per NDC.** All 20 dapagliflozin 10 mg NDCs from 11
  labelers carry one price. Topicals and liquids are the exception: packages of one description
  can be priced by package size (see [Package spread](#package-spread-within-one-fda-product)).
- **Never average a brand across descriptions.** New strengths and package types move the
  average without any price change. The Austedo average "doubled" in two years while each
  tablet rose about 5% (XR 30-48 mg strengths launched at $316-500/tablet), and the Zepbound
  average "fell 36%" in 2026 when the multi-dose KwikPen arrived. This applies to the app too:
  a product-level chart averages its packages.
- **A pricing unit is not a dose.** Zepbound's 2.4 mL multi-dose KwikPen is $282/mL against
  $526/mL for the single-dose pen, but per 10 mg dose it is $169 vs $263. Comparing per mL
  overstates the gap; comparing per pen understates it.
- **2024 generic NADACs swing on their own.** CMS grew its pharmacy survey from about 2,500 to
  4,000 pharmacies in April 2024 ([NCPA](https://ncpa.org/newsroom/qam/2024/06/05/whats-going-nadac),
  [46brooklyn](https://www.46brooklyn.com/news/may-2024-drug-pricing-report-nadac-is-cool-again-and-so-is-46brooklyn-obviously)).
  Five weekly files that year moved 4,000-8,500 NDCs by more than 25% each (a normal week:
  ~300): 2024-04-17 down, 06-19 up, 07-17 down, 08-21 up, 11-20 down. From the December 2024
  update CMS has priced generics on a three-month moving average to damp this.

## 1. Medicare negotiation, MFN deals, and list-price cuts

### What moved NADAC: list-price (WAC) cuts, not the negotiated price itself

NADAC measures what pharmacies pay, so it follows the list price. The Medicare negotiated price
(the MFP) is paid back to pharmacies after the sale and does not change it. Every negotiated drug
whose NADAC fell had a manufacturer list-price cut behind it; the others held or rose.

Last 2025 file (2025-12-31) vs latest (2026-10-07), per description
(`sql/price_change_between_dates.sql` defaults):

| Drug | NADAC per unit, before → after | Change | Search |
| --- | --- | --- | --- |
| Fiasp (Novo) | $35.72 → $8.91 /mL (FlexTouch) | **-75%** | `fiasp` |
| Jardiance (Boehringer) | $20.14 → $11.19 /tablet | **-44.4%** | `jardiance` |
| Eliquis (BMS/Pfizer) | $9.70 → $5.52 /tablet | **-43%** | `eliquis` |
| Farxiga (AstraZeneca) | $19.17 → $12.08 /tablet | **-37%** | `farxiga` |
| Januvia (Merck) | $10.55 → $10.55 | 0% (cut a year earlier, see below) | `januvia` |
| NovoLog (Novo) | $8.94 → $8.94 /mL (FlexPen) | 0% (cut in 2024, see below) | `novolog` |
| Xarelto (J&J) | $19.12 → $19.54 | +2.2% | `xarelto` |
| Entresto (Novartis) | $11.27 → $11.59 | +2.9% | `entresto` |
| Enbrel (Amgen) | $1,982 → $2,081 /mL | **+5%** | `enbrel` |
| Stelara (J&J) | $28,376 → $29,793 /mL (90 mg) | **+5%** | `stelara` |
| Imbruvica | not in NADAC | | |

- Eliquis: BMS cut the list price from $606 to $346 a month on 2026-01-01, the same -43%
  ([Reuters via Yahoo](https://finance.yahoo.com/news/bristol-myers-forecasts-upbeat-2026-122544598.html)).
  The Medicare negotiated price is lower still ($231), and NADAC does not show it.
- Fiasp: Novo announced a 75% list cut for 2026-01-01 to match NovoLog's
  ([Fierce Pharma](https://www.fiercepharma.com/pharma/novo-nordisk-slashes-prices-more-insulin-products-not-until-2026)).
- Farxiga and Jardiance: 37% and 44% cuts arrived through the White House drug-pricing deals of
  early 2026 ([search summary of coverage](https://www.npr.org/2026/01/16/nx-s1-5678915/trumprx-pharma-drug-price-deals-list-prices);
  article text not verified, the page timed out).
- Enbrel and Stelara were negotiated and still rose 5% in January: the negotiation lowered what
  Medicare pays, not the list price. Stelara rose despite biosimilar competition since 2025.

### Cuts that reached beyond the negotiated drug

- **Boehringer cut the whole empagliflozin family by exactly 44.4%**, including Glyxambi,
  Synjardy, Synjardy XR, and Trijardy XR, none of which was negotiated. Search `synjardy`,
  `trijardy`, `glyxambi`.
- **AstraZeneca cut Farxiga but not Xigduo XR** (dapagliflozin-metformin), which stayed at
  $9.59-19.24. A good two-line chart: `farxiga` vs `xigduo`.
- **Novo also cut Tresiba 72%** on 2026-01-01 (not negotiated). **Lilly cut Lyumjev and Humalog
  200 KwikPen 70%** the same week. **AbbVie cut Linzess 50%** (72/145/290 mcg all
  $18.15 → $9.03), a year before its own negotiated price (Linzess is on the 2027 list).

### Cuts a year early: Januvia (2025-01-01)

Merck cut Januvia, Janumet, and Janumet XR 42% on 2025-01-01, citing a Medicaid rebate above
100% after the 2024 rebate-cap change ([NCPA](https://ncpa.org/newsroom/qam/2024/11/18/upcoming-wac-reductions-januvia-janumet-and-janumet-xr)).
NADAC: Januvia $18.33 → $10.56/tablet, Janumet $11.00 → $6.34. So Januvia shows no 2026 drop
because it already happened. Search `januvia`.

### Generic entry around the negotiated drugs (far bigger than any negotiated cut)

| Generic | First NADAC week | Now | Brand now | Search |
| --- | --- | --- | --- | --- |
| Dapagliflozin (Farxiga) | 2026-05-27 at $11.37 | $0.18 | $12.08 | `dapagliflozin` |
| Sacubitril-valsartan (Entresto) | 2025-09-10 | $0.50-0.59 | $11.59 | `sacubitril` |
| Rivaroxaban 2.5 mg (Xarelto) | 2025-05-21 | $0.65 | $9.77 | `rivaroxaban 2.5` |
| Sitagliptin (Januvia) | 2026-08-05 | $3.47-3.77 | $10.55 | `sitagliptin` |

Dapagliflozin is the most extreme single move in the data: **-98% in one week**
(2026-05-27 → 06-03, $11.37 → $0.20). The launch week priced the new generics near the brand;
the next week 5 more labelers (7 more NDCs per strength) were listed at $0.20. Rivaroxaban 2.5 mg is the opposite shape, a staircase of
monthly cuts (-22%, -29%, -32%, -20% from 2025-09 to 2026-01).

### GLP-1 deals do not show in NADAC

The 2025-2026 deals cut the cash prices patients pay directly to the manufacturer. NADAC per
description: Mounjaro pens $523 → $539/mL (+3%), Ozempic pens $322 → $332/mL (+3%), Wegovy pens
flat at $653 and $435/mL, Zepbound single-dose pens flat at $526/mL. New products since: Wegovy
tablets ($43/tablet, 2026-04), Ozempic tablets ($33, 2026-10), Wegovy HD 7.2 mg pen, Zepbound
KwikPen.

### Earlier wave: the 2024-01 Medicaid AMP-cap list-price cuts

When the Medicaid rebate cap ended on 2024-01-01, insulin and inhaler makers cut list prices.
NADAC, first file after the cut:

| Drug | Before → after | Change | Search |
| --- | --- | --- | --- |
| Lantus (vial, SoloStar) | $28.00 → $6.16 /mL | -78% | `lantus` |
| Humalog vial | $26.35 → $6.37 /mL | -76% | `humalog` |
| NovoLog (vial, FlexPen, PenFill, Mix) | $27.79-35.79 → $6.95-8.95 /mL | -75% | `novolog` |
| Levemir | -65% | | `levemir` |
| Advair Diskus (EA) | $6.54 → $3.28 | -50% | `advair` |
| Symbicort | $35.77 → $21.46 /g | -40% | `symbicort` |
| Spiriva (2025-01-08) | $17.37 → $10.97 | -37% | `spiriva` |

**Insulin chart idea:** NovoLog (cut 2024-01) and Fiasp (cut 2026-01) are the same insulin
aspart from the same maker; until 2026 Fiasp cost 4× NovoLog per mL, and now they match. Same
unit (`ML`), so Match scale applies.

## 2. Extreme single-week moves (`sql/largest_weekly_moves.sql`)

Rises (`direction = 'up'`):

| Description | Week | Before → after | Change |
| --- | --- | --- | --- |
| Quinidine sulfate 200 mg tab | 2025-06-18 | $0.17 → $10.88 | **+6,278%**, held until it left NADAC after 2026-08-12 |
| Isosorbide mononitrate 20 mg tab | 2025-05-21 | $0.19 → $3.35 | +1,646% |
| Isoniazid 100 mg tab | 2025-11-19 | $0.10 → $1.60 | +1,450% |
| Isoniazid 300 mg tab | 2025-05-21 | $0.22 → $3.13 | +1,312% |
| Flurbiprofen 100 mg tab | 2025-08-20 | $0.31 → $3.28 | +957% |
| Amlodipine-valsartan-HCTZ 10-320-25 | 2024-04-17 | $1.57 → $9.31 | +492% |
| Imiquimod 3.75% cream pump | 2026-02-18 | $24.39 → $117.78 /g | +383% |

Drops (`direction = 'down'`):

| Description | Week | Before → after | Change |
| --- | --- | --- | --- |
| Dapagliflozin 5 / 10 mg | 2026-06-03 | $11.42 → $0.18 | -98% |
| Prucalopride 1 / 2 mg (generic Motegrity) | 2025-10-22 | $13.16 → $0.76 | -94% |
| Dapagliflozin-metformin ER | 2026-07-15 | $11.68 → $0.77 | -93% |
| Dasatinib 100 mg (generic Sprycel) | 2025-12-17 | **$191.74 → $30.25** /tablet | -84% |
| Dimethyl fumarate DR 120 mg | 2025-05-21 | $6.93 → $1.12 | -84% |
| Lantus | 2024-01-03 | $28.03 → $6.17 /mL | -78% |
| Ticagrelor 60 mg (generic Brilinta) | 2026-03-18 | $2.37 → $0.62 | -74% |

**Volatile series** (2024 survey swings): carbamazepine 200 mg went
$0.150 → $0.103 → $0.156 → $0.101 → $0.198 → $0.119 within 2024 (`carbamazepine 200`);
captopril 50 mg more than doubled in a single week three times (2022-03, 2023-08, 2024-04). Good for testing price-change flagging on noisy data.

## 3. Higher strength, lower price (`sql/strength_price_inversions.sql`)

Generics, latest file. Odd strengths with few makers cost many times the common strength,
often more per tablet than a dose several times larger.

| Lower strength | Price | Higher strength | Price | Lower costs |
| --- | --- | --- | --- | --- |
| Fenofibrate 120 mg tab | $16.76 | Fenofibrate 160 mg tab | $0.10 | **162×** |
| Fenofibrate 40 mg tab | $5.54 | Fenofibrate 54 mg tab | $0.07 | 75× |
| Fluorouracil 0.5% cream | $42.88 /g | Fluorouracil 5% cream | $0.62 /g | 70× |
| Diclofenac potassium 25 mg | $4.57 | Diclofenac potassium 50 mg | $0.11 | 41× |
| Doxycycline 50 mg tab | $4.70 | Doxycycline hyclate 100 mg tab | $0.12 | 40× |
| Allopurinol 200 mg | $1.84 | Allopurinol 300 mg | $0.05 | 35× |
| Baclofen 15 mg | $1.67 | Baclofen 20 mg | $0.05 | 32× |
| Bisoprolol 2.5 mg | $2.52 | Bisoprolol 5 mg | $0.11 | 22× |
| Methylphenidate ER 45 mg | $17.51 | Methylphenidate ER 54 mg | $0.81 | 22× |
| Temazepam 22.5 mg | $1.55 | Temazepam 30 mg | $0.09 | 17× |
| Quetiapine 150 mg | $1.24 | Quetiapine 200 mg | $0.09 | 14× |

Searches: `fenofibrate`, `allopurinol`, `bisoprolol`, `baclofen`, `quetiapine`, `temazepam`.
The fenofibrate family alone fills a chart: nine strengths across tablets and capsules,
$0.07 to $16.76. Caveat: the query matches on ingredient, dosage form, and strength, so a few
pairs cross product lines (12-hour vs 24-hour diltiazem); the ones above are the same product
type.

Brands often go the other way: flat pricing across strengths. Eliquis 2.5 and 5 mg, Jardiance
10 and 25 mg, and Farxiga 5 and 10 mg each cost the same per tablet, before and after the 2026
cuts. Set `min_ratio` to 1.0 to list those.

## 4. Same strength, different form (`sql/dosage_form_price_gaps.sql`)

| Pricier | Price | Cheaper | Price | Ratio |
| --- | --- | --- | --- | --- |
| Promethazine 50 mg suppository | $26.69 | Promethazine 50 mg tablet | $0.08 | 326× |
| **Metformin 750 mg IR tablet** | $14.61 | Metformin ER 750 mg tablet | $0.05 | **278×** |
| Topiramate ER 100 mg capsule | $10.68 | Topiramate 100 mg tablet | $0.06 | 188× |
| Diclofenac potassium 50 mg powder packet | $10.97 | Diclofenac potassium 50 mg tablet | $0.11 | 98× |
| Progesterone 100 mg vaginal insert | $10.88 | Progesterone 100 mg capsule | $0.23 | 48× |
| Naproxen DR 375 mg | $2.23 | Naproxen 375 mg | $0.06 | 38× |
| Cetirizine 10 mg chewable | $2.11 | Cetirizine 10 mg tablet | $0.06 | 34× |
| Zolmitriptan 5 mg nasal spray | $44.04 | Zolmitriptan 5 mg tablet | $1.35 | 33× |
| **Doxycycline hyclate 50 mg tablet** | $4.70 | Doxycycline hyclate 50 mg capsule | $0.14 | 33× |
| Clozapine ODT 200 mg | $21.20 | Clozapine 200 mg tablet | $0.97 | 22× |

Doxycycline is the purest **tablet vs capsule** example: same salt, same strength, 33×.
Metformin 750 mg is the strangest: the immediate-release tablet is an unusual strength and
costs 278× the extended-release one. Searches: `metformin hcl 750`, `doxycycline hyclate 50`,
`topiramate`, `cetirizine hcl 10`.

## 5. Package spread within one FDA product (`sql/product_package_price_spread.sql`)

These exercise the min-max shading on FDA product-level charts (packages of one product with
different NADAC prices):

| Product | Product NDC | Low → high | Why |
| --- | --- | --- | --- |
| Prednisone 10 mg (Actavis, ANI, Par) | `0591-5442`, `70954-059`, `0603-5338` | $0.05 → $0.58 | dose pack vs bottle (11×) |
| Imiquimod 5% cream (Padagis) | `45802-368` | $0.61 → $12.17 | same description, two prices (20×) |
| Clotrimazole 1% solution (ScieGen) | `50228-502` | $0.43 → $2.74 /mL | package size |
| Lidocaine-prilocaine cream | `0168-0357`, `62332-582` | $0.23 → $1.34 /g | package size |
| Asmanex Twisthaler 220 mcg | `78206-114` | $36.98 → $161.43 per inhaler | #14 vs #120 inhalers priced per inhaler (per dose the big one is half the price) |

## 6. Edge cases for the app

- **Fake price changes from reclassification.** A new Dilantin 100 mg NDC (`58151011001`,
  2025-03-12, and `58151011010`, 2026-09-23) appeared for one week classed `G` at the generic
  phenytoin price ($0.16), then moved to `B-ANDA` at $1.66-1.74: a "+1,000%" flag that is a
  classification change. Dapagliflozin's launch week is the reverse: priced near the brand,
  then -98%. Search `dilantin`.
- **Unit traps:** Zepbound and Asmanex above.
- **Brand-average mix shifts:** Austedo and Zepbound above.
- **Series that start mid-window** (gap-before-data in `LineViz`): any generic launch above,
  for example dapagliflozin from 2026-05-27 or sitagliptin from 2026-08-05.
- **Flat for years, then a cliff:** Lantus, NovoLog, Eliquis, Jardiance.

## Data quality note

In 2026-10 the dev DB was missing every 11-character NDC (5-digit labelers, ~81% of rows) for
the 69 files 2025-01-01..2026-04-29: they were loaded while `NadacPrices.Ndc` had a foreign
key to `FdaPackages` (migration FK1, dropped in FK4) and never reloaded. Fixed 2026-10-12;
production was not affected. `sql/nadac_week_coverage.sql` checks for it: a quarter whose
`min_11_char_ndcs` falls near zero is the same problem again.
