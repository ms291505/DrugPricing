# Help content

Started 2026-11-13. A working draft of what the in-app Help should say, page by page. The original draft is retained below; see the publication record for what is now in the app.

## Publication record

The published articles now live in `client/src/content/help/`; edit those files for app wording.
This document retains the original draft, provenance and unresolved checks. The modal and
standalone `/help/:topic` pages share the published articles. The implementation deliberately
omits dated price/news examples and unverified production counts, schedules and screen-reader
claims. The Sources page uses CMS's pricing overview rather than an unverified methodology PDF.
The Help index lists the Welcome topic and links to the About page; the welcome home page is
part of the usability plan's Stage 1.

## How this file works

- Each `###` heading under "Pages" is one Help page. Its **Purpose** line says what question it
  answers, and the text under **Draft** is copy written for the user, ready to edit.
- **Check** lines are facts to confirm before the page ships. **Source** lines say where the
  content came from, so it can be rechecked when the app changes.
- Wording follows the app: field and button names are written as the UI shows them.

## Shape of Help

A table of contents with five groups, each page short enough to read on a phone without much
scrolling. Someone who opens Help from a search page most likely has one question, so every
page answers one.

| Group | Pages |
| --- | --- |
| Start here | Welcome · What the prices mean |
| The data | NADAC · The FDA directory · NDCs, products and packages · How the two fit together · How current it is |
| Using the app | Which search to use · Searching · Dates · Filters and hidden results · The results table · Charts · Price changes · Pinning and comparing · Tabs and your saved workspace · Settings · Keyboard and screen readers |
| Reading prices carefully | Five ways a price can mislead · Things to try |
| Reference | Glossary · Troubleshooting · Sources and disclaimer |

Decisions to make before building:

1. **Where Help lives.** The global modal is 600px wide and full screen on a phone, which fits
   a list of pages on top and one page below, with a Back link. A `/help` route with a page per
   URL would let a page be linked to (from a toast, an empty table, a blog post). Both can use
   the same content.
2. **Help in context.** The pages people need most are tied to one control: the Include boxes,
   "Mixed units", the shaded band, a price-change card. A small "?" beside each that opens its
   page would do more than the table of contents. The pages below note where one belongs.
3. **About stays separate.** About is the author's story (why NADAC, how it's hosted, why it was
   built). Help is for using the app. "Joining the Data" in About overlaps "How the two fit
   together" below; Help should carry the user-facing version and About can link to it.
4. **Welcome.** The current Welcome text becomes the first two Help pages, shortened. Its
   Eliquis table moves to "NDCs, products and packages".
5. **Length.** The drafts below run 80 to 200 words a page. Longer than that and the page
   should split.

## Pages

### Welcome

**Purpose:** what this is, in under a minute, and where to go next.

**Draft:**

DrugPricing shows what US pharmacies pay for drugs, week by week, back to January 2022. Search
for a drug, see its price history as a table and as charts, and pin charts side by side to
compare.

There are two ways to search:

- **NADAC search** looks through the prices themselves. Type part of a drug's description or an
  NDC.
- **FDA search** looks through the FDA's directory of drugs on the market, by brand or generic
  name, and shows the prices for what it finds.

New here? Read "What the prices mean" first: the numbers are not what a patient pays.

**Source:** `OnBoarding.tsx`, `About.tsx`, `TabCreator.tsx`.

### What the prices mean

**Purpose:** the one page everyone should read. Stops the most common misreading.

**Draft:**

Every price in this app is a NADAC: the National Average Drug Acquisition Cost. It is an
estimate of what a retail pharmacy pays its supplier for a drug, published every week by the
Centers for Medicare & Medicaid Services (CMS).

It is **not**:

- what you pay at the counter, with or without insurance;
- the pharmacy's retail or cash price;
- what an insurer or Medicare pays the pharmacy;
- a price after manufacturer rebates and discounts.

Prices are **per unit**, not per package or per dose: per tablet or capsule ("each"), per
millilitre, or per gram. A $5.52 Eliquis price is one tablet, so a bottle of 60 is about $331.

**Check:** the Eliquis figure is from the 2026-10 data; use a current one or word it without a
number.
**In context:** a "?" beside "Latest Price" in the results table.
**Source:** `About.tsx` disclaimer, `reporting/FINDINGS.md`.

