# Test drugs: searches that exercise the app

A checklist of searches for manual and browser testing, grouped by the behavior each one
exercises. Counts are from the dev API on 2026-11-12 (latest NADAC file 2026-10-14). NADAC
counts use a 2025-10-15 to 2026-10-14 window; FDA counts are for all history.

[FINDINGS.md](FINDINGS.md) explains the price events behind many of these, and has more
examples per category.

**Columns**

- **Search:** what to type. NADAC searches the description, FDA the brand (proprietary) name,
  both as "contains".
- **NADAC:** NDCs (packages) / of which OTC / descriptions (the Drug filter's options).
- **FDA:** products / of which OTC / sample packages / packages with no NADAC price.
- Classes: G generic, B brand, B-ANDA, B-BIO. Units: EA, ML, GM.

## Quick smoke set

If there's only time for six, run these:

| Search | Page | Why |
| --- | --- | --- |
| `eliquis` | both | Small, brand, clean: 6 NDCs, one cliff (-43% on 2026-01-01) |
| `loratadine` | NADAC | 70 of 78 NDCs are OTC: with OTC hidden, only desloratadine shows |
| `nicotine` | NADAC | All 208 NDCs are OTC: empty unless Include OTC is ticked |
| `cholestyramine` | FDA | 9 products in two units (Mixed units, split charts) |
| `metformin` | FDA | 5 sample and 1,423 no-price packages, hidden by default |
| `hydrochlorothiazide` | both | Largest payload tested: 500 NDCs (12.7 MB) and 849 products (53 MB) |

## Include OTC

As of search-filters step 2, both pages hide OTC by default.

| Search | NADAC | FDA | What to check |
| --- | --- | --- | --- |
| `nicotine` | 208 / **208** / 37 | 702 / **702** | Everything hidden: the empty-result message should name OTC and offer the fix |
| `fexofenadine` | 32 / **32** / 6 | 130 / **130** | Same, small |
| `polyethylene glycol` | 41 / **41** / 1 | 44 / 37 | All OTC, and also mixed units (EA packets, GM powder) |
| `loratadine` | 78 / 70 / 18 | 231 / 216 | Mostly hidden. The Rx rows left are *des*loratadine (a "contains" match), which looks like a wrong result |
| `aspirin` | 89 / 78 / 24 | 446 / 428 | Mostly hidden. The Rx rows left are combinations: aspirin-dipyridamole and butalbital-aspirin-caffeine |
| `ibuprofen` | 267 / 148 / 51 | 1,149 / 821 | Mixed, large. Rx 400-800 mg vs OTC 200 mg. The Drug filter lists 44 OTC-only options |
| `cetirizine` | 81 / 55 / 12 | 280 / 220 | Rx-to-OTC switch, mostly OTC |
| `omeprazole` | 305 / 82 / 28 | 618 / 282 | Switch: Rx capsules vs OTC DR tablets. "Contains" also matches **es**omeprazole |
| `famotidine` | 120 / 20 / 7 | 291 / 80 | **One description, both kinds:** `FAMOTIDINE 20 MG TABLET` has Rx and OTC NDCs, so excluding by description and hiding OTC overlap. So does `ESOMEPRAZOLE MAG DR 20 MG CAP` |
| `esomeprazole`, `lansoprazole` | 135 / 28, 102 / 17 | 259 / 115, 137 / 38 | More PPI switches |
| `olopatadine` | 21 / 18 / 7 | 94 / 87 | Full Rx-to-OTC switch (eye drops), ML and GM |
| `levocetirizine` | 16 / 4 / 2 | 62 / 19 | Partial switch: same drug Rx and OTC |
| `diclofenac` | 164 / 14 / 21 | 413 / 53 | Voltaren gel went OTC; three units (EA, ML, GM) |
| `naloxone` | 100 / 7 / 13 | 172 / 18 | Narcan nasal spray went OTC in 2023 |
| `norgestrel` | 10 / 3 / 3 | 28 / 15 | OTC contraception (Opill 2023, Plan B). Also matches levonorgestrel |
| `humulin` | 7 / 5 / 7 | 8 / 7 | **OTC brand insulin** (human insulin R and N need no prescription) |
| `novolin` | 6 / **6** / 6 | 7 / 7 | Same, all OTC. Breaks the "OTC means cheap generic" assumption |
| `minoxidil`, `adapalene` | 18 / 5, 29 / 8 | 245 / 213, 65 / 35 | Topicals: Rx tablets vs OTC solution or gel |
| `metformin`, `lisinopril`, `atorvastatin` | 0 OTC | 0 OTC | Controls: Include OTC changes nothing |

## Brand / generic (NADAC)

A description search rarely mixes classes, because brand descriptions use the brand name.

| Search | Classes | Note |
| --- | --- | --- |
| `insulin` | G + B | One of the few mixed-class searches; 22 descriptions, EA and ML |
| `testosterone` | G + B-ANDA | Mixed, with ML and GM units |
| `dilantin` | B-ANDA only | New NDCs priced as G for a week, then reclassified: a fake "+1,000%" flag |
| `semglee`, `rezvoglar` | B-BIO only | Biosimilar insulin glargine. `basaglar` and `lantus` are B, `glargine` is G |
| `humira` vs `adalimumab` | B vs G | The brand and its unbranded version are separate searches |
| `eliquis`, `farxiga`, `zepbound` | B only | Brand-only results: the Generic option should empty them |

## Units

| Search | Units | What to check |
| --- | --- | --- |
| `cholestyramine` | EA + GM | 9 mixed-unit FDA products; "Mixed units" rows; one chart per unit |
| `prevalite` | EA + GM | One product, both units current |
| `colestipol`, `bacitracin` | EA + GM | One unit stopped being priced: the row shows two price dates |
| `diclofenac`, `albuterol`, `budesonide`, `minoxidil` | EA + ML + GM | Three units in one NADAC result |
| `zepbound`, `asmanex` | ML; EA + GM | A pricing unit is not a dose (see FINDINGS.md) |

## FDA load and refine fields

| Search | FDA | What to check |
| --- | --- | --- |
| `metformin` | 5 sample, 1,423 no-price | The plan's reference case for the hidden-by-default packages |
| `synthroid` | 12 products, **9 sample** | High share of sample packages |
| `lisinopril` | 11 sample, 1 dosage form | Many products, one form: the dosage-form filter has one option |
| `acetaminophen` | 1,062 products, 20 forms, 280 labelers | Long filter option lists |
| `advil`, `tylenol` | 66 and 120 products, **all** OTC, **no** prices | OTC brands NADAC doesn't price: empty twice over |
| `imbruvica`, `beclomethasone`, `afatinib` | products, no prices | In FDA, not in NADAC (specialty drugs, new generics) |
| `semaglutide`, `pitolisant` | 0 products | FDA searches the brand name only: `ozempic` and `wakix` work, the ingredient doesn't |

## Dates and price changes

| Search | What to check |
| --- | --- |
| `eliquis`, `jardiance`, `lantus`, `novolog` | Flat for years, then a cliff. One change card each |
| `dapagliflozin` | Series starts mid-window (2026-05-27), then -98% the next week |
| `sitagliptin`, `brivaracetam` | Generics first priced in 2026 (2026-08-05, 2026-05-20): gap before data in LineViz |
| `quinidine` | +6,278% in 2025-06, then the series ends after 2026-08-12 (gap after data) |
| `carbamazepine 200` | Noisy 2024 survey swings: many flagged changes. Set dates to 2024 |
| `ibuprofen` (start 2025-06-01) | 22 flagged changes: more than the 9 that get charts, so the page asks to narrow |
| `rivaroxaban 2.5` | Staircase of monthly cuts. A multi-word search with a number |
| Any search, start date not a Wednesday | The first week must still show (the as-of snap, PR #21) |

## Search input edge cases

| Input | Expect |
| --- | --- |
| `ELIQUIS`, `Eliquis` | Same as `eliquis` (case-insensitive) |
| ` eliquis ` | Check whether surrounding spaces are trimmed or break the search |
| `eliq` | Under the 5-character minimum: Search disabled |
| `metformin hcl 750`, `rivaroxaban 2.5` | Multi-word "contains" with a number |
| NDC `00003-0893-21`, `3089321` | Dashed input is converted to the stored form (`toStoredNadacNdc`) |
| `relion` | No results on either page: the empty state for a real-sounding name |
| **`_____`** or **`%%%%%`** | **Bug, not yet fixed:** see below |

**Unescaped LIKE wildcards.** The server builds its searches as `ILIKE '%{term}%'` without
escaping `%` or `_` (`NadacRepository.cs:58`, `FdaProductRepository.cs:63`). Five
underscores pass the 5-character minimum and match every row: one week of NADAC came back as
14.7 MB. Over the default 12-month window that is roughly 50 times as much, and the FDA search
returns every product. Don't run either against production. The fix is to escape `\`, `%` and
`_` before building the pattern, or to use `EF.Functions.ILike(column, pattern, "\\")` with an
escaped term.

## Sources

- FDA, [Prescription-to-Nonprescription (Rx-to-OTC) Switches](https://fda.gov/drugs/drug-application-process-nonprescription-drugs/prescription-nonprescription-rx-otc-switches)
  and [the switch-types presentation](https://www.fda.gov/media/183133/download) (full and
  partial switches: diclofenac, olopatadine, levocetirizine).
- [MDLinx: 13 drugs that made the Rx-to-OTC switch](https://mdlinx.com/article/from-rx-to-otc-13-drugs-that-made-the-switch-in-the-past-decade/5ZAzuyvaSt4DJ5RMMt2nkU).
- FDA, [First Generic Drug Approvals](https://www.fda.gov/drugs/developmentapprovalprocess/howdrugsaredevelopedandapproved/drugandbiologicapprovalreports/andagenericdrugapprovals/),
  and [PharmTech on generic dapagliflozin](https://www.pharmtech.com/view/fda-approves-first-generic-dapagliflozin-tablets)
  (2026 first generics: dapagliflozin, brivaracetam, beclomethasone, afatinib, pitolisant).
- Drug-shortage coverage (for example [AJMC, July 2026](https://www.ajmc.com/view/active-us-drug-shortages-rise-for-third-straight-quarter))
  is mostly about hospital injectables, which NADAC doesn't price, so none are in this list.
