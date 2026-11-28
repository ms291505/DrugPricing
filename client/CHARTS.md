# Charts and explorer cards

Design rules for the cards on the search pages and the recharts charts they draw. Read this
before changing anything in `Components/Charts/`, `Components/ExplorerGrid/`, or the chart
helpers in `src/library/`. `AGENTS.md` keeps a short list of the rules that matter everywhere.

## Explorer items: system vs. pinned

- *System* items (the results table, the charts Line and Bar added, and price change lists) are derived
  from the current search on every render and never stored.
- *Pinned* items are snapshots held by `PinnedItemsProvider`: one per workspace tab
  (`TabProviders.tsx`), plus a shared collection for the standalone FDA/NADAC Search area
  (`StandaloneSearchProviders.tsx`). Pin, and Line or Bar with Pin charts when you make them on, create them; new searches and filter changes never
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
- An item is an `ExplorerItem` (`library/explorerItems.ts`), a union on `kind`: `"chart"` and
  `"price-change-list"`. Narrow on `kind` wherever an item's data is read. A chart stores its data as `ChartSeriesSnapshot[]` (`ndc`, `label`, `unit`,
  `points: [ms, price][]`), plain JSON so it persists. `fromChartSeries` turns it back into
  `ChartPrice[]`.
- **Chart dates are a view setting, not a filter.** A chart item keeps *every* date of its series
  and stores the dates it shows as `dateWindow` (`DateWindow` in `library/dates.ts`: ms,
  inclusive, a null end is open), which the card's dates chip can widen later. `UnitSplit` clips
  to the window, and `LineViz` stretches the x-axis across all of it, so a late series shows a gap.
