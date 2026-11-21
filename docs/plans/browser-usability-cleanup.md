# Browser usability cleanup

The November 19, 2026 review identified readability problems and a few bugs in the browser
usability changes. PR #57 completed the component and focus cleanup for open price change
charts. This plan tracks the remaining work. File paths in this plan are under
`client/src/` unless stated otherwise.

Each section can land in its own PR against `dev`. Start with price events and line-chart
markers. Keep the current behavior except for the bug fixes and the package-switch design
decision described below.

## Price event logic

Files: `library/priceActivity.ts`, `library/flagNadacPriceChange.ts`,
`Components/ResultsSection/PriceChangeListBody.tsx`.

- Move `eventKey` (one copy since #59, private to `PriceChangeListBody.tsx`) into
  `library/priceActivity.ts` and test it. Every list's chart buttons, in the results and under
  Pinned, find their charts by it.
- Write the "between X and Y / on X" wording once; `eventDates` and `priceEventGroupLabel`
  both build it today. Stop exporting `eventDates` (used only inside the file).
- Split by unit once. `derivePriceEvents` groups by NDC, package and unit, then rewrites each
  price's `ndc` just to pass `flagPriceChanges`'s mixed-NDC check. `flagPriceChanges` then splits
  by unit again and checks for mixed NDCs, as does `flagPackagePriceChanges` inside it. Give the
  event code a function that takes one package's single-unit series and skips the checks.
- **Check zero-price labels.** `packageActivity` derives significant events before it formats the
  net change. A rise from zero already takes the significant-event path and displays “from $0.”
  Cover that behavior when simplifying the event code and remove unreachable zero-price handling.

## Line-chart change markers

Files: `Components/Charts/LineViz.tsx`, `library/lineChanges.ts`.

- Compute price events once: `LineViz` derives them directly and again inside
  `lineChangeCallouts`. Pass the derived events in. Compute them only when something uses them
  (callouts on, or the screen-reader announcement).
- Decide whether the legacy `changeSpan` callout, the new callouts and the `eventDate`
  `ReferenceLine` can share one path. At least document which path draws what for which chart.
- Replace `changeCallout`'s three-state `label` (`undefined` default text, `null` none, string
  custom) with two explicit options, and replace the `cloneElement` re-keying
  in `LineViz` with a key-prefix parameter.
- Make `lineChanges.ts` readable: split the dense expressions into named steps,
  make `samePrices` a boolean, compute `packages` only where it's used, and import `WEEK` from
  `priceActivity.ts` instead of repeating `7 * 86400000`.

## Pinned charts and pinning

Files: `Components/ExplorerGrid/PinButton.tsx`, `PinnedItemCard.tsx`,
`Components/ResultsSection/ChartSelectedControl.tsx`, `library/explorerItems.ts`, `library/persist.ts`,
`Context/PinnedItemsProvider.tsx`, `Components/Charts/ChartItemBody.tsx`.

- Remove `PinButton`'s per-unit branch and its "Added N charts, one per pricing unit" toast.
  Both callers pass single-unit prices (`AutoCharts` splits by unit, the change chart
  dialog filters by unit), so it only ever makes one chart. Keep the toast in `ChartSelectedControl`,
  where it can show, and put its text in one place if anything else needs it.
- In `PinnedItemCard`, drop the `seriesKind === "product"` check that `canDrillDownToPackages`
  already makes. Keep its `item.kind === "chart"` checks: since #59 an `ExplorerItem` can also be
  a `PriceChangeListItem`. In `explorerItems.ts`, drop `packageLevelView`'s
  `if (!packageNdc) return;`, which `canDrillDownToPackages` already rules out.
- Make the product/package switch discoverable. Today it is a click on the summary chip
  ("Products · 2 of 7 · from …"), which looks like a label, and the card now shows two chips
  side by side. Use an explicit toggle or button. This is a small UX decision for the author.
- Use one type for `"fda" | "nadac"`. `ChartSearchSource` (`explorerItems.ts`) and
  `SearchSource` (`persist.ts`) are the same thing.
- Rewrite `validItems`' source cleanup (`persist.ts`: copy, delete `searchSource`, re-add
  if valid, a cast per kind) as one expression. Since #59 it serves charts and price change lists,
  and the rewrite must keep both.
- `saveSearchPins` re-reads both legacy keys on every pin change. Clear them once after the
  first successful shared save instead (for example, remember in module state that they are gone).
- Remove `PinnedItemsProvider`'s `addItem` if `Collection.tsx` can use `addItems([item])`.
- **Known gap, now commented but unfixed:** a pinned bar chart of an averaged product reserves a
  readout dock about 24px too short, so the card shifts (`ChartItemBody.tsx`). Fix the reserved
  height or move it to `docs/future-work.md`.

## Standalone Search and Workspace

Files: `Components/NadacSearch/NadacSearchPanel.tsx`, `App.tsx`,
`Components/Search/StandaloneSearch.tsx`, `Components/Search/AddSearchToWorkspace.tsx`,
`Context/WorkspaceContext.tsx`.

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
- Browser support: `checkVisibility()` needs Safari 17.4 or later. Confirm that's acceptable or
  add a fallback.

## Result tables

Files: `Components/ResultTables/ResultTable.tsx`, `priceColumns.tsx`, `AutosizeColumns.tsx`,
the three table files, `library/resultRows.ts`, `library/chartReadout.ts`.

- Shorten the summary line (`ResultTable`), which always lists zero counts ("N packages:
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

## Small cleanups

- `library/settings.ts`: the default `columnOverrides` is a shared mutable
  `DEFAULT_COLUMN_OVERRIDES` object. Freeze it or build a fresh one per read.
- `PinnedChartDates.tsx`: an extra blank line left after a removal.
- `UnitSplit.tsx`: `gap: 2, }` formatting.

## Agent documentation

`AGENTS.md` grew by about 85 lines on this branch and `client/CHARTS.md` by about 86. Much of
it is detailed UI behavior ("Keep Latest Price second or third", where focus goes when a chart
closes) that every agent reads on every task. Do this last, after the steps above have removed
some of the behavior it describes:

- Keep rules that prevent bugs and a short map of where things live.
- Move UI details into documentation or comments beside the code.
- Update the Price Activity and Standalone Search guidance when the relevant code changes.

## Verification

Run `npm run lint`, `npm run build` and `npm test` in `client/` for each PR. Cover zero-price
labels and strength formatting. Check the affected screens on desktop and phone,
including both search sources for shared behavior. Use the keyboard to check focus when
opening and closing charts if a change touches that flow.