### NADAC

**Purpose:** where the prices come from and how far to trust them.

**Draft:**

CMS surveys retail community pharmacies, both independents and chains, about what they paid on
their invoices. From the answers it publishes one average price for each drug package, and a
new file every week. States use NADAC to decide what Medicaid pays pharmacies, which is why it
is public.

Things worth knowing:

- **It is a survey.** Pharmacies answer voluntarily, and the average moves when the mix of
  pharmacies answering changes. In April 2024 CMS widened the survey, and generic prices swung
  for months (see "Five ways a price can mislead").
- **It follows the list price.** Discounts and rebates paid after the sale don't show. When
  Medicare negotiated a lower price for Eliquis, NADAC didn't move; when the manufacturer cut
  the list price in January 2026, it fell 43% in a week.
- **Not every drug is in it.** NADAC covers drugs sold through retail pharmacies. Drugs given in
  hospitals and clinics, many specialty drugs, and a lot of over-the-counter brands have no
  NADAC.
- **A price repeats until it changes.** Most weeks, most prices are the same as the week before.

**Check:** the survey description (who runs it, how often pharmacies are sampled, how brand
prices are updated between surveys) against CMS's NADAC methodology document. The 2024 pharmacy
counts (about 2,500 to 4,000) are from trade press, not CMS.
**Source:** `reporting/FINDINGS.md` ("How to read NADAC", section 1).

### The FDA directory

**Purpose:** what the second data source is and why it's there.

**Draft:**

The FDA's National Drug Code Directory lists the drugs currently marketed in the US: each
product's brand and generic names, strength, dosage form, route, and the company that labels it,
and each package it is sold in.

NADAC knows a drug only by a short description such as "ELIQUIS 5 MG TABLET". The FDA directory
adds the detail that lets you search by generic name, or narrow results to a dosage form, route
or labeler.

It has no prices of its own. FDA search shows NADAC prices for the packages found in both.

The directory lists what is on the market now. When a product is discontinued, the FDA removes
it, and it leaves FDA search too. Its past prices are still in NADAC search.

**Check:** how often the FDA data is reloaded here (the NADAC job is weekly and scheduled; the
FDA load's schedule isn't documented in the repo).
**Source:** `About.tsx`, `AGENTS.md` (`DelistedAt`).

### NDCs, products and packages

**Purpose:** explain the code every row carries, and the Product/Package switch.

**Draft:**

Every drug package sold in the US has a National Drug Code (NDC) in three parts:

| Part | Says | Example: `0003-0894-21` |
| --- | --- | --- |
| Labeler | the company | `0003` |
| Product | the drug, strength and form | `0894`: Eliquis 5 mg tablet |
| Package | the container | `21`: bottle of 60 |

The first two parts together are the **product NDC** (`0003-0894`). One product can have several
packages, and one brand usually has several products: Eliquis 2.5 mg and 5 mg are different
products.

A generic from another company has its own labeler code and its own product code. The numbers
carry no meaning beyond being unique, so two NDCs that look alike are not necessarily related.

FDA search can show its results at either level: **Product** (one row per product, prices
averaged across its packages) or **Package** (one row per package).

**NDC formats.** The FDA writes NDCs with dashes in three layouts (4-4-2, 5-3-2, 5-4-1). NADAC
uses 11 digits with no dashes. This app stores NADAC NDCs without leading zeros, so
`00003-0894-21` appears as `3089421` on the NADAC page. You can type an NDC either way.

**Check:** the Welcome table's rows were checked against the dev FDA data on 2026-11-13 (labeler
`0003` is E.R. Squibb & Sons). Its second row, `0003-0893-91`, is a sample package; pick a
package for sale if the table moves here.
**In context:** a "?" beside the Product/Package switch.
**Source:** `OnBoarding.tsx`, `EliquisTable.tsx`, `AGENTS.md` (NDC gotchas), `library/ndc.ts`.

### How the two fit together

**Purpose:** why a drug can be in one search and not the other.

**Draft:**

The NDC is the only thing the two sources share. The app matches each FDA package to its NADAC
prices by NDC, and the match is incomplete in both directions:

- **In NADAC, not in the FDA directory:** about a quarter of the NDCs with prices. Mostly
  discontinued products, which the FDA has dropped but which still have years of price history.
  Find these with NADAC search.
