# Browser usability plan

Started 2026-11-13. Source and decision register:
[docs/reviews/2026-11-13-browser-review.md](../reviews/2026-11-13-browser-review.md).

All four stages were settled with the author on 2026-11-13 and are written below as decisions.
Stage 1 goes first. Items marked *open detail* are for the implementer to raise, not to decide
alone. The stages are a sequence, not PR boundaries. D1–D8 and R1–R11 refer to the review.

Help is not part of this plan. Topic-based help, its modal and routes, and its content are in
[help.md](help.md), which another branch is implementing. The two plans touch in three
places, each noted where it applies: the bar, Help index and welcome links (Stage 1), the fixed
results example for help (Stage 2), and the help articles on charts and price changes (Stage 3).

## Intended experience

Search → inspect results and price changes → choose charts → carry useful work into Workspace.
Preserve the current docked readouts, pricing-unit separation, UTC date handling, snapshot
semantics and consistent FDA/NADAC presentation. The collection workspace is a later design
decision; near-term improvements should not depend on completing it.

## Stage 1 — Rework the app bar and navigation

This goes first. Today the bar (`Components/DrugPricingBar/`) is one row at every width:
NADAC, FDA, Workspace and About links (`NavButton`) and a Settings gear. Help opens only from
the workspace drawer. The two search pages are torn down when you leave them, and `AppShell`
(`App.tsx`) renders the bar twice, once for the workspace and once as the routes' layout.

### The bar

One top row at every width, and no bottom navigation: on a phone the bottom of the screen
already holds the workspace's floating buttons, and charts need the height.

- **The app name links to the welcome page**, which is the app's home. On phones, where the
  name is hidden, a home icon takes its place.
- **Search and Workspace** are the only destinations, with the current active marker.
- **Help and Settings** are icon buttons at every width, each with an accessible name and a
  tooltip. Help opens the existing global Help modal.
- **About leaves the bar.** It is reached from the welcome page and from the Help index. The
  page and `/about` stay.

### One Search area, kept mounted

- **Addresses:** `/search/fda` and `/search/nadac`. `/search` goes to the source used last,
  or FDA when there is none. `/fda-search` and `/nadac-search` redirect.
- **Both sources stay mounted** once visited, the hidden one out of view, so switching is
  instant and loses nothing: selection, scroll, table sort and page, unsubmitted text, and
  (after Stage 3) which Compare cards are showing. A source is mounted the first time it is
  visited, so someone who only uses one never loads the other.
- **Search stays mounted when the user goes to Workspace, About, Welcome or a help page**,
  as the workspace already does.
- **The workspace's rules for hidden tabs apply to a hidden search page**: it does not
  re-render when another page is shown, it shows no toasts while hidden
  (`PageVisibleContext`), it runs its search only when first shown, and it is hidden with
  `content-visibility: hidden` so its charts see no resize. Reuse those pieces; don't build a
  second mechanism.
- Persistence is unchanged: each source keeps its `STANDALONE_TAB_IDS` state, and a fresh
  load restores it as now.
- **The FDA / NADAC selector** is a two-option toggle at the top of the Search page, directly
  above the fields, with both names always visible, in both panel layouts. It is navigation
  between the two addresses, not a search field, and it is not in the bar. Workspace search
  tabs don't show it.
- **The last source is remembered** app-wide, so `/search` and the bar's Search link return
  to it after a fresh load. *Open detail:* where it is stored (it is state, not a preference,
  so probably its own validated key and not `settings`); `pruneStoredState` must keep it.

### Landing

- The bare address and any unknown address go to **Welcome on a first visit and Search
  afterwards**. "First visit" is "no last source remembered", so the welcome shows until
  someone has opened Search once. Don't infer it from the workspace's saved state, which is
  written on the first load.
- **Default source: FDA**, when there is no last source. Brand and generic names are how
  most people think of a drug.

### When FDA search comes up empty

NADAC holds more than FDA search can show: about 15% of the packages priced in the last year
have no listed FDA match (4,929 of 33,504, in the report under `reporting/`). Defaulting to
FDA makes that more visible, so:

