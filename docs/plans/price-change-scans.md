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
  before **Show all**. Its event charts are temporary; each chart can be pinned or closed. The
  grouped list itself has neither action.
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

These transient results belong to the current result view. A new search, date window or refine
filter clears them. Closing a result card removes it from this view and does not persist it. The
automatic 10% list can also be closed; it remains closed for the current result view and returns
when a new search, date window or refine-filter result arrives. Each card has its own close action.

## Pinning event lists

Add a genuine `price-change-list` `ExplorerItem` kind; do not encode the list as a chart. The pin
button on the automatic list and each explicit scan copies a snapshot containing:

- source metadata and search label, series kind and counts;
- the exact shown date window and the threshold percentage;
- event groups with date, unit, direction, package NDC, source series identity, and each event's
  previous/current dates and prices;
- each involved package's full available (already loaded) history, with package NDC, unit, label,
  dates and prices. The stored date window controls what the chart shows. This supplies the
  existing **Chart this change** behavior from the pinned card without a fetch or current-search
  dependency.

The pinned card keeps its own history, dates, event rows, threshold and provenance across searches,
filters and reloads. It has the same per-card close/remove, collapse, reorder and width behavior as
other explorer items. Pinning does not remove the transient card. The list's chart action uses its
captured package history and date window; it does not re-resolve packages through live results.
Any chart created from that list is a normal pinned chart snapshot and retains the event date.

`PinnedItemCard`, `PinnedSection`, `ExplorerItem`, the matched-scale helper and persistence must
handle the new union member explicitly. Only chart items participate in matched price ranges or
chart-only actions. A pinned event-list can never be matched to a price axis.

Persist the new item with the existing field-by-field validation and no version bump. An invalid
event-list field must not discard valid sibling pins. Unknown or invalid source metadata remains
unknown; do not infer FDA/NADAC source from event or series data. Existing chart pins remain valid.

## Event chart behavior

The automatic list and every scan list use the same group summaries, package-detail table and
**Chart this change** action. For a transient list, chart creation reads the page's captured-in-
memory history and existing shown dates. For a pinned list, it reads the history and dates stored
in that item. The chart remains one pricing unit and opens/closes independently under its event
group; its readout starts on the event date. Pinning that chart keeps it as a regular chart pin.

For transitions from a zero previous price, percentage change is undefined. Recommended scan
behavior: omit those transitions from percentage-threshold results, since no finite threshold can
be compared, and never display `Infinity%` or `NaN%`. Tests should verify this. The automatic 10%
card should retain its current behavior unless the reviewed implementation finds a correctness
issue that needs a separate decision.

## Tests and checks

Add pure tests for threshold conversion and event selection: an event exactly at the threshold,
one just below it, rises and drops, more than 100% rises, zero previous prices, independent
package/unit grouping, and invalid input. Add persistence tests for a valid pinned list, missing
optional fields, malformed list data, and a malformed list beside a valid chart pin; the valid
chart pin must survive.

Run the client unit suite, TypeScript build, ESLint and production build. Do not add component
tests that mirror only the CSS. Review the modal, standalone search, mobile wrapping, pinning across
a new search, and charting from a pinned event list.

## Out of scope

- Changing Price Activity's 5% range cutoff, 10% significance rule, labels or row ordering.
- Fetching more prices to satisfy a scan.
- Persisting transient scan results or their close state.
- Combining or replacing separate scans with one mutable result card.
- Reclassifying older pins' provenance.