- **In the FDA directory, no NADAC price:** most of the directory. Hospital drugs, many
  specialty drugs, and most over-the-counter brands. FDA search hides these unless you tick
  **Results without prices**.

So if FDA search comes up empty for a drug you know exists, try NADAC search, and the reverse.

**Check:** "about a quarter" is from About; recount it.
**Source:** `About.tsx` ("Joining the Data"), `reporting/TEST_DRUGS.md`.

### How current it is

**Purpose:** set expectations about freshness and history.

**Draft:**

- NADAC prices are loaded every week, soon after CMS publishes the file, usually on Wednesday.
- History starts with the file of 5 January 2022.
- Each price is dated by the week of its file. A price shown for a week held until the next
  file.
- The newest week available is the end of the date range a new search starts with.

**Check:** whether to show the latest loaded week on this page (the app has it, from
`app-init`). Confirm the first file date in production; 2022-01-05 is from the dev database.
**Source:** `README.md`, `reporting/FINDINGS.md`, `AGENTS.md` (Search dates).

### Which search to use

**Purpose:** pick a starting point.

**Draft:**

| You have | Use | Why |
| --- | --- | --- |
| A brand name ("Ozempic") | FDA search, Brand name | Finds every product under the brand |
| A generic name ("semaglutide") | FDA search, Generic name | Finds every brand and generic with that ingredient |
| An NDC | NADAC search, NDC | Goes straight to the package |
| A discontinued drug, or FDA search found nothing | NADAC search, Description | NADAC keeps prices the FDA directory has dropped |
| A strength or form ("metformin er 750") | NADAC search, Description | NADAC descriptions include strength and form |

FDA search lets you narrow by dosage form, route and labeler. NADAC search is simpler and covers
every price in the data.

**Source:** `About.tsx` ("Two Tools, Two Data Sources"), `FdaSearchPanel.tsx`.

### Searching

**Purpose:** how the text fields behave.

**Draft:**

- Type at least 5 characters, then press **Search** or Enter. An NDC needs at least 5 digits.
- The search finds your text anywhere in the name: "loratadine" also finds *des*loratadine, and
  "omeprazole" finds *es*omeprazole. Capital letters don't matter.
- There is no spelling correction. If nothing comes back, check the spelling or try fewer
  letters.
- Brand and generic drugs are named differently in NADAC. Search "humira" for the brand and
  "adalimumab" for the unbranded version; they are separate results.
- **Search** is greyed out while the results on screen already match what you typed. Change the
  text and it lights up.
- Everything else in the panel (dates, checkboxes, filters) applies as soon as you change it.
  You never need to press Search for those.

**Check:** the autocomplete plan (`docs/plans/autocomplete.md`) would add suggestions and "Did you
mean"; rewrite this page when it ships.
**Source:** `AGENTS.md` (Search criteria), `library/constants.ts`, `reporting/TEST_DRUGS.md`.

### Dates

**Purpose:** what the Dates field controls.

**Draft:**

**Dates** sets the period for everything on the page: the prices in the table, the charts, and
which price changes are flagged. Choose **Last year**, **6 months**, **3 months**, **All**, or
**Custom** for your own range.

A new search starts with the last 12 months.

Prices are weekly, so the first and last dates shown are the nearest weeks to the ones you
picked.

On FDA search, "Results without prices" means no prices *in these dates*. Widen the dates and
more results may appear.

Pinned charts keep their own dates (see "Pinning and comparing").

**Source:** `AGENTS.md` (Search dates), `ChartDatesControl.tsx`, `docs/plans/search-filters.md`.

### Filters and hidden results

**Purpose:** why results are missing, and how to get them back. The most likely reason someone
opens Help.

**Draft:**

Some results are hidden until you ask for them, with the boxes under **Include**. Each box
shows how many results it is hiding.

| Box | Hides by default | On |
| --- | --- | --- |
| **OTC drugs** | Over-the-counter products | both searches |
| **Sample packages** | Packages marked as samples, not for sale | FDA |
| **Results without prices** | Products and packages with no NADAC price in your dates | FDA |

Over-the-counter drugs are hidden because most people come for prescription prices. A search for
"ibuprofen" or "nicotine" looks empty until you tick **OTC drugs**. When filters hide everything, the
empty table says what was hidden and offers a button to show it.

