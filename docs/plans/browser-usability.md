# Browser usability plan — discussion draft

Started 2026-11-13. Source and decision register:
[docs/reviews/2026-11-13-browser-review.md](../reviews/2026-11-13-browser-review.md).

This is a plan to refine together, not authorization to implement. D1–D8 in the notes
are established direction and constraints. R1–R11 remain recommendations or open decisions.
The stages below are a proposed sequence, not agreed scope or PR boundaries, with one
exception: the author decided on 2026-11-13 that the app bar rework comes first (Stage 1).

Help is not part of this plan. Topic-based help, its modal and routes, and its content are in
[help.md](help.md), which another branch is implementing. The two plans touch in three
places, each noted where it applies: the Help action in the app bar (Stage 1), the fixed
results example for help (Stage 2), and the help articles on charts and price changes (Stage 3).

## Intended experience

Search → inspect results and price changes → choose charts → carry useful work into Workspace.
Preserve the current docked readouts, pricing-unit separation, UTC date handling, snapshot
semantics and consistent FDA/NADAC presentation. The collection workspace is a later design
decision; near-term improvements should not depend on completing it.

## Stage 1 — Rework the app bar and navigation

Decided (2026-11-13): this goes first. Today the bar (`Components/DrugPricingBar/`) is one
row at every width: NADAC, FDA, Workspace and About links (`NavButton`) and a Settings gear.
It has no Help action; Help opens only from the workspace drawer.

Propose one Search destination with an FDA/NADAC selector inside Search, close to the fields,
with both source names always visible. The bar then holds Search, Workspace, a labeled Help
action and Settings. Keep `/nadac-search` and `/fda-search` working. Create the brief welcome
already requested (D3) once the Search destination is settled, since its calls to action
point there; `/welcome` exists today and renders the onboarding content.

Help action: the reworked bar includes it and opens the existing global Help modal. What
that modal shows is the help plan's work; [help.md](help.md) step 3 ("add a labeled Help
action to the shared app bar") is satisfied by this stage and should not add a second
button. If help ships before this stage, its button moves into the reworked bar here.

Decide:

- Phone layout: a compact header versus bottom navigation, with labels and adequate touch
  targets. Validate at desktop and phone widths before choosing.
- What "preserving each source's state" means. The standalone pages unmount on a route
  change; their criteria, detail level and pins come back from storage, and the search re-runs
  (from the query cache within its stale time). Selection and scroll position are not saved.
  Either accept that, or keep both sources mounted under one Search route, which is a larger
  change (hidden pages must then not re-render or toast, as in Workspace).
- The route shape: one `/search` route with the source in the path or query, or the two
  existing routes with a selector that links between them. The second is the smaller change.
- Default source, and where a returning visitor lands (the fallback route goes to `/about`
  today).
- Where About sits in the bar. The help plan keeps About separate from Help, so it is not
  folded into Help; it may leave the primary links for a quieter place.

Acceptance: one row that never wraps at phone width; the active destination is evident in
both themes; old search URLs load the right source; switching source loses no applied search,
filters or pins; Help and Settings are reachable from every route by keyboard and touch; the
phone drawer still closes before a modal opens.

## Stage 2 — Make results easier to inspect

Propose a visible Columns action, Reset columns, lean initial columns and readable full NDCs.
Keep Latest Price second or third. Start without sparklines; evaluate them after the table
layout is settled. Candidate defaults, excluding selection:

| Table | Proposed initial columns |
| --- | --- |
| FDA products | Product NDC, Latest Price, Brand Name, Strength, Form, Latest Price Date |
| FDA packages | Package NDC, Latest Price, Brand Name, Package Description, Latest Price Date |
| NADAC | Stored NDC, Latest Price, Description, Latest Price Date |

Other available columns remain selectable. Verify strength availability and useful rendering
for multi-ingredient products before promising a single Strength column.

Decide: defaults; whether visibility is remembered per table type across the app; how phone
users reach details without excessive horizontal scrolling. Recommendation: remember column
visibility per table type, with a clear reset, independently of individual searches.

Acceptance: both search sources share the control placement; complete identifiers and units
remain accessible; Latest Price is visible at phone widths; keyboard column selection works.

Help's labeled fixed example that uses the actual results component belongs to the help plan
([help.md](help.md) step 6). It should wait until this stage's table has shipped, so the
example shows the table users will see.

## Stage 3 — Make charts intentional while preserving discovery

Decided (D8): replace automatic chart cards with explicit “Compare latest prices” and “Compare
price histories” actions, alongside existing selected-row chart actions and a compact Price
changes section with View chart. (The View chart action was later superseded by “Select
affected rows”; see Selection workflow refinement below.) Users must recognize interesting movement and flat prices
without opening charts for each result. Apply this to FDA and NADAC.

Recommended details for the agreed Price changes section: date, affected packages, percentage
change, unit-aware old/new prices and View chart. Related events may be grouped, but exact
package values must remain available. Define grouping precisely before implementing it;
matching rounded percentages alone is insufficient.

Decided (D7, 2026-11-13): requested charts appear inline below results and use the existing
Pin action to keep snapshots while the workspace design remains open.

Still open: whether multiple requested charts coexist, their lifetime across searches and
filter changes, dismissal and repeat-click behavior. Inline placement does not by itself
settle these state rules or approve every proposed change to automatic chart creation.

Recommended activity presentation (not yet approved): a summary above the table counting
unchanged, changed and insufficient-history results, plus a compact per-row activity indicator.
Highlight significant events separately from ordinary changes. Count the current table's rows
(products or packages), state the level, and avoid presenting package-event counts as product
counts. A “Show changed” action should make inspection easy without hiding flat rows by default.