- When an FDA search finds nothing, or nothing with prices, its empty state offers the same
  terms in NADAC search with one click. Both sources are mounted, so this fills NADAC's
  Description and runs it. *Open detail:* what happens when the term is shorter than NADAC's
  minimum length (fill it without running is the candidate).
- Explaining the two datasets properly is help's job ("Which search to use" in the help
  content) and stays out of this stage.

### Welcome

A short home page at `/welcome`, replacing the onboarding text shown there today. Copy:
[docs/content/welcome.md](../content/welcome.md). One sentence on what the app is, two buttons
("Find a drug", "Open workspace"), a few one-line ideas that each link to a help topic, and
quiet links to "What is NADAC?" and "About this project". Buttons, not a search box. It is
also what a portfolio visitor sees first now that About is out of the bar.

### For the help plan

These touch [help.md](help.md), which another branch owns; they are noted here, not edited
there.

- Its step 3 ("add a labeled Help action to the shared app bar") is covered by this stage's
  Help icon and should not add a second button. If help ships first, its button moves into
  the reworked bar here.
- The Help index should carry entries for Welcome and "About this project".
- The welcome page's idea lines link to help topics by ID; until those topics ship, they open
  the Help modal as it is.
- With Search kept mounted, opening `/help` in the same tab no longer costs the search page
  its state, which was one of that plan's reasons for a modal-first design. That is its call.

### Acceptance

- One row that never wraps at phone width; the active destination is evident in both themes;
  Help, Settings and home are reachable from every route by keyboard and touch.
- Old search addresses load the right source. Back and forward move between sources.
- Switching source, or visiting Workspace and returning, loses no search, filter, pin,
  selection, scroll position or unsubmitted text.
- A hidden search page does not re-render on a switch and shows no toasts until shown.
- A first visit lands on Welcome; a later visit lands on the last source.
- An empty FDA search offers NADAC, and one click runs it there.
- The phone drawer still closes before a modal opens.

## Stage 2 — Make results easier to inspect

Add a visible, labeled Columns action and Reset columns to both search pages' results, in the
same place on each (D1). MUI Data Grid's community columns panel does this; the shared
`ResultTable` has no toolbar today.

Default columns, in order after the selection checkbox:

| Table | Default columns |
| --- | --- |
| FDA products | Product NDC, Latest Price, Brand Name, Strength, Price Activity, Form, Latest Price Date |
| FDA packages | Package NDC, Latest Price, Brand Name, Strength, Package Description, Price Activity, Latest Price Date |
| NADAC | NDC, Latest Price, Description, Price Activity, Latest Price Date |

- Price Activity is built in Stage 3 and joins the defaults then.
- **Strength is new on the package table** (from the package's product) and shown by default:
  without it two strengths in the same pack size differ only by NDC. The product table already
  has it, joining multi-ingredient strengths with commas. NADAC's Description carries it.
- Generic Name is hidden by default. Everything else stays in the Columns tool: Min and Max
  Price, Generic Name, Labeler, Route, OTC, Sample, Packages, and Product NDC on the package
  table.
- Latest Price stays second (the phone rule in AGENTS.md).

Column choices are saved in Settings (`library/settings.ts`), once per table type, so they
apply on both search pages and in every workspace tab and follow other windows. Save the
**hidden** columns, not the visible ones, so a column added to the defaults later appears for
people who already customized.

NDCs (R4): tabular digits, widths sized to the identifier, the whole identifier on one line,
never truncated. FDA keeps its dashed source form; NADAC keeps its stored form.

Not in this work: a per-row details view for phones. The grid's detail panel is a paid MUI
feature, so it would be a custom drawer with its own control on every row. Lean defaults and
the Columns tool cover phones for now (see Later design work).

Acceptance: both search sources share the control placement; complete identifiers and units
remain accessible; Latest Price is visible at phone widths; keyboard column selection works;
Reset restores the defaults above; a choice made on one page shows on the other and survives
a reload.

Help's labeled fixed example that uses the actual results component belongs to the help plan
([help.md](help.md) step 6). It should wait until this stage's table has shipped, so the
example shows the table users will see.

## Stage 3 — Make charts intentional while preserving discovery

Prerequisite: land "Mixed units become separate cards" from docs/future-work.md first, as its
own change. Both rewrite the code that creates charts.

### How charts are made

Two rules, both of which exist today (they resolve D7 and D8):

- **Selected rows pin directly.** Select rows, then Line or Bar: a pinned snapshot, as now.
  This workflow is preserved; there are no per-row chart buttons.
- **"Compare latest prices" and "Compare price histories" show or hide the two overview
  cards.** They are the existing system cards: live, following the search and filters, with
  the existing Pin button to snapshot them. The change is that they start hidden. Each button
  is a toggle, so a repeat click can't duplicate. Shown cards stay shown across searches
  until hidden; the state isn't saved, so a reload starts hidden (like collapse state).
- The series cap stays (`MAX_AUTO_CHART_SERIES`, 8): above it a Compare button is disabled and
  says why, pointing to row selection.

The automatic price-change cards go away (`PriceChangeCards`, `MAX_AUTO_PRICE_CHANGE_CHARTS`).
The Price changes section and chart callouts below replace them.

### Price changes section

A compact section on both pages listing the significant changes in the result: a single
week-to-week change of 10% or more per package (`flagPriceChanges`, unchanged), within the
search dates and the current filters, and labeled as such.

- Each entry gives the date, the percent, the old → new price with its unit, and the packages
  affected. Changes on the same date may be grouped ("6 packages dropped about 43% on Jan 14"),
  with each package's exact values still reachable. *Open detail:* the grouping rule (same
  date and direction is the minimum; rounded percentages alone are not enough) and how many
  entries show before the list is cut.