**Brand / generic** (NADAC search) narrows to brand or generic drugs, using NADAC's own
classification.

**More filters** has lists built from your results: Drug and Pricing unit on NADAC; Product NDC,
Dosage form, Route, Labeler and Pricing unit on FDA. Untick a value to hide it. **Clear
filters** puts everything back.

Filters never change a pinned chart.

**Check:** the box labels come from `includeLabel` in `library/searchToasts.ts`; recheck if
they change.
**In context:** the empty-table hint already does this job; link it to this page.
**Source:** `AGENTS.md` (Search criteria), `docs/plans/search-filters.md`, `FdaSearchPanel.tsx`.

### The results table

**Purpose:** read the columns, and get from rows to a chart.

**Draft:**

Each row is one NDC on NADAC search, and one product or one package on FDA search.

- **Latest Price** is the most recent price in your dates, with its unit. **Min Price** and
  **Max Price** are the lowest and highest in your dates.
- On an FDA product row, the price is the average of the product's packages. Most products
  price every package the same, so the average is simply the price.
- **Mixed units** means the product's packages are priced in different units (for example a
  packet per each and a tub of powder per gram), so there is no single price to show. Switch to
  **Package** to see each one.
- Sorting a price column groups by unit first, so per-tablet and per-millilitre prices aren't
  ranked against each other.
- Tick rows and choose **Chart selected** to chart just those. A row with no prices can't be
  ticked.

**Check:** whether an Average column is wanted (the user-testing notes ask for one; it was left
out on purpose). Known gap: the column menu's number filters ignore units (docs/future-work.md).
**In context:** a "?" on the "Mixed units" cell.
**Source:** `AGENTS.md` (Result tables), `priceColumns.tsx`.

### Charts

**Purpose:** read a line chart and a bar chart, and use the readout.

**Draft:**

**Line charts** show price over time. The line moves in steps because a price holds until the
next weekly file. A gap at the start or end means the drug had no price in those weeks.

When a line stands for a product with several packages at different prices, it shows their
average, and a shaded band shows their lowest to highest price that week.

**Bar charts** compare drugs side by side, sorted by price. Switch between **Latest** price and
the **Average** over the chart's dates. Each row also shows the low-to-high range over those
dates.

**The readout** is the box above the plot. Move the pointer over the chart, or touch it, and
the readout shows the values at that date. Click or tap to **lock** a date so you can scroll the
readout; click again, press Esc, or use **Unlock** to release it.

**The legend** hides and shows lines. Colors stay with their drug when you filter.

Charts never put two units on one axis. A chart with drugs priced per tablet and per millilitre
is drawn as two charts, each labelled with its unit.

The price axis doesn't start at $0 on line charts, so small changes are visible, but it is
limited so a small change can't be made to look dramatic.

**View data** under any chart shows its numbers as a table, and **Download CSV** saves them.

When a search finds too many drugs to chart at once, the charts aren't drawn automatically.
Narrow the search, or tick rows and use **Chart selected**.

**Check:** the auto-chart limit (8 series) and whether to state it.
**In context:** a "?" by the band's caption.
**Source:** `client/CHARTS.md`.

### Price changes

**Purpose:** what the price-change cards are and when to distrust them.

**Draft:**

When a package's price moves 10% or more from one week to the next, within your dates, the app
flags it and draws a card showing the months around the change, with the old and new price
marked. Each card can switch to the full history.

If a search has many flagged changes, the page gives the count and asks you to narrow it,
instead of drawing them all.

A flag is arithmetic, not news. See "Five ways a price can mislead" before reading much into
one, especially for generics in 2024.

**Check:** the limit (9 cards) and the window (3 months either side); state them or not.
**Source:** `client/CHARTS.md`, `flagNadacPriceChange.ts`, `library/constants.ts`.

### Pinning and comparing

**Purpose:** the workflow the workspace exists for.

**Draft:**

**Pin** copies a chart into the Pinned section at the bottom of the page. A pinned chart is a
snapshot: new searches, filters and dates don't change it. That lets you search for one drug,
pin it, search for another, and compare.

On a pinned chart you can:

