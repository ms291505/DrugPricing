# Browser review ideas

Review started: 2026-11-13

App: <https://drugpricing.mikesteiner.info>

## Scope

Explore the live app together and record improvement ideas. This is a discussion log,
not authorization to implement changes. Only this Markdown document is being edited.
Existing plans and ideas are in [docs/future-work.md](../future-work.md); reference those when
an observation overlaps them.

## Review closeout — 2026-11-13

The annotation review is complete; planning continues in
[docs/plans/browser-usability.md](../plans/browser-usability.md). All 13 annotation texts and the full
conversation were reviewed. The chat reader returned placeholders for the original attached
screenshots; a fresh inspection of the live FDA Eliquis results confirmed the crowded table
and repeated automatic charts. Do not treat that inspection as recovery of the original images.

### Confirmed direction and constraints

- **D1 — Consistent search experiences:** FDA and NADAC must look and feel consistent;
  consider every shared improvement on both pages (comment 13).
- **D2 — Preserve the docked readout:** The author likes its appearance and behavior.
  Seek refinements rather than a replacement (comment 8).
- **D3 — Brief welcome:** Introduce the app's concepts without requiring a NADAC tutorial;
  the intended audience generally already knows NADAC (comment 3). Exact content and help
  structure remain open.
- **D4 — Search-to-workspace continuity:** Users should be able to carry work from standalone
  Search into Workspace without repeating the search (follow-up discussion).
- **D5 — Reconsider search-as-tab:** The author does not favor this as the long-term workspace
  model. Its replacement has not been selected (follow-up discussion).
- **D7 — Requested charts appear inline:** Charts users request appear below the results and
  use the existing Pin action to keep snapshots. This is the agreed near-term chart flow
  while the future workspace model remains open (planning follow-up, 2026-11-13).
- **D8 — Explicit charts with immediate price-activity discovery:** On both search pages,
  replace automatic charts with comparison buttons, selected-row chart actions and a compact
  Price changes section with View chart. Users must see interesting movement without
  investigating each result; flat prices over the selected period must also be easy to identify.
  The exact activity indicators, thresholds and grouping remain to be designed.
- **D6 — Planning only:** Discuss and document the design; no app implementation is authorized.

### Recommendations and open decisions

These are candidates for agreement, not approved implementation requirements.

| ID | Recommendation / open item | Status |
| --- | --- | --- |
| R1 | One Search destination with independent FDA/NADAC state | Proposed; navigation and default source open |
| R2 | Topic-based help with a real results-table example | Moved to [the help plan](../plans/help.md) |
| R3 | Visible Columns tool and lean defaults; omit OTC by default | Author-requested direction; exact defaults and persistence open |
| R4 | Compact, readable, complete NDCs | Problem confirmed; typography and sizing open |
| R5 | Optional table trends | Exploratory; metric, scales and mobile value open |
| R6 | Explicit chart creation instead of automatic charts | Agreed (D7–D8); chart lifetime and dismissal open |
| R7 | Persistent price-change summary with grouped package events | Summary and immediate movement/flat discovery agreed (D8); grouping and indicators open |
| R8 | Chart key below plot; Latest/Average near title | Assistant recommendation; placement remains open |
| R9 | Clearer lock instructions, locked state and overflow cues | Assistant recommendations; validate before adopting |
| R10 | Copy current search into an independent workspace tab | Author's near-term proposal; not yet selected for implementation |
| R11 | Collection tabs, Add data panel, recent searches and destination picker | Assistant proposals; future workspace model unresolved |

Temporary previews in Search and saved comparisons in Workspace received tentative support
("could work"), not final approval. Copying a search into a tab is an incremental bridge,
not a decision to retain search tabs permanently. The proposed phase order is also unapproved.

## Annotation details and rationale

The original observations and recommendations follow. Status is summarized above; wording
such as “Suggested direction” below does not indicate approval. Comment numbers refer to the
browser annotations supplied by the author on 2026-11-13.

### Navigation and one Search destination (comments 1–2)

**Author:** The current NavButtons feel dated, especially on mobile. Consider replacing NADAC
and FDA navigation destinations with Search and an FDA/NADAC toggle. Keep each search's data
and context during switches.

