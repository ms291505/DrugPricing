# Browser usability cleanup

## Context

The merges into `browser-usability` (#32 through #56: about 3,300 lines of code across 108
files, docs aside) were written and reviewed by agents without the author watching. A review on
2026-11-19 looked for readability problems, unneeded complexity and new bugs. `tsc`, ESLint and
all 322 Vitest tests passed. Most findings are complexity the agents added; a few are small bugs.

Line numbers are at `origin/browser-usability` commit `24d9a30` ("Place explorer cards in
responsive grid (#56)"), and will drift as the steps land. Paths are under `client/src/` unless
stated otherwise.

Ruled out during the review: `AutosizeColumns` passes hidden columns to MUI's autosize, but MUI
filters hidden columns itself.

## Goals

- Fewer layers, props and mechanisms for the same behavior, with no change a user would notice
  except the bug fixes listed here.
- One home for each piece of logic (event keys, date wording, unit splitting, source types).
- No dead code: branches that can't run, refs nobody reads, unused exports.

Out of scope: new features, restyling, and items already in `docs/future-work.md`.

## Steps

Each step is one PR against `browser-usability` (or `dev`, once it has merged), and ends with
`npm run lint`, `npm run build` and `npm test` passing. Steps 1–4 come first because the price
changes code is where most of the added complexity sits; the later steps are independent and can
go in any order.

### 1. Flatten the price changes components

Files: `Components/ResultsSection/PriceChangesSection.tsx`, `PriceEventsList.tsx`.

The path today is `PriceChangesSection` → `PriceChanges` → `NotablePriceChangesCard` →
`PriceEventsList` (render prop) → `PriceChangeRow` → `PriceEventDetails` → `PackageTable` →
`PackageEventRow`. The open-charts map, the toggle callback and the button-registration callback
pass through about five of those.

- Merge `PriceChangesSection` into `PriceChanges`: it exists only to hold one piece of state.
- Drop `PriceEventsList`'s `renderGroup` render prop. It has one caller, left over from when the
  list also showed inside charts (removed in #46); render the row directly.
- Aim for two or three components: the card (with its state) and a group row that renders its
  package table. Pass chart state through context or keep it at the card if the layer count
  drops enough.
- Remove the `Fragment` around a single `TableRow` (`PriceEventsList.tsx:125`).
- Done when the behavior described in `AGENTS.md` (Price Activity paragraph) still holds and
  the files are clearly shorter.

### 2. Simplify open-chart state and focus

Files: same as step 1.

- Replace `OpenChartState` (state that stores the `prices` it was made for, so it can be thrown
  away when prices change, with the toggle re-checking the same comparison) with state that is
  cleared when the search's prices change, in one place.
- Remove the `currentCharts` filter (`PriceChangesSection.tsx:83-84`). It checks
  `chart.prices === prices` and that each chart is still in `groups`, both already guaranteed.
- Replace the `focusInChart` ref, its onFocus/onBlur tracking and the effect on `[prices]` with
  one focus decision made where charts are discarded.
- Remove `PackageEventRow`'s `buttonRef` (`PriceEventsList.tsx:114-118`): it is set and never read.
- Remove the `useId().replaceAll(":", "")` workaround, a leftover of React 18's id format, if
  nothing still needs it.
- `PriceChangeRow`'s `memo` never takes effect because `chartIds` is a new `Map` every render
  (`PriceChangesSection.tsx:85`). Either memoize `chartIds` so the memo works, or drop the memo.
  Prefer dropping it unless a profile shows the rows are slow.
- **Bug:** with no notable changes, the page still renders a visually hidden, empty
  `<h3>Notable price changes</h3>` (`:159`) as a focus target, so screen-reader users get a
  heading with nothing under it. Send focus elsewhere (the results heading or the Compare
  controls) and stop rendering it.

### 3. One source of truth for price events

Files: `library/priceActivity.ts`, `library/flagNadacPriceChange.ts`,
`Components/ResultsSection/PriceChangesSection.tsx`, `PriceEventsList.tsx`.

- Move `eventKey` (copied verbatim at `PriceChangesSection.tsx:155` and `PriceEventsList.tsx:144`)
  into `library/priceActivity.ts` and test it. If the two copies drift, chart buttons stop
  matching their charts.
- Write the "between X and Y / on X" wording once; `eventDates` and `priceEventGroupLabel`
  both build it today. Stop exporting `eventDates` (used only inside the file).
- Split by unit once. `derivePriceEvents` groups by NDC, package and unit, then rewrites each
  price's `ndc` just to pass `flagPriceChanges`'s mixed-NDC check. `flagPriceChanges` then splits
  by unit again and checks for mixed NDCs, as does `flagPackagePriceChanges` inside it. Give the
  event code a function that takes one package's single-unit series and skips the checks.
- **Bug:** a first price of $0 makes `packageActivity`'s `net` and `range` `Infinity`, so a label
  can read "Infinity%" (`priceActivity.ts:118, 128`). Treat it as insufficient history (or skip
  percent) and add a test. Unlikely with NADAC data, but cheap to close.

### 4. Simplify change marking in line charts

Files: `Components/Charts/LineViz.tsx`, `library/lineChanges.ts`.

- Compute price events once: `LineViz.tsx:133-134` derives them directly and again inside
  `lineChangeCallouts`. Pass the derived events in. Compute them only when something uses them
  (callouts on, or the screen-reader announcement).
- Decide whether the legacy `changeSpan` callout, the new callouts and the `eventDate`
  `ReferenceLine` can share one path. At least document which path draws what for which chart.
- Replace `changeCallout`'s three-state `label` (`undefined` default text, `null` none, string
  custom) with two explicit options, and replace the `cloneElement` re-keying
  (`LineViz.tsx:251-262`) with a key-prefix parameter.
- Make `lineChanges.ts` readable: split the dense expressions (lines 613–620) into named steps,
  make `samePrices` a boolean, compute `packages` only where it's used, and import `WEEK` from
  `priceActivity.ts` instead of repeating `7 * 86400000`.
- Note only, no action needed: `placeLeft` changed from 0.6 to 0.5.

### 5. Pinned charts and pinning

Files: `Components/ExplorerGrid/PinButton.tsx`, `PinnedItemCard.tsx`,
`Components/Charts/ChartSelectedControl.tsx`, `library/explorerItems.ts`, `library/persist.ts`,
`Context/PinnedItemsProvider.tsx`, `Components/Charts/ChartItemBody.tsx`.

- Remove `PinButton`'s per-unit branch and its "Added N charts, one per pricing unit" toast.
  Both callers pass single-unit prices (`AutoCharts` splits by unit, the package event chart
  filters by unit), so it only ever makes one chart. Keep the toast in `ChartSelectedControl`,
  where it can show, and put its text in one place if anything else needs it.
- In `PinnedItemCard`, drop the `seriesKind === "product"` check that `canDrillDownToPackages`
  already makes, and the `item.kind === "chart"` checks (every `ExplorerItem` is a chart). In
  `explorerItems.ts`, drop `packageLevelView`'s `if (!packageNdc) return;`, which
  `canDrillDownToPackages` already rules out.
- Make the product/package switch discoverable. Today it is a click on the summary chip
  ("Products · 2 of 7 · from …"), which looks like a label, and the card now shows two chips
  side by side. Use an explicit toggle or button. This is a small UX decision for the author.
- Use one type for `"fda" | "nadac"`: `ChartSearchSource` (`explorerItems.ts:20`) and
  `SearchSource` (`persist.ts`) are the same thing.
- Rewrite `validItems`' source cleanup (`persist.ts:156-166`: copy, delete `searchSource`,
  re-add if valid, two casts) as one expression.
- `saveSearchPins` re-reads both legacy keys on every pin change. Clear them once after the
  first successful shared save instead (for example, remember in module state that they are gone).
- Remove `PinnedItemsProvider`'s `addItem` if `Collection.tsx` can use `addItems([item])`.
- **Known gap, now commented but unfixed:** a pinned bar chart of an averaged product reserves a
  readout dock about 24px too short, so the card shifts (`ChartItemBody.tsx`). Fix the reserved
  height or move it to `docs/future-work.md`.

### 6. Standalone search, navigation and the workspace

Files: `Components/NadacSearch/NadacSearchPanel.tsx`, `App.tsx`,
`Components/Search/StandaloneSearch.tsx`, `Components/Search/AddSearchToWorkspace.tsx`,
`Context/WorkspaceContext.tsx`, `library/paneVisibility.ts`.

- Track the FDA-to-NADAC handoff once in `NadacSearchPanel`: today it is a `received` state set
  during render and an `appliedOffer` ref in an effect. Move the comment "A restored tab shows
  the search it re-ran" back above the code it describes.
- In `AppShell`, put the "is this a Help path" check in one function (it appears three times).
  Review the visited-sources set, last-source state, the two setState-during-render updates and
  the ref copy of `navigate`. Keep what keeping pages mounted needs (see "Standalone Search
  navigation" in `AGENTS.md`) and remove the rest.
- Give the handoff `offer` only to the NADAC page instead of passing FDA `offer={null}` through
  `StandaloneSearch`.
- In `AddSearchToWorkspace`, keep one double-click guard: either `event.detail > 1` or the
  `adding` ref, not both plus the reset-on-show effect. Keep the click-time read-only check that
  `AGENTS.md` asks for, but drop the extra layer: `addSearchTab` checks again, and
  `WorkspaceContext` keeps a `readOnly` state that copies the persist module's flag. Merge the
  near-duplicate `ready` and `started` props.
- Remove the trailing blank line in `paneVisibility.ts`.
- Browser support: `checkVisibility()` needs Safari 17.4 or later. Confirm that's acceptable or
  add a fallback.

### 7. Result tables

Files: `Components/ResultTables/ResultTable.tsx`, `priceColumns.tsx`, `AutosizeColumns.tsx`,
the three table files, `library/resultRows.ts`, `library/chartReadout.ts`.

- Shorten the summary line (`ResultTable.tsx:66`), which always lists zero counts ("N packages:
  0 with significant changes, 0 other changed, 5 stable, 0 insufficient history · dates"). Show
  only non-zero categories.
- Have `createPriceColumns` return either the separate columns (`latest`, `latestDate`, `range`)
  or the `history` group (which is just `latestDate` plus `range`), not both.
- `StaleMarker` is a focusable `role="img"` whose `label` and `name` props are almost the same
  text. Use one prop and make sure the tooltip is still reachable by keyboard.
- Make `dateWindow` required on the three tables (every caller passes it).
- Type `AutosizeColumns`' `columns` prop properly instead of `unknown`.
- Use `sx` in the `ResultFooter` toolbar instead of inline `style` objects.
- Drop `READOUT_LINE_HEIGHT` in `chartReadout.ts`, which only renames `LINE`.
- **Bug:** `formatStrength` (`resultRows.ts`) prints "undefined" if the strength and unit lists
  have different lengths. Guard it and add a test.
- Known edge, already acknowledged: if a new NADAC week loads mid-session, every row can show
  stale until app-init refetches (`currentAsOfDate`, `library/prices.ts`). Leave as is or add to
  `docs/future-work.md`.

### 8. Small nits

- `AutoCharts.tsx`: stray spacing in the imports.
- `library/settings.ts`: the default `columnOverrides` is a shared mutable
  `DEFAULT_COLUMN_OVERRIDES` object. Freeze it or build a fresh one per read.
- `PinnedChartDates.tsx`: an extra blank line left after a removal.
- `UnitSplit.tsx`: `gap: 2, }` formatting.

### 9. Trim the agent docs

`AGENTS.md` grew by about 85 lines on this branch and `client/CHARTS.md` by about 86. Much of
it is detailed UI behavior ("Keep Latest Price second or third", where focus goes when a chart
closes) that every agent reads on every task. Do this last, after the steps above have removed
some of the behavior it describes:

- Keep rules that prevent real bugs, plus a short map of where things live.
- Move UI detail into comments beside the code, or into `docs/plans/browser-usability.md`.
- Update the Price Activity and Standalone Search paragraphs to match steps 1–6.

## Verification

For each step: `npm run lint`, `npm run build` and `npm test` in `client/`, new tests for the
bug fixes in steps 3 and 7, and a browser check of the screens the step touches (NADAC and FDA
search, Notable price changes, pinned charts, Add search to workspace) on desktop and phone
widths. Step 2 also needs a keyboard and screen-reader pass of opening and closing package
event charts.