“Unchanged” means all observed prices are equal throughout the selected window, not merely
that the first and last prices match. One observation is insufficient history, not flat. Show
coverage limitations rather than implying unobserved dates were flat. Assess each unit
separately; product averages can conceal package movement, so expose underlying package
changes rather than labeling a product unconditionally unchanged. Preserve existing price
math and define activity classification before implementation. Sparklines remain optional;
activity discovery must not depend on adopting them.

Acceptance: Eliquis's related drops are discoverable without six automatic charts; events
respect search dates and filters; no mixed-unit figures; saved pins remain unchanged by
subsequent searches. Coordinate with the existing mixed-unit-card work in docs/future-work.md.

The help articles on charts and price changes describe the app as shipped
([help.md](help.md), "Content preparation"). They need revising when this stage ships.

## Stage 4 — Carry a search into Workspace

Candidate bridge: “Add search to workspace” creates and opens an independent search tab.
Copy applied terms, current dates/refinements, FDA detail level and pinned snapshots. Preserve
the standalone page. Reuse available query data when possible; inspect provider initialization
and query keys before promising that no request will occur.

Decide: whether to build this bridge before the workspace redesign; selection and scroll
transfer; behavior during loading/errors; repeat clicks. Recommendation: enable it for a
successfully displayed search, transfer no unsubmitted text edits, and prevent double-click
duplication without prohibiting deliberate independent copies.

Acceptance: the new tab initially represents the same applied search; subsequent edits are
independent; pins retain their own data/dates; reload restores the new tab using normal
persistence; tab switching retains existing rendering-performance guarantees.

## Later design work

- Trends: select a change metric, define missing/short-history behavior, respect the shared
  date window and axis rules, and evaluate mobile space before adding a default column.
- Readout polish: test lock instructions, explicit locked status and overflow cues. Evaluate
  explanation placement separately from Latest/Average placement.
- Workspace collections: decide what users collect, how searches open/reopen, destination
  selection, and the relationship between saved snapshots and reusable search criteria.
  Collection tabs and an Add data panel are options, not settled architecture.

## Verification when implementation is authorized

Use focused library tests for changed state/data logic, then client build, lint and tests.
Review both sources at desktop and phone widths, with keyboard interaction. Include Eliquis
for repeated events, a broad search for density/performance, mixed-unit data, no-price results
and restored pins. Keep established provider isolation and multi-window storage behavior.

## Next discussion

The app bar comes first: settle Stage 1's decisions (phone layout, route shape, what state
survives a source switch) before the rest.

Chart destination and replacement of automatic charts are settled (D7–D8). Next settle the
activity summary and row indicators, including unchanged versus insufficient history and what
counts as significant. Then define the lifetime and dismissal of requested, unpinned charts.


## Refinement — combined Price activity column (2026-11-13)

Working design for review: combine the visual trend and its short text interpretation in one
column, rather than separate indicator and sparkline columns. Icons alone are insufficient:
an arrow does not say whether it represents net, latest or largest change. Use explicit labels.

- Changed rows: step sparkline plus largest observed weekly rise/drop, date and exact prices.
  Net change is not the primary label: it can hide a drop followed by recovery.
- Unchanged rows: explicit text and observation count, optionally a quiet flat sparkline.
- Insufficient history: explicit text and coverage; no flat-looking placeholder chart.
- Summary filters count rows at the current FDA detail level or NADAC result level and offer
  All, Changed, Unchanged and Insufficient history. Changed includes small movements, not
  only events exceeding the significant-change threshold.
- Significant events remain a separate compact discovery section. Filters and event summary
  must have clearly defined scope: recommendation is to keep discovery based on the full
  refined search while activity filters affect the results table only. Label that scope.
- For incomplete coverage, distinguish unchanged observed prices from a fully covered flat
  period. Missing weeks must not imply zero change; do not calculate weekly events across gaps.
- Product rows require a separate design pass: package changes may cancel in an average.
  Candidate label: “Average unchanged · package changes”; never hide underlying events.

A rough mockup explored this column; it is described under “What the rough mockup showed”
below. Sparklines must retain fittedPriceAxis rules and proportional dates in implementation;
labels and accessible summaries remain essential.

Next decisions: whether this combined column earns a default slot; whether summary activity
filters narrow only the table; and whether requested charts persist until dismissed or clear
when the applied search changes. Keep pinned snapshots independent in all cases.


## Selection workflow refinement

**Decided:** preserve the existing manual workflow: select table rows, then choose the Line
or Bar chart action. Do not replace it with per-row View chart buttons. Requested charts
remain inline, with the existing Pin behavior. This supersedes the mockup's per-row chart
buttons and the proposed direct View chart action in the price-change summary.

**Recommended for review:** a price-change summary offers “Select affected rows,” which adds
those rows to the selection without creating a chart. Users can adjust that selection and
use the same Line/Bar controls. Selection across filters, and how affected rows hidden by an
activity filter are revealed, remain open implementation details. Activity indicators and sparklines help users choose rows; they are not additional chart
creation controls. Automatic comparison shortcuts remain open and must not displace selection.

## What the rough mockup showed

A rough, throwaway mockup was made in conversation to give the basic idea of the activity
column. Its screenshots were removed from the repo on purpose (they are in git history under
`docs/assets/browser-usability/`): it is not guidance for layout, styling, wording, sizes or
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

Questions it raised, all open:

- A row that dropped and recovered ($8 → $6 → $8) was labeled “Largest rise: 33.3%”, because
  the recovery is a larger percentage than the 25% drop that caused it. Picking the largest
  change by percentage favors rises; the label rule must handle a drop and recovery.
- The event summary listed the 40% drop but not that row's 25% and 33% changes. Which events
  the summary lists, and how many, is undefined.
- The activity cell made rows about twice the usual height and sat fourth, so a phone would
  not show it without scrolling sideways.