**Suggested direction:** Desktop navigation could use simple links for Search, Workspace and
Help, with a clear active indicator. On mobile, test a compact navigation bar with labels
and adequate touch targets. The source selector belongs within Search, close to the fields.
Keep the source names visible: FDA and NADAC search different datasets even though both show
NADAC prices. A short explanation can describe the coverage difference without a tutorial.
Preserve criteria, loaded results, selection and scroll position independently when switching.

**Open:** Mobile bottom navigation versus a compact header; whether About belongs inside Help;
which source opens first; how old search URLs continue working.

### Welcome page and reference help (comments 3–4)

**Author:** Create a simple welcome splash using existing onboarding content. Assume users
generally know NADAC. Offer an optional “What is NADAC?” path into help. Help could become a
reference guide with a table of contents and multiple topics. Include a real results table,
in addition to the existing explanatory demo table.

**Suggested direction:** A short welcome with “Find a drug” and “Open workspace” actions,
plus an optional NADAC explanation. Help topics: choosing a search source; products, packages
and NDCs; reading results; pricing units; chart readouts and controls; collecting comparisons;
data coverage and freshness. Keep the portfolio/hosting story in About.

Use the actual results-table component with a small fixed example dataset for the help page.
Label it as example data, with dates, so help remains reliable without a live API request.
Let users try column selection, row selection and adding a chart there. Keep the simpler
product/package demo for explaining that distinction.

**Open:** Whether longer help topics need their own linkable pages beyond the modal; returning
visitors' landing destination; exact welcome wording.

### Trends inside results tables (comment 5)

**Author:** Discuss adding trend lines to the tables.

**Suggested direction:** A compact step sparkline for the selected search dates, paired with a
numeric change and an accessible text summary. Use the same calendar window across rows and
preserve missing history rather than drawing through it. Explain that independent vertical
scales compare the shape of a trend, not dollar magnitude, and retain the app's axis
exaggeration rule. Clicking an explicit chart action could open the full history chart.

Product trends must average packages per date exactly as full charts do. Mixed-unit rows need
separate labeled trends per unit or a “Mixed units” summary; never combine units in a figure.
Distinguish change from first to last price in the window from the largest single-week change:
they answer different questions. Flat, short and no-price histories need clear states.

**Open:** Whether trends earn a default column slot on phones; which change metric is primary;
how much detail belongs in a row before a full chart becomes more useful.

### Column selection and defaults (comment 6)

**Author:** Add an obvious column-selection tool and agree on reasonable defaults. OTC probably
should not be visible by default.

