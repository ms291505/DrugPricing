# Browser usability plan — discussion draft

Started 2026-11-13. Source and decision register:
[docs/reviews/2026-11-13-browser-review.md](../reviews/2026-11-13-browser-review.md).

This is a plan to refine together, not authorization to implement. D1–D8 in the notes
are established direction and constraints. R1–R11 remain recommendations or open decisions.
The stages below are a proposed sequence, not agreed scope or PR boundaries.

## Intended experience

Search → inspect results and price changes → choose charts → carry useful work into Workspace.
Preserve the current docked readouts, pricing-unit separation, UTC date handling, snapshot
semantics and consistent FDA/NADAC presentation. The collection workspace is a later design
decision; near-term improvements should not depend on completing it.

## Stage 1 — Make results easier to inspect

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

## Stage 2 — Make charts intentional while preserving discovery

Decided (D8): replace automatic chart cards with explicit “Compare latest prices” and “Compare
price histories” actions, alongside existing selected-row chart actions and a compact Price
changes section with View chart. Users must recognize interesting movement and flat prices
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

## Stage 3 — Carry a search into Workspace

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

## Parallel track — Navigation, welcome and help

Propose one Search destination with an FDA/NADAC selector, preserving each source's state.
Keep existing search URLs working. Create the brief welcome already requested; settle its
calls to action alongside the chosen search flow. Propose topic-based help with a labeled,
fixed example using the actual results component.

Decide: navigation on phones, default source, returning-user landing behavior, help routes
versus modal, and About placement. Validate desktop and phone layouts before choosing.

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

A conversation mockup uses explicitly illustrative package data to show flat, falling,
recovering and single-observation rows. Summary filters, inline previews and mock Pin work
locally. Its optional sparklines can be toggled for comparison with text-only activity.
This is a contained results-section design, not a full app or implementation specification.
The mockup's Close preview control, exact counts/labels, grouping and chart lifetime are
proposals, not additional confirmed decisions. Sparklines must retain fittedPriceAxis rules
and proportional dates in implementation; labels and accessible summaries remain essential.

Next decisions: whether this combined column earns a default slot; whether summary activity
filters narrow only the table; and whether requested charts persist until dismissed or clear
when the applied search changes. Keep pinned snapshots independent in all cases.


## Selection workflow refinement and rough mockups

**Decided:** preserve the existing manual workflow: select table rows, then choose the Line
or Bar chart action. Do not replace it with per-row View chart buttons. Requested charts
remain inline, with the existing Pin behavior. This supersedes earlier mockup row actions
and the proposed direct View chart action in the price-change summary.

**Recommended for review:** a price-change summary offers “Select affected rows,” which adds
those rows to the selection without creating a chart. Users can adjust that selection and
use the same Line/Bar controls. The mockup clears its activity filter to reveal affected rows;
selection across filters and how that reveal works remain open implementation details.
Activity indicators and sparklines help users choose rows; they are not additional chart
creation controls. Automatic comparison shortcuts remain open and must not displace selection.

**Rough mockups, not a styling specification:** mockups and their screenshots illustrate
information hierarchy and interaction ideas only. Do not implement their styling exactly as
shown. Use the existing MUI Data Grid, shared components, theme tokens, typography, spacing,
responsive conventions and chart rules in `client/CHARTS.md`. Example prices, identifiers,
chart drawings and dimensions are illustrative, not production data or chart-math guidance.
A control appearing in a mockup does not settle an open decision.

Screenshot refresh is pending review of the selection-based revision. Existing captures in
`docs/assets/browser-usability/` show the superseded per-row chart actions and must not be
used as the current implementation reference; replace them after reviewing the revised mockup.
