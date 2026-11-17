# Price-change scans and pinned event lists

Status: draft for review. Do not implement the scan threshold, event-list persistence, or card
lifecycle until this plan is reviewed. The independent Compare-button label/icon change is already
in the worktree and is not part of the dependent implementation gate.

## Goal

Let a user chart latest prices or price histories with clear labels, keep the existing automatic
10% notable-change list, and run additional scans at a user-chosen percentage. Every automatic or
scanned results card can be closed or pinned. A pinned event list is a real snapshot item, with
enough package history to chart a change later without consulting the current search.

## Current behavior

- `AutoCharts` has two opt-in comparison toggles. The latest-price cards are bars and the history
  cards are lines. Their labels will become **Chart Latest Prices** and **Chart Price Histories**,
  with bar and line icons.
- `PriceChangesSection` automatically derives package-level consecutive-price events at the
  existing 10% threshold, groups them by date, pricing unit and direction, and lists five groups
  before **Show all** in the **Notable price changes** card. Its event charts are temporary; each
  chart can be pinned or closed. The grouped list itself has neither action.
- The separate table activity classification uses its own 5% range and 10% significant-step
  rules (`library/priceActivity.ts`). A scan threshold must not change those table labels or
  sorting.
- `ExplorerItem` is currently only a pinned chart. Persistence validates each pin and field, and
  legacy chart pins must continue loading.

## Controls and explicit scans

Keep the automatic 10% card visible by default, independently of explicit scans. Add a percentage
input with **10** as its initial value and a **Scan Price Changes** action. A scan uses the current
refined prices and current shown date window on the page; it does not fetch more data. It examines
each package's consecutive observations independently, uses the requested threshold inclusively,
and groups matches by date, unit and rise/drop direction. It does not change the automatic card's
10% threshold or the table's Price Activity classification.

The input accepts any positive finite percentage. Values above 100 are allowed: they can match
large rises, while drops cannot exceed 100%. Invalid, zero, negative, NaN or infinite input does
not run a scan and gives the field a clear validation message. The UI percentage converts to a
fraction only at the scan helper boundary. There is no arbitrary upper cap.

Each click that passes validation creates a separate transient scan-result card, even when another
scan has the same threshold. Cards retain their own threshold and results. Repeated scans therefore
add independent cards instead of changing earlier ones. An empty scan still creates a card that
says no package changes met that threshold in the current dates and filters; it can be closed or
pinned as a record of the scan.
The fixed-threshold card is titled **Notable price changes**; a scan card identifies its chosen
threshold in its title/subtitle and in its pinned snapshot.

These transient results belong to the current result view. A new search, date window or refine
filter clears them. Closing a result card removes it from this view and does not persist it. The
automatic 10% list can also be closed; it remains closed for the current result view and returns
when a new search, date window or refine-filter result arrives. Each card has its own close action.

Use a stable result-scope key including loaded-search generation, applied search/refine criteria
and shown date window. Do not rely on `prices` array identity alone: dates can narrow without a
fetch, but transient cards still need to follow the shown result scope.

## Pinning event lists

Add a genuine `price-change-list` `ExplorerItem` kind; do not encode the list as a chart. The pin
button on the automatic list and each explicit scan copies a snapshot containing:

- source metadata and search label, series kind and counts;
- the exact shown date window and the threshold percentage;
- event groups with date, unit, direction, package NDC, source series identity, and each event's
  previous/current dates and prices. Store numeric UTC timestamps, not `Date` objects;
- each involved package's full available (already loaded) history, with package NDC, unit, label,
  dates, prices and assigned color slot. Store each package/unit history once per list even when
  it appears in several groups. The stored date window controls what the chart shows. This supplies
  the existing **Chart this change** behavior from the pinned card without a fetch or current-search
  dependency.

The pinned card keeps its own history, fixed date window, event rows, threshold and provenance
across searches, filters and reloads. It has the same per-card close/remove, collapse, reorder and
width behavior as other explorer items. Do not offer list-only Change dates or Match scale
actions. Pinning does not remove the transient card.

`PinnedItemCard`, `PinnedSection`, `ExplorerItem`, the matched-scale helper and persistence must
handle the new union member explicitly. Only chart items participate in matched price ranges or
chart-only actions. A pinned event-list can never be matched to a price axis.