**Verified:** MUI Data Grid supports a column visibility panel, accessible from a toolbar or
column menu. The current shared ResultTable does not enable a toolbar. See
[MUI columns panel documentation](https://mui.com/x/react-data-grid/components/columns-panel/).

**Suggested defaults for discussion:**

| Table | Initially visible, in proposed order |
| --- | --- |
| FDA products | Product NDC, Latest Price, Brand Name, Strength, Form, Trend, Latest Price Date |
| FDA packages | Package NDC, Latest Price, Brand Name, Package Description, Trend, Latest Price Date |
| NADAC | Stored NDC, Latest Price, Description, Trend, Latest Price Date |

Selection remains first; Latest Price stays second or third for phone visibility. Strength
helps distinguish otherwise identical product names. Trend is provisional until its design is
settled. Offer Min/Max, Generic Name, Labeler, Route, OTC, Sample and the other identifiers as
optional columns where applicable. Show unusual OTC/sample status in row details when useful.
An FDA package's product identity and strength should also be easy to inspect in details.

Add a labeled “Columns” action and “Reset columns”; consider remembering visibility per table
type. A compact phone view may need row details rather than merely a narrower desktop table.

### Compact, readable NDCs (comment 7)

**Author:** NDC columns consume too much width while remaining hard to read.

**Suggested direction:** Try tabular digits, slightly stronger text contrast and widths sized
to the identifier rather than generous header padding. Keep the complete identifier on one
line and provide a discoverable Copy action in details or on focus. Avoid truncating the digits
that distinguish packages. Hide redundant Product NDC by default in the package table.

Keep FDA's source formatting and leading zeros; NADAC continues to display its stored form.
Do not reconstruct FDA-style dashed identifiers from stored NADAC numbers. Test actual phone
widths and zoom before deciding typography or column widths.

### Preserve and refine docked chart readouts (comment 8)

**Author:** Likes the current appearance and behavior; requested hands-on exploration and
suggested refinements.

**Observed in browser:** The restored Eliquis package comparison supports arrow-key row
navigation, Space to lock with an explicit Unlock button, and Escape to unlock. Switching
Latest to Average updates the dot values and explanatory text. Restored Latest afterward.
The six-series line readout scrolls within its dock, keeping the plot separate.

**Suggested refinements:**

- Preserve the fixed dock, hierarchy of identifier/price/description, and explicit Unlock.
- Make the instruction precise: “Click a point to lock”; offer equivalent touch/keyboard
  guidance when appropriate. “Click to lock” in the dock can suggest the dock itself is the target.
- Include an explicit “Locked” status, so the reason values stop following the pointer is clear.
- Give the scrolling list a subtle overflow cue or visible series count when rows are below
  the fold. Check long package descriptions at phone width.
- Keep the meaning of “Latest” tied to the chart's dates. In a change-focused chart, its latest
  point may be months older than the search's latest price; “Latest in this chart” is clearer.

These are refinements to something the author likes, not a proposal to redesign the dock.

### Chart explanation and Latest/Average placement (comment 9)

**Author:** The explanation/toggle above the plot is hard to find; consider moving it below.

**Suggested direction:** Treat them separately. Put the short visual key (“Dot = latest;
line = low–high”) directly below the plot beside other chart explanations. Keep a clearly
labeled “Compare: Latest / Average” control near the chart title/readout, where it can be found
before a tall chart is scrolled. Moving every control below six or more rows risks making the
toggle harder to reach. Try both placements rather than settling this from desktop alone.

### Explicit chart creation and visible change discovery (comments 10–12)

**Author:** Automatic charts are hard to predict. Consider stopping automatic creation while
making significant price changes obvious. Perhaps a single changes table with chart actions,
and suggested actions that create the charts currently added automatically.

**Observed:** Eliquis at package level over all dates renders two overview charts plus six
individual cards for the January 14, 2026 drop of approximately 43%. This creates substantial
repetition for one event affecting several packages.

**Suggested direction:** Results first, then a compact “Explore these results” area offering
“Compare latest prices” and “Compare price histories”, each with a series count. Existing row
selection continues to create custom charts. Explain what each action adds and prevent
accidental repeated additions. Keep recommendations distinct from the user's saved charts.

Show an explicit “Price changes” summary/table with date, change %, old → new price and unit,
affected packages, and “View change” / “Add chart” actions. Group the same event across packages
when the date and movement agree, with expandable package details; retain exact per-package
values rather than pretending their prices are identical. Example: “6 packages dropped about
43% on Jan 14, 2026.” This could offer one comparison chart before six separate ones.

Keep changes visible without requiring chart creation or relying solely on a disappearing
toast. State that events are within the selected dates and respect the current filters. Link
a row's trend/change indicator to the corresponding event where possible.

**Open:** A separate changes table versus expandable results details; whether “View” is a
temporary preview and “Add” saves a snapshot; whether additions belong to Pinned today or to
a future collection; whether recommendation clicks immediately scroll to the created chart.

**Existing overlap:** docs/future-work.md's “Workspace redo” already proposes collections, searches
as tools and auto charts as recommended additions. These comments strengthen that direction;
they do not authorize the workspace redesign. Its “Popular searches and recent movers” idea
concerns discovery across all drugs; this proposal concerns events in the current results.
docs/future-work.md already records the docked readout as built; its remaining mixed-unit-card
work must be coordinated with any change to automatic chart creation.

### Keep FDA and NADAC consistent (comment 13)

**Author constraint:** Every FDA-page improvement must also be considered for NADAC. The two
pages should look and feel similar.

Use the same results toolbar, column-picker placement, trend conventions, chart actions,
price-change discovery, help patterns and mobile behavior. Keep meaningful source differences
in fields and data coverage. Shared presentation need not mean identical columns.

## Suggested discussion order

1. Decide the primary journey: Search → inspect results and changes → choose charts → collect.
2. Settle chart suggestions and change discovery before choosing trend/default columns.
3. Work through Search navigation, welcome and help as one coherent entry experience.
4. Refine NDC typography, chart controls and readout wording using desktop and mobile examples.

## Discussion: search and workspace responsibilities

**Author feedback:** Temporary chart previews in Search and saved comparisons in Workspace
could work. Users should be able to add things directly from standalone Search to a workspace
without repeating the search. Searches currently occupy workspace tabs, but the author does
not think that is the right future model.

**Still unresolved:** How users invoke and revisit searches inside a workspace; what a workspace
tab represents; how users choose the destination when adding from standalone Search. No
workspace interaction model has been selected yet.

### Possible first step: add the entire search to a workspace tab

**Author proposal:** Standalone Search offers “Add this search to the workspace,” creating a
new tab with the current search state rather than requiring users to repeat the search.
This may be a useful near-term bridge while the future workspace model is unsettled.

**Suggested behavior for discussion:** Copy the applied search criteria, current refinements,
FDA product/package level, and existing pinned snapshots into an independent new tab. Seed
it with the current loaded results so opening it does not repeat the request. Preserve the
standalone search. Use the applied terms rather than any unsubmitted edits. Selection and
other temporary view state need an explicit decision. The resulting tab is a working search,
not a frozen snapshot; later searches and filters in either location should be independent.

Technically this means initializing a fresh provider from transferable state, not sharing
the same mutable React context. Loaded data can be reused through the query cache where its
keys match; it need not be duplicated into persisted tab state. Exact implementation remains
to be checked against the existing providers. This proposal does not settle what tabs become
in a future collection workspace.


## Planning follow-up — activity mockup (2026-11-13)

The author requested continued refinement and consideration of a mockup. The working
recommendation combines text and optional sparklines in one Price activity column; icons
alone would not explain which change is represented. A contained interactive mockup explores
summary filters, significant events and flat/changed/insufficient-history rows. See the
[plan refinement](../plans/browser-usability.md#refinement--combined-price-activity-column-2026-11-13)
for behavior and remaining decisions. This does not yet approve sparklines as a default,
summary-filter scope, event grouping rules or unpinned-chart lifetime.


### Selection workflow clarification

The author explicitly wants to retain selecting rows and then adding a Line or Bar chart.
This supersedes direct per-row View chart buttons and the earlier D8 summary's View chart
shortcut. A proposed replacement summary action selects affected rows; users still decide
when to chart them. See the plan's “Selection workflow refinement” section.


### Plan restructuring (2026-11-13)

- The author decided the app bar and navigation rework comes first; it is Stage 1 of the plan.
- Help left the usability plan. R2 and the help questions under comments 3–4 are owned by
  [the help plan](../plans/help.md); the usability plan notes where the two touch.
- The rough activity mockup was only ever meant to give the basic idea. Its screenshots were
  removed and the plan describes it in words (“What the rough mockup showed”), so it can't be
  read as layout or styling guidance.


### Stages 2–4 settled (2026-11-13)

The author and the reviewing agent went through the open decisions for results, charts,
price activity and the workspace bridge one at a time. The outcomes are written into
[the plan](../plans/browser-usability.md) as decisions and supersede the recommendations
above where they differ. In short: selected rows pin directly and the Compare buttons toggle
live overview cards (resolving D7 and D8); change callouts appear on any line chart, with a
toggle; a Price Activity column with a sparkline and a label, sorted and not filtered;
Stable means a range under 5%, chosen from measured data; the bridge is built. R3–R7 and R10
are settled there.


### Stage 1 settled (2026-11-13)

The navigation choices (R1, comments 1–4) were then settled the same way and are in the
plan's Stage 1: one top row with the app name as home, Search, Workspace, and Help and
Settings icons; About out of the bar; one Search area at `/search/fda` and `/search/nadac`
with both sources kept mounted; welcome on a first visit and the last source afterwards,
FDA by default; an offer of NADAC when an FDA search is empty. Welcome copy is drafted in
[docs/content/welcome.md](../content/welcome.md).
