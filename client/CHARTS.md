# Charts and explorer cards

Design rules for the cards on the search pages and the recharts charts they draw. Read this
before changing anything in `Components/Charts/`, `Components/ExplorerGrid/`, or the chart
helpers in `src/library/`. `AGENTS.md` keeps a short list of the rules that matter everywhere.

## Explorer items: system vs. pinned

- *System* items (the results table, auto charts, price-change charts) are derived from the
  current search on every render and never stored.
- *Pinned* items are snapshots held by `PinnedItemsProvider` (one per tab, wired in
  `TabProviders.tsx`). Chart selected and Pin create them; new searches and filter changes never
  touch them. Don't clear them on search, and don't write system charts into them. The Pinned
  section sits on the page below the results (`PinnedSection`, `memo`'d), whatever the search
  state, so pins show while a search is missing, loading, or failing.
- **A change to one pinned item redraws only its card.** The provider splits into three contexts
  (`Context/pinnedItemsContexts.ts`): the items (`usePinnedItems`, for the section and the tab
  save), the actions (`usePinActions`, stable) and the add highlight (`usePinHighlight`).
  `PinnedSection` passes each card its own `highlight`, and the shared Match scale ranges only to
  matched cards, kept while unchanged (`useStableValue` with `samePriceRanges`). `PinnedItemCard`
  and `ChartItemBody` are `memo`'d, and the provider keeps the identity of every item it doesn't
  change. A pinned chart is drawn once it comes within a screen of the viewport
  (`useNearViewport`) and kept after.
- **Hover doesn't re-render a chart.** `useChartReadout` keeps the pointer's active point in refs
  and copies it to state only while the arrow keys drive it (for the screen-reader readout).
  `LineViz` and `UnitSplit` memoize what they derive from their prices.
- An item is an `ExplorerItem` (`library/explorerItems.ts`), a union on `kind` (only `"chart"`
  today). A chart stores its data as `ChartSeriesSnapshot[]` (`ndc`, `label`, `unit`,
  `points: [ms, price][]`), plain JSON so it persists. `fromChartSeries` turns it back into
  `ChartPrice[]`.
- **Chart dates are a view setting, not a filter.** A chart item keeps *every* date of its series
  and stores the dates it shows as `dateWindow` (`DateWindow` in `library/dates.ts`: ms,
  inclusive, a null end is open), which the card's dates chip can widen later. `UnitSplit` clips
  to the window, and `LineViz` stretches the x-axis across all of it, so a late series shows a gap.
- There is no page-level chart dates control: the search panel's **Dates** decide which prices
  load, and so the window of everything on the page. Auto charts show the result's dates (the
  view's `dateWindow`: the search's, snapped to as-of dates); Chart selected and Pin start new
  items at them, as fixed dates, with every loaded date of their series (`withLoadedHistory`
  over the view's `history`). After a narrowing that didn't fetch, more is loaded than shown;
  the item's dates chip can widen to it, and `filtered` doesn't mistake the dates for a filter. `ChartDatesControl` is the dates picker of each pinned chart and
  of the search panels (`DatesField`, with a Custom preset).
- Price-change charts (`PriceChangeCards`, on both search pages) are flagged per package over the
  refined result (`flagPriceChanges`), so only inside the search's dates. Each opens on
  ±`PRICE_CHANGE_WINDOW_MONTHS` around the change (`changeSpan`, stored on pinned copies too) and
  toggles to the full history. Past `MAX_AUTO_PRICE_CHANGE_CHARTS` a note gives the count
  instead of charting them.
- **"Match scale" is per chart.** A pinned line chart's menu toggles `ChartItem.matchScale`; the
  matched charts in one unit share a fitted axis (`matchedPriceRange`) and show a "Matched scale"
  chip. New pins start unmatched. A tab-wide switch put $0.25 metformin on humira's $0–$8K axis,
  so don't match charts the user didn't choose.
- An item's `source` (provenance chip) is computed by `createChartItem` from its data against the
  whole unfiltered result (`ChartOrigin.resultPrices`), never from filter state, so it stays true
  once stored. `filtered` compares whole series, not windows. What a series is is stored as
  `seriesKind` (`"product" | "package" | "ndc"`); wording comes from one table in
  `explorerItems.ts`.
- Every card uses `ExplorerGridItem`: a `<section>` labelled by its heading (`h2` on the page,
  `h3` inside Pinned), with a collapse toggle wired with `aria-expanded`/`aria-controls`.
- FDA table row ids are the NDC that level's chart data uses (product or package NDC), which is
  what Chart selected filters on. `setFdaResultDetailLevel` clears the selection on every level change.

## Chart data

- Charts take `ChartPrice[]`, which `NadacPrice` satisfies. A series is one `ndc`. At FDA product
  level that is the *product* NDC, so several packages share a series and can disagree on a date:
  `seriesByDate` (`library/prices.ts`) averages them per date, and `createLineVizData` draws that
  average and keeps the packages' min–max as `rangeKey(ndc)`.
- `LineViz`/`BarViz` render through `UnitSplit`, which splits by `pricingUnit` and captions each
  chart with its unit. Unit charts share one date axis.
- Auto charts are gated on **series** count, not price rows (`shouldAutoChart`).
- Titles come from `chartTitles.ts`: the title says what is common ("Humira: 7 products over
  time"), the subtitle the count and dates. Price-change cards name the percent, date and package.

## Axes and labels

- `fittedPriceAxis` (`chartScale.ts`) makes the visible span at least
  `max / MAX_AXIS_EXAGGERATION` (4: a 10% change fills at most 40% of the height), centers it,
  never goes below $0, and rounds to round ticks. Line charts and Match scale use it; bar lengths
  start at $0 (`zeroBasedAxis`). The author considers small changes drawn big misleading.
- Tick labels: `priceTickFormatter` (precision follows the step). Value labels: `formatPriceLabel`
  (three significant digits under $1). Full prices in readouts and tables: `formatPrice`.

## Colors

`palette.chart.series` has 10 color-blind-safe colors, each at least 3:1 on the card
(`chartPalette.test.ts`). Each NDC prefers the slot of its position in the *unfiltered* result,
so filters never move it. `useSeriesColors` resolves clashes once per page, so every chart on a
page agrees. Chart selected and Pin store each series' `color`, since the result is gone after the next
search. Pass the page's map to `LineViz`/`BarViz` as `colors`.

## Line charts

- Steps (`type="stepAfter"`): a NADAC price holds until the next weekly file. One series has no
  legend; the title names it.
- **Package band.** When a line averages packages that differ in price, a band shades their
  lowest to highest price, and one caption (`averagedLineCaption`) explains line and band. Neither
  shows unless the band is visible: same-price packages have no range (`distinctRange`), and a
  spread under 1% of the axis span is dropped (`visibleBandNdcs`). E.g. Humira 0074-0124's $9
  spread is dropped on its own $5.5K–$8K axis and on the 7-product $2K–$7K axis. A dropped band
  still shows its range in the readout (from `md` up), View data and the CSV. Bands are rare:
  most products price every package the same per unit (liquids' bottle sizes are the exception).
- **Price changes** are called out on the line: dots at the old and new price, the old price
  continued dashed, and a pill with "$9.69 → $5.52" (`ChartChangeSpan.from`/`to`), outlined in
  `palette.chart.drop` or `chart.rise` (today the success and error colors). The percent stays in the title. Spans pinned before prices
  were stored get a dashed line labeled with the percent.
- **Legend** (`SeriesLegend`) toggles and highlights series. Toggles are view state
  (`seriesVisibility.ts`), never stored, reset when the series in the dates change; the last shown
  series can't be hidden. Hiding never recolors. Hidden series leave the axis fit
  (`linePriceAxis`), but a Match scale range stays.

## Bar charts

Horizontal and sorted. Each row shows the latest price or the average over the chart's dates
(`BarValue`, a toggle stored on pinned bars) and the low–high range over the same dates, all from
`summarizePrices` (`library/prices.ts`), which uses the per-date values the line draws (at product level, the averaged
line, never the spread between packages). The `barStyle` setting draws a row as a `dot` on a
fitted axis (default) or a `bar` from $0 with a gray range track. Rows are drawn in the `Bar`
`shape`. Don't use recharts' `ErrorBar` (stale scale, ranges at half price) or
`allowDataOverflow` on the value axis (clips the value labels).

## Docked readout (no floating tooltips)

Each unit chart shows its values in a fixed box above the plot (`ReadoutDock`), never in a
tooltip that floats over the plot or sits under a finger. The box is recharts' `Tooltip`
rendered there through `portal` (`DOCKED_TOOLTIP` keeps it showing between points), so hovering
re-renders only the readout, not the chart.

- **What it shows:** the hovered point; else the locked one; else, on a line chart, the latest
  date ("· latest"), and on a bar chart a hint. It reserves its height (`lineReadoutHeight`,
  `barReadoutHeight`, counting the dock's frame, gaps and range lines) so the plot doesn't move
  under the pointer; undrawn pinned charts reserve it too (`ChartItemBody`). Past
  `READOUT_MAX_HEIGHT` its rows scroll under a header that stays put (`ReadoutContent`).
- **Locking** (`useLockedPoint`): click or tap locks the date or bar under the pointer, and a
  second click unlocks. Enter or Space lock the point the arrow keys reached, Esc unlocks, and the
  header has an Unlock button, which gives focus back to the chart. A lock on a point the rows
  no longer hold (a new search, or a filter hid it) counts as no lock. While locked the `Tooltip` is `active={false}`, so the pointer no
  longer moves the readout, and the chart marks the point (a dashed line, or the row highlight).
  Don't use recharts' `trigger="click"`: it can't be dismissed, and after one click the arrow
  keys no longer move the readout.
- React events bubble out of a portal to its React parents: `ReadoutContent` stops them, or a
  click on Unlock would also reach the chart and lock again.
- The line readout gives the date and unit once, then swatch, NDC and price per series, highest
  first; descriptions, ranges and package counts show from `md` up. Check new lines at phone
  width.

## Accessibility

- Each unit chart's SVG keeps recharts' `role="application"` (never `role="img"`, which broke its
  name and arrow keys), with `aria-label` "<title>, USD per <unit>" and `aria-describedby` to a
  hidden summary (`chartSummary.ts`). Don't turn off `accessibilityLayer` or reach into recharts'
  store. Keys are recharts' ←/→/Enter (reversed on the vertical bar charts); Enter or Space also
  lock the readout and Esc unlocks it.
- `useChartReadout`: a hidden `role="status"` region, present and empty from the first render,
  speaks the active point 300ms after the last key while the SVG has focus; pointer movement
  silences it. Keep only a primitive key of `useActiveTooltipDataPoints` in state (the rows are
  rebuilt each render, and storing one loops). Text comes from `chartReadout.ts`, whose
  `tooltipRows` the line readout uses too.

## View data and CSV

`ChartData` under every chart shows every series, whatever the legend hides, over the chart's
dates: line rows are the drawn per-date values, bar rows the `summarizePrices` rows. The table
shows a range only when its ends print differently. The CSV (`chartCsv.ts`) keeps every range,
uses ISO UTC dates, plain rounded numbers, a BOM and CRLF, and guards text fields against
formula injection.

## Animations

Off (`isAnimationActive={false}`): recharts morphs the old line into the new one point by point,
which drew made-up prices when the dates changed.