- Its action is **"Select affected rows"**: it adds those rows to the selection and sorts the
  table by Price Activity so they are in view. It creates no chart; the user adjusts the
  selection and uses Line or Bar. Say how many rows were selected.
- **At product level** the affected things are packages, which aren't rows. The action there
  reads **"Show affected packages"**: it switches Detail Level to Package and selects them.
- The search toast keeps "N found" and drops its price-change part (`SearchResultToast`).

### Change callouts on line charts

Today a chart holds one stored `changeSpan`, drawn only on single-package price-change cards.
Callouts become general:

- **Any line chart marks the significant changes of the series it draws**, in the dates it
  shows. They are derived when drawing from the prices the chart already holds, not stored.
  Existing pins gain them, and widening a chart's dates reveals earlier ones. Pins with a
  stored `changeSpan` keep working.
- **A toggle, "Show price changes", in the pinned card's menu** (beside Match scale), saved on
  the item, on by default. Live Compare cards always show them and get no menu.
- **One label per date on a multi-series chart.** Each series keeps its dots and dashed old
  price; the date gets one pill: the prices when the series agree, otherwise a count
  ("6 changes"), with exact values in the readout.
- **A product line never gets a callout from its own average**, which can jump when a package
  joins or leaves. When one of its packages had a significant change in the dates shown, the
  line gets a marker at that date saying so ("2 of 3 packages changed"), without old → new
  prices; those are in the readout and at Package level.
- Line charts only. Bar charts have nothing to mark.
- A chart made from selected rows opens on the search dates like any other. "Around change"
  stays a preset in the dates picker. *Open detail:* which change the preset centers on when
  a chart has several.

### Price Activity column

One column on all three tables: a small sparkline beside a text label, sortable.

**States**, judged per package over the dates shown, per pricing unit:

| State | Rule | Label |
| --- | --- | --- |
| Stable | Lowest and highest price within 5% of each other | "Stable · no change" or "Stable · within 2%" |
| Changed | Range of 5% or more | one of the three below |
| Insufficient history | One observation | "1 observation · Jun 30" |

- The measure is the **range**, (max − min) / min, not the largest weekly step or the
  start-to-end change. It is never smaller than either, so a dip or spike that returns counts
  as Changed, and so does a slow drift.
- The band is one named constant, 5%. The existing 10% weekly threshold stays as "significant".

**Changed labels:**

- A significant week exists: the largest one, "Dropped 25% on Apr 1", then "· 2 more" when
  there are others.
- No significant week, and it ended somewhere else: the net, "Up 14% over 52 weeks".
- No significant week, and it ended within the band of where it started: where the low or
  high was, "Dipped 8% in April" or "Spiked 8% in April".