- change its **dates** from the dates chip, without affecting anything else;
- turn on **Match scale** from its menu, so the matched charts in the same unit share one price
  axis. Leave it off for drugs at very different prices, or the cheap one becomes a flat line;
- see where it came from: the chip under the title names the search, how many of its results
  the chart shows, and "filtered" if filters were on.

Try it: pin NovoLog, search Fiasp, pin that, and match their scales. They are the same insulin
from the same maker, and one cost four times the other until 2026.

**Check:** the example against current data; menu and chip wording against the app.
**Source:** `client/CHARTS.md`, `reporting/FINDINGS.md` (Insulin chart idea).

### Tabs and your saved workspace

**Purpose:** what is saved, where, and how to lose it.

**Draft:**

The Workspace holds tabs, each with its own search and pinned charts. Tabs are named after
their first search, and you can rename them.

Your workspace is saved in this browser, on this device. Nothing is sent to a server, there is
no account, and it won't follow you to another browser or phone. Clearing your browser's site
data deletes it.

- Closing a tab deletes its pinned charts.
- **Clear workspace** deletes every tab and starts over. It asks twice.
- If you open the app in a second window and change something there, the first window stops
  saving and asks you to reload, so the two don't overwrite each other.

**Check:** whether the standalone NADAC and FDA search pages (outside the Workspace) need their
own mention; they save their state too.
**Source:** `AGENTS.md` (Workspace, Persistence).

### Settings

**Purpose:** the two preferences.

**Draft:**

Settings (the gear, or Settings in the Workspace menu) apply at once and are saved in this
browser.

- **Color mode:** Dark or Light.
- **Bar chart style:** **Dot and range** marks each price with a dot on an axis fitted to the
  data, which shows small differences. **Bar and range** draws bars from $0, which shows true
  proportions.

**Source:** `SettingsPanel.tsx`, `client/CHARTS.md`.

### Keyboard and screen readers

**Purpose:** how to use the charts without a pointer.

**Draft:**

- Tab to a chart, then use ← and → to move one week at a time. The values are read aloud after
  you pause.
- Enter or Space locks the current point; Esc unlocks.
- On bar charts the arrows run the other way: → moves up a row and ← moves down.
- Every chart has **View data**, a plain table of the same numbers, and a CSV download.
- Each card can be collapsed from its heading.

**Check:** with VoiceOver before publishing. The reversed bar-chart arrows are a known
limitation of the charting library (docs/future-work.md).
**Source:** `client/CHARTS.md` (Accessibility), `docs/future-work.md` (Chart keyboard shortcuts).

### Five ways a price can mislead

**Purpose:** the page that makes the app trustworthy. Each item is a real case from the data.

**Draft:**

1. **An average can move when no price did.** A product row or a brand-wide average shifts when
   a new strength or package joins it. Austedo's average doubled in two years while each tablet
   rose about 5%, because higher strengths launched. Look at packages, not averages, before
   calling something a price change.
2. **A unit is not a dose.** Per millilitre, one Zepbound pen looks nearly half the price of
   another; per dose the gap is smaller. Per-tablet prices hide that one tablet may be a day's
   dose and another a week's.
3. **Generic prices in 2024 swing on their own.** CMS widened its pharmacy survey in April 2024,
   and five weekly files that year moved thousands of generic prices by more than 25%, up and
   down. Since December 2024 CMS has smoothed generics with a three-month average.
4. **A new package can look like a price jump.** New NDCs sometimes appear for a week at one
   price class and are then reclassified. A new Dilantin package showed a "+1,000%" change that
   was a correction, not a price rise.
5. **List price is not the price paid.** NADAC follows what pharmacies are invoiced. Medicare's
   negotiated prices and manufacturer discount programs for patients don't appear in it: the
   2025-2026 GLP-1 cash-price deals left Ozempic's and Wegovy's NADAC flat.

**Check:** every figure against current data; decide how much news context (negotiation, deals)
belongs in Help, since it dates quickly and needs citations.
**Source:** `reporting/FINDINGS.md`.

### Things to try

**Purpose:** show what the app is for, with searches that work.

**Draft:**