Persist the new item with the existing field-by-field validation and no version bump. An invalid
event-list field must not discard valid sibling pins. Validate the threshold, source and date
window; groups and event values; and the references from events to package/unit histories. Check
date, unit, direction, package identity and old/new price consistency. Unknown or invalid source
metadata remains unknown; do not infer FDA/NADAC source from event or series data. Existing chart
pins remain valid.

Full histories increase local-storage use. Deduplicate package/unit histories within each list and
store compact point arrays; do not silently truncate history or drop events to fit storage. Use
the existing persistence-write failure notice, and leave the live in-memory pin visible if a write
fails so the user can remove it or retry after freeing storage.

## Event chart behavior

The automatic list and every scan list use the same group summaries, package-detail table and
**Chart this change** action. The action creates a separate, unpinned Explorer chart card outside
the event list/table, with its own Pin and Close actions. Transient lists create those cards from
the current loaded history and shown dates. Pinned event lists create them from their saved
histories, color slots and fixed date window.

For a pinned event list, keep temporary chart cards in local `PinnedSection` state and render them
as a separate sibling card grid below the pinned items, outside the pinned count. This keeps their
temporary nature clear and uses the existing pin provider without lifting it around the workspace
or writing temporary charts to storage. Collapsing or closing/removing the source list does not
close an already opened chart; each chart remains until its own Close action. Capture its prices,
color, dates and event date when opened. If its source button is gone, Close returns focus to the
available pinned-section heading. A chart explicitly pinned from this card remains after the
transient chart closes.

For charts opened from current-result cards, closing/removing the source list also leaves already-
open separate charts visible until their own Close. A new result-scope key clears transient lists
and their unpinned event charts; explicitly pinned list/chart snapshots remain.

If all pinned event lists are removed while a temporary chart is still open, `PinnedSection` must
remain rendered for that temporary chart. The normal Pinned count continues to count only stored
items and excludes temporary charts.

For explicit percentage scans, transitions from a zero previous price are omitted because no
finite percentage threshold can be compared. They never display `Infinity%` or `NaN%`. The
automatic 10% list and table retain their existing event inclusion/classification semantics. If an
automatic event has a zero previous price, its current presentation should be reviewed separately;
the scan implementation must not change table classification or the automatic event selector.

Same-package, same-unit observations on one date continue through `seriesByDate`'s existing
average before consecutive events are compared. Do not assume one price/NDC/date or infer package
events from an averaged product line.

## Review decisions recorded

- Keep the automatic 10% **Notable price changes** card and add a separate result card for every
  explicit scan. Scans never replace one another.
- Both the automatic list and every explicit scan are closable and pinnable. Pinned lists are
  snapshots; transient lists and charts are not persisted.
- Event charts opened from either result lists or pinned lists are separate temporary Explorer
  cards with their own Pin/Close actions. They are never auto-pinned and stay open if their source
  list closes; result-scope changes clear only result-derived temporary charts.
- Pinning a list captures full loaded package histories and colors so **Chart this change** works
  without the current search. Package/unit histories are stored once per list.
- Scans exclude zero-baseline transitions because their percentage is undefined; the existing
  automatic event selection and table classification remain unchanged.
- Result lifecycle follows a search-generation, applied-criteria and date-window key. Same-date
  package/unit duplicates are averaged by existing `seriesByDate` rules before comparison.

## Tests and checks

Add pure tests for threshold conversion and event selection: an event exactly at the threshold,
one just below it, rises and drops, more than 100% rises, zero previous prices excluded from
percentage scans, same-date duplicate prices averaged before threshold comparison, independent
package/unit grouping, and invalid input. Add persistence tests for a valid pinned list, missing
optional fields, malformed event/history references, and a malformed list beside a valid chart
pin; the valid chart pin must survive.

Run the client unit suite, TypeScript build, ESLint and production build. Do not add component
tests that mirror only the CSS. Review the modal, standalone search, mobile wrapping, pinning across
a new search, and charting from a pinned event list.

## Out of scope

- Changing Price Activity's 5% range cutoff, 10% significance rule, labels or row ordering.
- Fetching more prices to satisfy a scan.
- Persisting transient scan results or their close state.
- Combining or replacing separate scans with one mutable result card.
- Reclassifying older pins' provenance.