"Largest" is ranked by dollar amount, the earlier one winning a tie, so a drop and recovery
($8 → $6 → $8) is labeled as the drop. Show the dollar change beside the percent: percentages
on very cheap drugs are inflated (88 packages are under one cent a unit). No price floor hides
those rows.

**Gaps:** keep comparing consecutive observations however far apart, as `flagPriceChanges`
does. When they are more than a week apart, word it as a span ("between Mar 4 and Apr 8"),
in labels and callouts. Gaps are rare (129 of 1.57 million in a year), so the label carries no
coverage count. This replaces the earlier draft's "do not calculate events across gaps".

**Product rows** are classified from their packages, never from the averaged line: Stable
only when every package is. Packages with one observation are left out of that rule, and a
product is Insufficient history only when all its packages are. Measured this way, 16% of
products are Stable over 12 months (77% of brand products, 9% of generic), close to the
package share because 69% of products have one priced package; it falls to 6% for products
with 5–9 packages. *Open detail:* the product label's wording when packages differ
(candidate: "1 of 3 packages dropped 25% on Apr 1") and which line its sparkline draws.
Mixed-unit rows show "Mixed units" as the price columns do.

**Sparkline:** a step line over the dates shown, small enough to sit beside the label at
normal row height. It is an attention cue, not the analysis. Each row has its own vertical
scale, under `MAX_AXIS_EXAGGERATION`, so a 43% drop fills it and a 0.5% change is nearly
flat. Dates are proportional. It has an accessible text equivalent (the label). Build it
tight, try it on a phone both shown and hidden, and let the author choose.