- There is no page-level chart dates control: the search panel's **Dates** decide which prices
  load, and so the window of everything on the page. Added charts show the result's dates (the
  view's `dateWindow`: the search's, snapped to as-of dates); Pin starts new
  items at them, as fixed dates, with every loaded date of their series (`withLoadedDates`
  over the view's `loadedPrices`). After a narrowing that didn't fetch, more is loaded than shown;
  the item's dates chip can widen to it, and `filtered` doesn't mistake the dates for a filter. `ChartDatesControl` is the dates picker of each pinned chart and
  of the search panels (`DatesField`, with a Custom preset).
- Significant package events are derived over the refined result by `derivePriceEvents` and
  `flagPriceChanges`, at 10% (`NOTABLE_PRICE_CHANGE_PERCENT`) or a scan's percent, compared in
  tenths of a percent (`meetsThreshold`). A change from $0 has `percentage` `Infinity` in memory and
  is shown only through `eventLabel` and `signedChange`, as "from $0". The scan control is in
  the results toolbar in the heading's row, after Line and Bar, with its report under that row.
  Below the table, `ResultCards` fills the shared responsive grid, all half width: Notable price
  changes, the added charts, and one card per scan with matches (`usePriceChangeScans`, called
  once per page with the packages' `prices`), in the order they appeared (`madeCardsInOrder`, by
  each card's `order`). So a new card always goes after the cards already there. Notable opens
  first with each result and keeps its place while it stays open (`trackNotable`); when new
  dates or filters bring it back after it was closed or empty, it goes after the cards already
  there, so it never moves them. Change charts open in a dialog, not the grid (below).
  `ResultCards` is always mounted and holds the list headings for focus and the Package details
  choices (Notable price changes keyed by group key, which survives searches; scans by scan id and
  group key, since lists at different percents share group keys). Each list card measures its own
  width (`useWidthTier` on its Grid item) and has Pin and Close. Its body, `PriceChangeListBody`,
  groups by date, pricing unit and direction, and shows five groups before Show all. Each group's
  Package details is a small table (NDC, was, now, change), open by default at every card width.
  A group the user opens or closes stays so while the page is mounted. Each package row
  has an outlined chart icon button (`aria-haspopup="dialog"`; it doesn't toggle) that opens that
  change in `PriceChangeChartDialog`, a local MUI `Dialog` that `PriceChangeListBody` renders for
  results lists and pinned lists alike. One change is open at a time; new prices (new groups)
  close it, and it closes itself while its page is hidden. MUI moves focus into it and back to the
  button on close; after a tap the button didn't hold focus, so nothing is restored. `eventDate` marks the
  change with a solid line (the lock's is thin and dashed), and the readout rests on that date
  instead of the latest. A pin keeps `eventDate`; pins without it draw as before. The chart has
  no event list and no way to zoom itself: neither the readout nor the plot lists events, and there
  is no Around this change. Legacy pins that stored a zoomed `dateWindow` (made by the old Around
  this change) still load and draw that window; the pinned card's Dates control is the only thing
  that changes a pin's `dateWindow` now.
- **A pinned price change list stores histories, not events.** `createPriceChangeListItem` keeps the
  shown prices (already clipped to the shown dates) of the packages and units the list names, as
  `histories: ChartSeriesSnapshot[]`, plus `thresholdPercent` and the shown `dateWindow`.
  `priceChangeListGroups` derives the events again when drawn, as pinned line charts derive their
  markers, so there are no event references to validate. Its `source.filtered` compares the
  histories with the result over the same dates. A list whose JSON is over
  `PRICE_CHANGE_LIST_PIN_LIMIT` (500,000 characters) is not pinned (`fitsPinLimit`); it is never
  truncated. A pinned list's dates are fixed: its menu has only Move up, Move down, Half/Full width
  and Remove, and its dates chip isn't clickable. Its Chart button opens the dialog over the list's
  dates only, and a pin of it keeps the list's provenance (`createChartItem`'s `source`).
- Price Activity (`library/priceActivity.ts`) uses per-package range, rounded to 0.1% at the
  5% cutoff; significant steps remain 10%. Product state comes from packages, never their
  average, and product rows have no sparkline. Package sparklines use `fittedPriceAxis`.
- **"Match scale" is per chart.** A pinned line chart's menu toggles `ChartItem.matchScale`; the
  matched charts in one unit share a fitted axis (`matchedPriceRange`) and show a "Matched scale"
  chip. New pins start unmatched. A tab-wide switch put $0.25 metformin on humira's $0–$8K axis,
  so don't match charts the user didn't choose.
- An item's `source` (provenance chip) is computed by `createChartItem` from its data against the
  whole unfiltered result (`ChartOrigin.resultPrices`), never from filter state, so it stays true
  once stored. `filtered` compares whole series, not windows. What a series is is stored as
  `seriesKind` (`"product" | "package" | "ndc"`); wording comes from one table in
  `explorerItems.ts`. `searchSource` (`"nadac" | "fda"`) is separate and comes from the chart
  origin, never inferred from the `seriesKind` or search terms. Old pins without it show "Search
  source unknown"; invalid values are dropped field by field during persistence, retaining the
  rest of the pin.
- **Show packages** switches a product pin to package lines when every stored point has a
  known `packageNdc`. `packageLevelView` derives those series from the snapshot, preserving dates
  and units. **Show product averages** returns to the original product averages and settings. Pins with
  missing or partial package identities omit the button.
  Never fill an unknown package identity from a product NDC. In newly created snapshots,
  `packageNdcs` uses `null` for unknown point identities and keeps the array aligned with points.
- Each pinned card has a separate search source badge (`NADAC Search`, `FDA Search`, or unknown).
  Its tooltip states that every plotted price is NADAC; FDA reference data only finds and groups
  products. The dates chip, in the header's details under the title, is the actual date window,
  and Match scale shares axes only by pricing unit.
- Every card uses `ExplorerGridItem`: a `<section>` labelled by its heading (`h2` on the page,
  `h3` inside Pinned and for Price changes), with a collapse toggle wired with
  `aria-expanded`/`aria-controls`. On a phone (below `sm` by window width, as for the dialogs,
  never the card's width) every card's header is compact: the toggle and actions, at 44px, on a
  row of their own; then the title across the card on one line, its name cut with an ellipsis
  and a chart's unit end ("· USD per mL") kept in view; then one smaller row with the details
  and the subtitle. The DOM follows that order, so reading and tab order match it. The full
  title stays the heading's text and the truncation tooltip. Desktop cards, half width
  included, keep the two-line title, the details line and the subtitle.
- FDA table row ids are the NDC that level's chart data uses (product or package NDC), which is
  what Line and Bar filter on (`selectedChartPrices`). `setFdaResultDetailLevel` clears the
  selection on every level change.

## Chart data

- Charts take `ChartPrice[]`, which `NadacPrice` satisfies. A series is one `ndc`. At FDA product
  level that is the *product* NDC, so several packages share a series and can disagree on a date:
  `seriesByDate` (`library/prices.ts`) averages them per date, and `createLineVizData` draws that
  average and keeps the packages' min–max as `rangeKey(ndc)`.
- `LineViz`/`BarViz` render through `UnitSplit`, which splits by `pricingUnit`. Unit charts share
  one date axis. A card's title gives its currency and unit ("USD per mL", below); where it
  doesn't (older pins, mixed-unit ones among them, and titles the user chose), `UnitSplit` puts
  that heading above each unit's chart instead (`titleNamesUnit`).
- New pinned cards contain one pricing unit (`createChartItems`); mixed-unit pins are added in
  one update, highlighting the first, with no scroll. Older mixed-unit pins still use `UnitSplit`.
- Added charts (`AddedChartCard`): each press of Line or Bar in the results toolbar adds a chart
  of the selected rows that are shown, drawn as one card per pricing unit, next to each other
  after the cards already there, and never stored. The
  page holds them (`useAddedCharts`), each with its rows' ids, and resets them during render when
  its reset keys change (a new search, Clear search, FDA's detail level). Line and Bar are
  disabled past `CHART_SERIES_LIMIT` (30) **series**, not price rows, counted before splitting by
  unit; a shown row is one series at the table's level, so the label counts shown rows that way
  and names hidden ones. An add past `CHART_SERIES_WARNING` (8) toasts a warning (`ChartControl`).
  A new card neither scrolls nor takes focus: the status line reports it (`ResultsReport`), and
  its Show scrolls to the card (`data-added-chart`) and focuses its heading only from the keyboard.
- A chart card's header has three parts (`chartTitles.ts`, `ExplorerGridItem`). The title
  names the search, or the one series by its own label, and the currency and unit ("Humira · USD
  per mL"), so the cards a search splits into by unit differ by their headings; it is what a pin
  stores, and a title the user chose is kept as typed. Under it, on its own line, the details:
  a bar chart's bar value ("Latest price", `barValueLabel`) and every chart's dates
  (`chartDates`; on a pinned card, its Dates control, the dates chip). They are read live, so
  they follow the bar value toggle and the dates, and are never stored in the title. Bar charts
  show their dates there too, since the bar value and range are over those dates. The subtitle
  gives the series count and hidden note on added cards; a pinned card's count is in its
  provenance chip. Line and bar charts of the same rows share a title. The change chart dialog's
  title names the event date, package and unit, and its context line under it gives the list and
  dates. On a phone the details move down beside the subtitle (the compact header, above), the
  bar value included: the one title line keeps what the chart is, and the second row says how
  it's drawn.

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
so filters never move it. `useSeriesColors` resolves clashes once per page and series level
(inside the page's `ChartSource`), so every chart on a page agrees. Pins store each series' `color`, since the result is gone after the next
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
- **Price changes** are derived from the visible series and dates (`lineChangeCallouts`). Each
  package event has old/new dots and a dashed old price; one pill per date gives agreed prices
  or a change count. Exact package values and gap spans are in the Notable price changes card under the results
  table (package charts' View data has exact prices); the readout shows only prices.
  Product markers come only from actual package events, never jumps in their average.
  New product snapshots retain each point's package in `ChartSeriesSnapshot.packageNdcs`;
  old product pins without this identity still draw, but cannot infer package events. A legacy
  `changeSpan` draws a fallback callout inside the shown dates when no derived callout marks
  that date. The solid `eventDate` reference line marks the change a dialog or its pin opened on
  independently of callout visibility. Pinned line charts save `showPriceChanges`
  (absent means on); added charts always mark events. Bars have no event markers.
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

A bar card keeps its natural height (`BAR_ROW_HEIGHT` per row plus the plot's margins), so beside a taller
line card it simply ends sooner; never stretch it to the row.

## Docked readout (no floating tooltips)

Each unit chart shows its values in a fixed box above the plot (`ReadoutDock`), never in a
tooltip that floats over the plot or sits under a finger. The box is recharts' `Tooltip`
rendered there through `portal` (`DOCKED_TOOLTIP` keeps it showing between points), so hovering
re-renders only the readout, not the chart.

- **What it shows:** the hovered point; else the locked one; else, on a line chart, the
  chart's `eventDate` ("· this change") or the latest date ("· latest"), and on a bar chart a hint.
  It holds the date and unit, Unlock when locked, and the series rows. Line chart callouts mark
  changes on the plot. The price change lists below the results table show package details.
  The dock reserves its height (`lineReadoutHeight`,
  `barReadoutHeight`, counting the dock's frame, gaps and range lines) so the plot doesn't move
  under the pointer; undrawn pinned charts reserve it too (`ChartItemBody`). Past
  `READOUT_MAX_HEIGHT` its rows scroll under a header that stays put (`ReadoutContent`).
  Every readout line is one ellipsised line (its full text in a `title`),
  except the bar readout's description, which clamps at two lines and is always reserved at two,
  so the dock's height never depends on the text or the card's width.
- **Locking** (`useLockedPoint`): click or tap locks the date or bar under the pointer, and a
  second click unlocks. Enter or Space lock the point the arrow keys reached, Esc unlocks, and the
  header has an Unlock button. Esc gives focus back to the chart, and so does Unlock when it had
  focus (after a tap on iOS it has none); in a dialog the second Esc closes it. A lock on a point the rows
  no longer hold (a new search, or a filter hid it) counts as no lock. While locked the `Tooltip` is `active={false}`, so the pointer no
  longer moves the readout, and the chart marks the point (a dashed line, or the row highlight).
  Don't use recharts' `trigger="click"`: it can't be dismissed, and after one click the arrow
  keys no longer move the readout.
- React events bubble out of a portal to its React parents: `ReadoutContent` stops them (keys too, except Escape, which
  reaches the chart's lock and then a dialog), or a click on Unlock would also reach the chart and lock again.
- The `Tooltip`'s `content` is an element (`LineTooltip`, `BarTooltip`), never an inline
  function: recharts renders a function with `createElement`, so a new one each render is a new
  component type and remounts the readout. Tabbing off the chart re-renders it, and Unlock was
  replaced as focus reached it.
- The line readout gives the date and unit once, then swatch, NDC and price per series, highest
  first; descriptions, ranges and package counts show from `md` up. Check new lines at phone
  width.

## Accessibility

- Each unit chart's SVG keeps recharts' `role="application"` (never `role="img"`, which broke its
  name and arrow keys), with `aria-label` "<title>, USD per <unit>", or just the title when it
  gives the unit (`unitChartLabel`), and `aria-describedby` to a hidden summary
  (`chartSummary.ts`). Don't turn off `accessibilityLayer` or reach into recharts' store. Keys
  are recharts' ←/→/Enter (reversed on the vertical bar charts); Enter or Space also lock the
  readout and Esc unlocks it.
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
formula injection. Its file name (`csvFileName`) is the title's slug, the chart type and the
dates, so a search's unit cards, and its line and bar charts, save under different names.

## Animations

Off (`isAnimationActive={false}`): recharts morphs the old line into the new one point by point,
which drew made-up prices when the dates changed.
