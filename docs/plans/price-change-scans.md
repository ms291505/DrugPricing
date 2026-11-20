# Price-change scans and pinned event lists

Status: implemented (2026-11-20): steps 1–2 in #58, steps 3–7 in #59. The plan predates #57, so
where it names code, those PRs follow the code instead; their descriptions list each departure.

Work the steps in order. Each step names its files and ends with what must be true. Run
`npm run lint` and `npm test` in `client/` after every step; both must pass before the next.
Read AGENTS.md (Client section) and `client/CHARTS.md` first.

## What we are building

1. The two Compare buttons become **Chart latest prices** and **Chart price histories**, with
   bar and line icons.
2. Beside them, a percent input (initial value **10**) and a **Scan price changes** button. Each
   scan adds a card listing package price changes of at least that percent in the shown dates and
   filters. The automatic **Notable price changes** card (10%) stays.
3. The automatic card and every scan card can be **closed** and **pinned**. A pinned list is a
   stored snapshot that keeps working after new searches and reloads, including
   **Chart this change**.

## Decisions (do not revisit while implementing)

- **Sentence case** for every new or renamed label: "Chart latest prices", "Scan price changes",
  "Price changes of 25% or more". Never title case.
- **Threshold comparison is in tenths of a percent.** A change meets threshold `t` (a percent,
  e.g. `10` or `7.5`) when `Math.round(Math.abs(fraction) * 1000) >= Math.round(t * 10)`. This
  fixes an existing bug: today `$1.00 → $0.90` computes `-0.09999999999999998` and is missed at
  10%. The fix applies everywhere `flagPriceChanges` is used (the automatic card, Price Activity
  and line-chart markers); that is intended. Nothing else about Price Activity changes.
- **A change from $0 to a positive price always meets every threshold** (it is an infinite rise)
  and is a rise. It is shown as "from $0" and never with a percent: no text may contain
  `Infinity` or `NaN`. A drop to $0 is an ordinary −100% change. Dev data (7.2M rows since 2022)
  has no $0 prices, so this is a guard, not a common case. One test covers it.
- **Scan input:** a number of at least **5**, at most one decimal place, no upper cap (above 100
  can only match rises). Anything else does not scan and shows the field's error text:
  "Enter a percent of 5 or more, with at most one decimal." The 5% floor keeps lists, and their
  pinned copies, from covering most of the result (more than half of all packages have a 5% step
  in a year).
- **A scan with no matches creates no card.** The control row shows, in a `role="status"`
  element, "No package changes of 25% or more in these dates and filters." It clears on the next
  scan, an edit to the input, or new prices.
- **Every successful scan adds a new card**, even at a threshold already scanned. Cards never
  change after they are made.
- **Result scope is `prices` identity** (the `prices` prop of `PriceChangesSection`), as the open
  event charts use today. Narrowing dates or filters makes a new array; switching FDA detail level
  does not (the section uses `packageNadacPrices`). New `prices` remove every scan card and every
  event chart opened from a result card, and reopen a closed automatic card. Pinned items stay.
- **Pinned lists store package histories, not events.** Events are re-derived from the stored
  histories and threshold when drawn, the same way pinned line charts re-derive their change
  markers. There are no event references to validate.
- **Stored histories are the shown prices only** (already clipped to the shown dates), for the
  packages that have at least one event. A chart opened from a pinned list therefore covers the
  list's dates and cannot widen beyond them.
- **Size cap:** a list whose `JSON.stringify` length exceeds `PRICE_CHANGE_LIST_PIN_LIMIT`
  (500,000 characters, in `library/constants.ts`) is not pinned. Show
  `toast.error("Too many packages to pin (N). Narrow the dates or filters, or scan at a higher percent.")`.
  Never truncate. For scale: metformin at 5% over 12 months is 97 packages and ~100,000
  characters; "tablet" at 10% is ~3,300 packages and ~4,000,000.

## Data model

Add to `library/explorerItems.ts`:

```ts
export type PriceChangeListItem = ExplorerItemBase & {
  kind: "price-change-list",
  /** The scan's percent, e.g. 10 (the automatic card) or 7.5. At least 5, one decimal at most. */
  thresholdPercent: number,
  /** The shown dates when pinned. Fixed: lists have no Change dates. */
  dateWindow: DateWindow,
  /** One entry per package and unit with an event; `points` are the shown prices. */
  histories: ChartSeriesSnapshot[],
};

export type ExplorerItem = ChartItem | PriceChangeListItem;
```