**Sorting, not filtering:** the column sorts significant weeks first, then other Changed
rows, then Stable, then Insufficient history, largest first within each. A plain line above
the table gives the counts at the current level ("12 packages: 3 with significant changes,
5 changed, 4 stable"). There is no activity filter in this version: it would be a third way
to hide rows, outside the search panel.

**Why 5%:** measured on the dev database (12 months to 2026-11-11, 33,411 packages), in
[reporting/NADAC_PRICE_VARIATION.md](../../reporting/NADAC_PRICE_VARIATION.md) (PR 31 at the
time of writing; its SQL regenerates every figure here). Stable at 5% covers 16% of packages: 76% of brands, 11% of generics. The
median generic ranges 16% in a year, so most generic rows read Changed, which is accurate;
the label's size and the sort tell them apart. 10% would call most brand price increases
Stable. 84% of the weekly changes that happen at all are under 5%. Of the Changed packages,
about 6,500 had a significant week, 14,800 ended somewhere else and 6,900 ended near where
they started, so all three labels are common. The share depends on the window (82% Stable
over 1 month, 49% over 3, 16% over 12), so the count line names the dates it covers.

**The comparison at the cutoff** (from the report's "Where the 5% comparison runs"): decide
the state on the range **rounded to 0.1%**, Changed at 5.0% or more
(`Math.round(range * 1000) / 1000 >= 0.05`). The database computes the range exactly but the
client computes it in doubles, where `(0.21 - 0.2) / 0.2` is just under 0.05; many brands
took a list rise of about 5%, so the raw comparison splits them on floating-point error.
Rounded to 0.1%, doubles and exact arithmetic agree for every package measured. Don't round
to a whole percent to decide the state (it moves 530 packages and is itself fragile at 4.5%).
The Stable label may show a whole percent, rounded **up** ("within 5%" for 4.6%), so it is
never false and never shown on a Changed row.

### Building and testing it

Classification, labels, sort order, callout derivation and the per-date grouping are pure
functions in `src/library/` with tests: stable at exactly the band, drop and recovery, slow
drift, one observation, a gap, a sub-cent price, mixed units, and a product whose packages
disagree. Reuse `seriesByDate` and `flagPriceChanges`; don't add a second price math.

Acceptance: Eliquis's related drops are discoverable without six automatic charts, and
"Select affected rows" then Line gives one chart with them called out; events and states
respect search dates and filters; no mixed-unit figures; saved pins are unchanged by later
searches and old pins still draw; both search pages behave the same.

The help articles on charts and price changes describe the app as shipped
([help.md](help.md), "Content preparation"). They need revising when this stage ships.

## Stage 4 — Carry a search into Workspace

Decided: build it, after Stage 3. The workspace redo has no date, so the bridge is worth
having even though tabs-as-searches is not the long-term model (D5).

"Add search to workspace" on a standalone search page creates and opens an independent
search tab with the applied terms, dates and refinements, FDA detail level and pinned
snapshots. The standalone page keeps its own state.

- Mechanism: a tab's provider loads its saved state once on mount, so write the new tab's
  state (`drugpricing.v<VERSION>.tab.<tabId>`) and then add the tab. The query key is the
  loaded criteria, so the results come from the cache within the stale time; don't promise
  that no request occurs.
- Enabled only for a search that loaded successfully. Unsubmitted text edits don't transfer.
  Selection and scroll don't transfer.
- No "N found" toast for the copy (as for a restored tab).
- Disabled when this window is read-only because another window wrote the workspace.
- A double click doesn't make two tabs; a deliberate second click later may.
- The workspace provider wraps the whole app and the workspace stays mounted (hidden) on
  every route (`AppShell` in `App.tsx`), so the page can add the tab directly.

Acceptance: the new tab initially represents the same applied search; subsequent edits are
independent; pins retain their own data/dates; reload restores the new tab using normal
persistence; tab switching retains existing rendering-performance guarantees.

## Later design work

- Row details on phones: a custom drawer showing everything about one row.
- An activity filter (only Changed, only Stable), if sorting proves not to be enough.
- Readout polish: test lock instructions, explicit locked status and overflow cues. Evaluate
  explanation placement separately from Latest/Average placement.
- Workspace collections: decide what users collect, how searches open/reopen, destination
  selection, and the relationship between saved snapshots and reusable search criteria.
  Collection tabs and an Add data panel are options, not settled architecture.

## Verification

Use focused library tests for changed state/data logic, then client build, lint and tests.
Review both sources at desktop and phone widths, with keyboard interaction. Include Eliquis
for repeated events, a broad generic search for density/performance, a brand search (mostly
Stable), mixed-unit data, no-price results and restored pins. Keep established provider
isolation and multi-window storage behavior.

## Still open

- The *open details* above: where the last source is stored, a too-short term in the FDA
  empty state's NADAC offer, event grouping and list length, the "Around change" preset
  with several changes, product-row label wording and sparkline.
- After building: whether the sparkline shows on phones (author's choice from the real thing),
  and whether 5% still reads right on real searches.

## What the rough mockup showed

A rough, throwaway mockup was made in conversation to give the basic idea of the activity
column, before the decisions above. Its screenshots were removed from the repo on purpose
(they are in git history under `docs/assets/browser-usability/`): it is not guidance for layout, styling, wording, sizes or
controls, and a control appearing in it settles nothing. Build with the existing MUI Data
Grid, shared components, theme roles, responsive conventions and the chart rules in
`client/CHARTS.md`. Its data was invented.

What it contained, top to bottom:

- A results heading with a context line: the source and level, the dates and the pricing unit.
- Four activity filters with counts: All, Changed, Unchanged, Insufficient history.
- One line summarizing a grouped event (“2 packages dropped 40% on Apr 1”, with the old and
  new price) and a single action button beside it.
- A table of five packages with Package NDC, Latest price, Drug and Price activity columns.
- In each Price activity cell, a small step sparkline above a text label and a second, quieter
  line. Changed rows: “Largest drop: 40%”, then the date and old → new price. The unchanged
  row: a flat line, “Unchanged”, and the number of weekly observations. The single-observation
  row: “Insufficient history”, the observation's date, and no sparkline.
- A footnote that the trends share dates but not vertical scales.
- A “Compare price histories” button under the table, and under that an inline chart preview
  with Pin and Close.
- A per-row chart button in a last column. This is superseded (see above): rows are selected
  and charted with the existing Line and Bar actions.

What it got wrong, each fixed by a decision in Stage 3:

- A row that dropped and recovered ($8 → $6 → $8) was labeled “Largest rise: 33.3%”, because
  the recovery is a larger percentage than the 25% drop. Labels now rank by dollars.
- Its filters, per-row chart buttons and inline preview with Close were not adopted: the
  column sorts, rows are selected, and Compare cards toggle.
- Its activity cell stacked the sparkline over the text and doubled the row height. The
  sparkline now sits beside the label at normal height.