| Search | Where | What you'll see |
| --- | --- | --- |
| `eliquis` | either | Flat for years, then a 43% drop in January 2026 when the list price was cut |
| `dapagliflozin` | NADAC | A generic's first weeks: priced near the brand, then down 98% in one week |
| `lantus` | NADAC | The 2024 insulin list-price cuts: down 78% overnight |
| `fenofibrate` | NADAC | Nine strengths from $0.07 to $16.76 a tablet; the odd strengths cost the most |
| `metformin hcl 750` | NADAC | The same strength, 278 times the price, depending on the form |
| `cholestyramine` | FDA | Products priced in two units, shown as "Mixed units" |
| `nicotine` | NADAC | Nothing, until you tick OTC drugs |

**Check:** each one in production before publishing, and again when the data moves on. If
linkable searches are built (docs/future-work.md), each row becomes a link that opens the search.
**Source:** `reporting/FINDINGS.md`, `reporting/TEST_DRUGS.md`.

### Glossary

**Purpose:** one-line definitions, linked from the other pages.

**Draft:**

- **As-of date:** the week a price belongs to; the date of its NADAC file.
- **Brand / generic:** NADAC's classification of a drug for pricing. Brand includes brands sold
  under a generic approval and biologics.
- **CMS:** Centers for Medicare & Medicaid Services, which publishes NADAC.
- **Dosage form:** tablet, capsule, cream, solution and so on.
- **Labeler:** the company whose code begins the NDC: a manufacturer, repackager or distributor.
- **NADAC:** National Average Drug Acquisition Cost. What retail pharmacies pay, on average, per
  unit.
- **NDC:** National Drug Code. Identifies labeler, product and package.
- **OTC:** over the counter; sold without a prescription.
- **Package:** one container of a product, such as a bottle of 60.
- **Pricing unit:** what a price is per: EA (each), ML (millilitre) or GM (gram).
- **Product:** one drug at one strength in one form from one labeler.
- **Proprietary name:** the brand name. **Non-proprietary name:** the generic name.
- **Route:** how a drug is taken: oral, topical, subcutaneous and so on.
- **Sample package:** a package the FDA lists as a sample, not for sale.

**Source:** the pages above; `AdvancedFdaSearchRequest.cs` and the result tables for field names.

### Troubleshooting

**Purpose:** the short answers.

**Draft:**

- **No results.** Check the spelling (there is no correction), try fewer letters, and look for
  a "hidden" count beside the checkboxes. Then try the other search.
- **Search is greyed out.** You need 5 characters, or the results on screen already match what
  you typed.
- **A drug I know exists has no prices.** It may not be sold through retail pharmacies, or
  NADAC doesn't survey it. Tick **Results without prices** on FDA search to confirm it is in
  the directory.
- **The price looks far too low or too high.** Check the unit. Per tablet, per millilitre and
  per gram are very different numbers.
- **The page says to reload, and nothing saves.** The app is open in another window that
  changed your workspace. Reload this one.
- **My tabs are gone.** The workspace is stored in this browser only. Another browser, a
  private window, or cleared site data starts empty.
- **The site is slow on a big search.** Common drugs return thousands of prices. Shorten the
  dates or be more specific.

**Source:** `AGENTS.md`, `reporting/TEST_DRUGS.md`.

### Sources and disclaimer

**Purpose:** attribution and limits. Mostly exists already in About.

**Draft:** reuse About's "Attributions" paragraph and its two source links (CMS NADAC, FDA NDC
Directory) unchanged. Add a link to CMS's NADAC methodology document for readers who want the
survey details.

**Check:** the methodology document's current URL.
**Source:** `About.tsx`.

## Found while drafting

Not Help content, but worth fixing where they live:

- Fixed 2026-11-13: the Welcome text's labeler name, strength and product-code length, the
  tab creator's "Acquisition", and `reporting/TEST_DRUGS.md`'s brand-name-only note.
- `OnBoarding.tsx` says the FDA directory holds products "currently on the market" and that the
  tool has "many prescription drugs and over the counter products"; with OTC now hidden by
  default, the Welcome page should say so.

## Open questions for the author

1. Modal with pages, a `/help` route, or both?
2. Are "?" links beside controls in scope, or table of contents only to start?
3. How much pricing news (Medicare negotiation, list-price cuts, GLP-1 deals) belongs in Help?
   It is the most interesting content and the fastest to go stale.
4. Should "Things to try" wait for linkable searches, so each row opens its search?
5. Should Help show live facts (latest loaded week, first week of history) from `app-init`?