`source` (from `ExplorerItemBase`) is filled like this:

- `searchSource`, `searchLabel`, `seriesKind`: copied from the section's `origin`.
- `seriesCount`: the number of distinct `histories[].ndc`.
- `resultSeriesCount`: the number of distinct NDCs in `origin.resultPrices`.
- `filtered`: true when any stored history has fewer points than the same NDC and unit has in
  `clipToWindow(origin.resultPrices, dateWindow)`.

Titles:

- Automatic card: "Notable price changes". Scan card: "Price changes of 25% or more".
- Both subtitles: "Package changes of 25% or more in these dates and filters." (with the
  card's own percent).
- Pinned `defaultTitle`: `${capitalize(searchLabel)}: price changes of 25% or more`, matching
  `chartTitle`'s style (export `capitalize` from `library/chartTitles.ts`). The automatic card
  uses 10.

## Steps

### 1. Rename the Compare buttons

`Components/ResultsSection/AutoCharts.tsx`: labels **Chart latest prices** (`startIcon`
`BarChart` from `@mui/icons-material`) and **Chart price histories** (`ShowChart`). Change the
disabled hint to "Chart up to {MAX_AUTO_CHART_SERIES} series. ..." Update the same wording in
`content/help/charts.md`, `content/help/price-changes.md` ("To see every result together, use
**Chart price histories**"), AGENTS.md ("Live Compare") and `client/CHARTS.md`. This replaces the
deleted `price-change-auto-buttons.patch`, which used title case.

Done when: no "Compare latest prices" or "Compare price histories" remains in `client/src`,
AGENTS.md or `client/CHARTS.md`.

### 2. Threshold and $0 rules in the library

`library/flagNadacPriceChange.ts`:

- `flagPriceChanges(packages, thresholdPercent = 10)`: the parameter is now a percent.
- Add and export `meetsThreshold(oldPrice, newPrice, thresholdPercent)`: false when the prices
  are equal; true when `oldPrice === 0`; otherwise the tenths rule above. Use it in
  `flagPackagePriceChanges` in place of `Math.abs(percentage) < threshold`.
- A change from $0 keeps `percentage: Infinity` in memory. It is never stored.

`library/priceActivity.ts`:

- `derivePriceEvents(prices, kind, thresholdPercent = 10)` passes the threshold through.
- `eventLabel`: from $0, "Rose from $0 to $X.XX {dates}".
- `signedChange`: from $0, percent "from $0" and the dollar amount as usual.
- `priceEventGroupLabel`: leave from-$0 events out of the min–max percent. If every event in the
  group is from $0, say "rose from $0".
- Add `parseScanThreshold(text: string): { percent: number } | { error: string }`, implementing
  the input rule.
- Add `PRICE_CHANGE_SCAN_MIN_PERCENT = 5` and `PRICE_CHANGE_SCAN_DEFAULT_PERCENT = 10` to
  `library/constants.ts`.

Tests (`flagNadacPriceChange.test.ts`, `priceActivity.test.ts`):

- `$1.00 → $0.90` meets 10.
- `$1.00 → $0.901` does not meet 10.
- `$10 → $11` meets 10.
- A 150% rise meets 150; a 100% drop meets 100.
- `$0 → $1` meets 500 and its labels contain neither `Infinity` nor `%`.
- Same-date duplicates are averaged before comparison: two prices on one date, whose average
  is a 10% change, meet 10.
- Packages and units are grouped separately.
- `parseScanThreshold` accepts `"5"`, `"7.5"` and `"150"`, and rejects `""`, `"abc"`, `"0"`,
  `"-5"`, `"4.9"`, `"7.55"` and `"Infinity"`.

Done when: the existing tests and these pass.

### 3. The list item, its helpers and persistence

`library/explorerItems.ts`:

- Add the types above, and update the header comment, which says only charts exist.
- `createPriceChangeListItem({ prices, groups, thresholdPercent, origin, dateWindow, colors })`.
  It stores histories with `toChartSeries(prices.filter(<package and unit in groups>), colors)`,
  computes `source` as described in Data model, and sets `layout: { width: "half" }` and
  `collapsed: false`.
- `priceChangeListGroups(item)`: returns
  `groupPriceEvents(derivePriceEvents(fromChartSeries(item.histories), "package", item.thresholdPercent))`.
- `fitsPinLimit(item)`: `JSON.stringify(item).length <= PRICE_CHANGE_LIST_PIN_LIMIT`.
- `createChartItem` gains an optional `source?: ExplorerItemSource`. When it is given, the item's
  source is `{ ...source, seriesCount: countNdcs(series) }` and the computed one is skipped. It is
  used by charts opened from a pinned list (step 6).
- `isScaleMatched`, `matchedPriceRange`: only `kind === "chart"` (check that lists are ignored).
  Make the TypeScript build pass everywhere the union is narrowed (`PinnedItemCard`,
  `PinnedChartDates`, `ChartItemBody`, any `item.series` use).

`library/persist.ts`:

- Add `isStoredPriceChangeList`: the same base checks as charts (id, titles, createdAt, layout,
  collapsed, source), plus:
  - `thresholdPercent` is finite, at least 5, and has at most one decimal;
  - `isDateWindow(dateWindow)`;
  - `histories` is a non-empty array of `isSeriesSnapshot`.
- In `validItems`, keep items passing either check, and apply the existing `searchSource` cleanup
  to both kinds. Lists never get `FULL_WINDOW`; a list without a `dateWindow` is invalid. No
  `VERSION` bump.

Tests:

- `explorerItems.test.ts`:
  - `createPriceChangeListItem` stores only the packages with events, and one history per
    package and unit, even when the package is in two groups.
  - Its `priceChangeListGroups` equal the live groups it came from.
  - `source.filtered` is false for an unfiltered result.
  - `matchedPriceRange` ignores lists.
  - `fitsPinLimit` is false for an oversized list.
- `persist.test.ts`:
  - A valid list round-trips.
  - A list with threshold 4, empty histories, or a bad point is dropped, while a valid chart pin
    beside it survives.
  - A list without `searchSource` loads with it unknown.

### 4. Scan state hook and the control row

New `hooks/usePriceChangeScans.ts`, called once in `NadacResults.tsx` and once in
`FdaResults.tsx` with the same `prices` passed to `PriceChangesSection` (`packageNadacPrices` on
FDA). It owns, scoped to `prices` identity the same way `openChartState` is in
`PriceChangesSection.tsx`:

- `autoClosed: boolean` and `closeAuto()`;
- `scans: Array<{ id, thresholdPercent, groups }>`, `runScan(percent)`, `closeScan(id)`;
- `emptyMessage: string | null`, and `clearEmptyMessage()`.

`runScan` derives the groups with `derivePriceEvents(prices, "package", percent)` and
`groupPriceEvents`. With no groups, it sets `emptyMessage`; otherwise it appends a scan (new
`crypto.randomUUID()` id) and clears `emptyMessage`.

`AutoCharts.tsx` gets `onScan` and `scanMessage` props and adds to its button row (it already
wraps on narrow widths, and renders nothing without prices):

- a `<form>` (so Enter scans) holding a small `TextField` (label "Change %", `type="number"`,
  `inputProps` `min: 5, step: 0.1`, about 7rem wide) and a **Scan price changes** button.
  Validate with `parseScanThreshold` on submit; on error, set the field's `error` and
  `helperText`. Editing the field clears the error and calls `clearEmptyMessage`.
- the `role="status"` empty message.

The scan control stays enabled when the Compare buttons are disabled for too many series.

Done when: scanning updates only the cards (step 5), and the build and lint pass.

### 5. Result cards: close, pin, and shared event charts

`Components/ResultsSection/PriceChangesSection.tsx`:

- Split the list body out of `NotablePriceChangesCard` into an exported `PriceChangeListBody`
  (`PriceEventsList` plus `PriceChangeRow`, with its details state and width tier). Step 6
  reuses it.
- Props become `prices`, `history`, `origin`, `colors`, `dateWindow`, plus `autoClosed`,
  `onCloseAuto`, `scans` and `onCloseScan`.
- Render order in the grid:
  1. the automatic card (if it has groups and is not closed);
  2. scan cards, oldest first;
  3. open event charts.
- Each card's `actions` are a pin button and a **Close** button. The pin builds the item with
  `createPriceChangeListItem`. If `fitsPinLimit` fails, show the size toast and stop. Otherwise
  `addItem` it and show `toast.success(Pinned "<title>")`.
- A new scan card moves focus to its heading and scrolls it to `nearest`, as `EventChangeChart`
  does.
- Closing a card moves focus to the next card's heading, else to the visually hidden section
  heading.
- Every list's **Chart this change** shares the one open-charts map. The key stays
  `eventKey(group, event)`, which does not depend on the list, so the same change charted from two
  lists is one chart, and both buttons show it pressed.
- In `currentCharts`, keep the `chart.prices === prices` check but remove the `groups.some(...)`
  check that drops a chart whose group is no longer listed. Charts stay until their
  own Close or new `prices`, even when their list closes. Close focus falls back to the section
  heading when the opener is gone (the existing `checkVisibility` logic).

Done when, checked in the browser (`npm run dev`), on both the NADAC page and the FDA page:

- two scans at the same percent make two cards;
- an empty scan shows the status text;
- closing the automatic card keeps open charts;
- new dates bring the automatic card back and remove scan cards;
- an oversized pin shows the toast.

### 6. Pinned lists and their temporary charts

`Components/ExplorerGrid/PinnedItemCard.tsx`:

- For `kind: "price-change-list"`, the menu has Move up, Move down, Half/Full width and Remove
  only (no Change dates, Match scale or Show price changes).
- The badges are the source chip, `formatItemSource`, and a plain (not clickable) dates chip
  showing `formatWindow(item.dateWindow, dateBounds(fromChartSeries(item.histories)))`.
- The body is `PriceChangeListBody` with the groups from `priceChangeListGroups(item)`
  (memoized on `item`).
- New optional props `openChartIds` and `onToggleChart` are passed only to list cards, so chart
  cards' props never change when a temporary chart opens.

`Components/ExplorerGrid/PinnedSection.tsx`:

- Local state holds temporary charts:
  `Map<key, { key, cardId, title, prices, colors, dateWindow, eventDate, source }>`, captured
  when opened.
  - `prices`: the package's history from `fromChartSeries`.
  - `colors`: `ndc → themedSeriesColor(color, palette.chart.series)`, as in `ChartItemBody`.
  - `source`: the list's `source`.
- Render them in a second `Grid container` below the pinned items. Reuse `EventChangeChart`:
  move it to its own file, `Components/ResultsSection/EventChangeChart.tsx`, and let it take an
  optional `source` that it passes to `PinButton` → `createChartItem`.
- Callbacks are stable (`useCallback`), and `EventChangeChart` stays `memo`.
- Render the section when there are pinned items or temporary charts. The count chip counts
  pinned items only.
- Change the description to "Pinned items keep their own data and dates: searches and filters
  don't change them."
- Removing or collapsing a list leaves its charts open. Close returns focus to the opener, else
  to the Pinned heading.

Done when, in the browser:

- after pinning a list, running a new search and reloading, the pinned list still shows its
  events;
- its Chart this change opens a chart below the pins, and that chart can itself be pinned;
- removing the list leaves the chart open;
- the standalone Search pins and a workspace tab's pins both work.

### 7. Docs and Help

- AGENTS.md: the Result tables paragraph on Notable price changes (it says "never stored";
  automatic and scan lists are now pinnable), and the scan control and empty-scan rule.
- `client/CHARTS.md`: the event-card paragraph, `PriceChangeListItem`, re-derived events, the
  size cap, and the temporary charts under Pinned.
- Help (`content/help/`), keeping topic IDs unchanged:
  - `price-changes.md`: scans, the 5% minimum, exact-percent rounding, the $0 rule, closing and
    pinning lists, and the button names.
  - `pinning-and-comparing.md`: pinned lists, what their menu offers, the size limit, and that
    their charts cover only the list's dates.
  - `charts.md`: the button names.
  - Add "scan threshold" to the `price-changes` keywords in `library/help.ts`.

### 8. Final checks

In `client/`, run each of these; all must pass:

```bash
npm test
```

```bash
npm run lint
```

```bash
npm run build
```

In the browser, also check:

- a phone width (375px), where the control row wraps and nothing scrolls sideways;
- the light and dark themes;
- the Help modal articles;
- Add search to workspace with a pinned list.

Add no component tests.

## Out of scope

- Changing Price Activity's 5% band, labels or ordering (beyond the tenths-rounding fix).
- Fetching prices for a scan.
- Saving transient scan cards, or whether the automatic card is closed.
- Change dates or Match scale on lists.
