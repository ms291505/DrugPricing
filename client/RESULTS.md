# Result tables and search charts

Each table is one file in `ResultTables/` that takes its search's data and `loading` as props,
lists its columns, and renders `ResultTable` (paging, and the selection that Line and Bar chart).
`ResultsSection` gives it its `Paper`. Rows are built in `library/resultRows.ts` (tested): each
carries `priceSummaries` (`summarizeByUnit`, from the prices the row's chart would draw, keyed the
same way), and `createPriceColumns` (`priceColumns.tsx`) shows them, each price with its unit and
sorted by unit first. Each unit's summary is `stale` when its latest price is before
`currentAsOfDate` (`library/prices.ts`: the shown dates' snapped end, capped at app-init's last
loaded as-of date, not the rows' own newest date, which it falls back to only when app-init fails); Latest Price shows a warning triangle with
the date, so Latest Price Date is hidden by default. A row without prices can't be selected. Keep Latest Price second or third:
on a phone it must show without scrolling. The FDA package table leads with Brand Name on wider
tables but orders NDC, Latest Price, Brand Name on narrow ones (`narrowOrder`, from the table's own
width tier), since the checkbox, Brand Name and NDC before the price don't fit a phone.

`ResultFooter` puts Columns and Reset columns beside pagination; below the table's own `sm`
width it omits Reset and keeps Columns and pagination on one row. Reset is disabled when the
visible columns match defaults. Column visibility choices
are saved per table type in Settings (`columnOverrides`), shared by standalone pages and
workspace tabs and followed by other windows. Save only deviations from `DEFAULT_HIDDEN_COLUMNS`,
merge them over current defaults, and clear them on Reset: saving the complete default model
would freeze defaults for browsers that never customized. Validate each table and field independently.

`AutosizeColumns` sizes every visible data column (not the checkbox) to its widest rendered cell
or header after data, visibility, paging, sorting, filtering and column-array changes. Bounds are
`min`/`max` from `COLUMN_BOUNDS` (`library/columnBounds.ts`, by field, with optional
`medium`/`narrow` overrides for the table's own width tier). `ResultTable` applies them, so no
column def gives a width, and a test requires every column to have an entry. `min` is the
column's `minWidth`; `max` is only autosizing's (`autosizeMaxWidths`, capped right after the
grid's autosize), never a `maxWidth`, so a user can drag a column wider than autosizing makes it.
A double-click on a column's edge sizes it to its content again, within `max` (`AutosizeColumns`
handles it; the grid's own, unbounded one is off with `disableAutosize`). The rule: autosize
already floors a column at its header, so `min` is only the content floor and `max` is the widest
real content or unsorted header (narrow may go lower and ellipsise). A tier flip makes a new
`columns` array. The grid measures only the rows it has rendered. A column the user dragged
(`columnResize`, published only by drag moves) keeps its width until the columns change or its edge is
double-clicked.

`AutosizeColumns` is a separate component so only its small visibility observer re-renders on a
page/tab switch; the table does not. Hidden pages measure nothing until shown. Narrow tables use
44px rows and headers. NDC columns use tabular digits and a fixed width that fits the complete
source identifier.

Price Activity (`library/priceActivity.ts`) classifies package histories over the shown dates, using
a rounded 5% range cutoff and 10% significant steps (`NOTABLE_PRICE_CHANGE_PERCENT`). Every
threshold compares in tenths of a percent (`meetsThreshold`), and a change from $0 meets every
threshold and reads "from $0", never as a percent. Products use their packages' states, not an
averaged line; only package rows have sparklines. Each package activity also has a filter
category (`category`, set in the branch that writes its label): **the category is what the row
says**, so "Dropped" and "Down" rows are Dropped, "Rose" and "Up" are Rose, "Dipped" and
"Spiked" are Dipped or spiked, then Stable and Insufficient history (one observation). Mixed units
and no price history have none. FDA's Price activity filter hides packages by it (a product shows
while any package does, read from its shown packages), so it works the same at both detail
levels. Every way to act on the results is in one
toolbar in the results heading's row (`ResultsToolbar`): the chart label, Line and Bar, Scan price
changes, then FDA's detail level. It is one flex item, so when the heading and the toolbar don't
fit one line, the heading takes its own line first, and only then does the toolbar wrap. The
status line and Show sit under that row (`ResultsReport`), reporting the newer of the last scan
and the last added chart. Line and Bar add a card, as Scan does: each press adds one of the selected
rows that are shown (`selectedChartPrices`, `useAddedCharts`, `AddedChartCard`), after the cards
already there, and the selection stays. A card keeps its rows (their ids) while the selection changes and redraws with
the dates and filters; a row they hide drops out and the subtitle counts it ("2 hidden"), and a card
whose rows are all hidden stays with a note so it can be closed. Each pricing unit's card closes on
its own, and closing the last one on screen keeps the chart while a unit the filters hide is still
open (`openPricingUnits`). A new search, Clear search and an
FDA detail level change remove every added card (`useAddedCharts`' reset keys) and clear the
selection. The table keeps a hidden row selected (`keepNonExistentRowsSelected`), and the label
counts shown rows and names hidden ones ("Chart 3 selected (5 hidden)"), but unchecking every shown
row clears the hidden ones too. Line and Bar are disabled with no shown selection or past 30 series
(`CHART_SERIES_LIMIT`), and an add past 8 (`CHART_SERIES_WARNING`) toasts a warning. A new card
neither scrolls nor takes focus; with the `autoPinCharts` setting an add also pins a copy. On the narrow tier the chart label is a
caption above Line and Bar, and Scan is a short "Scan" under a "Price changes" caption, each as
wide as its caption, so both groups fit one line on a phone, and FDA's detail level comes first,
on its own line under the heading. The table's count line, on every width, lists only the
activity states that have rows and names the price ("3 with significant price changes, 1 with
stable prices"; `activityCounts`), then the shown dates unless they're All.
The scan popover offers 5%, 10%, and 20% presets and accepts a custom threshold of at least 5%
with up to one decimal place. Price change list cards share the responsive
half-width grid with the added charts (`ResultCards`): Notable price changes (10%, when it has
changes), the added charts, and one card per scan with matches (`usePriceChangeScans`, even at a
percent already scanned), in the order they appeared (`madeCardsInOrder`). A new card always
goes after the cards already there, and closing one moves none of the others. Notable comes first
with each result and keeps its place while it stays open; when new dates or filters bring it back
after it was closed or had no changes, it goes after the cards already there (`trackNotable`). Every scan reports what it found in a `role="status"` line under the heading row
(`ResultsReport`: "Found N package changes…", or none), and a scan with no matches makes no card. A
new card neither scrolls nor takes focus: beside the report, Show scrolls to it and focuses its heading only from the
keyboard, and goes once that card is closed.
Each list groups by date, unit and direction, each with its packages' old and new prices (below a
420px list the Was column goes, so each row's Chart button fits beside its NDC on a phone), and can be
pinned or closed. The cards are never stored; a pin stores a `PriceChangeListItem` snapshot (see
[Charts and explorer cards](CHARTS.md)). Each package row has a chart icon button that opens that package's change in a
dialog (`PriceChangeChartDialog`) over the shown dates, with the change marked and the readout
resting on it. It is one chart at a time, on every screen; Pin keeps a copy. New prices (a search,
or new dates or filters, but not the FDA detail level) remove every scan, close the dialog and
reopen Notable price changes. Close on an added chart or a list, when it holds focus, moves it to
the next card's toggle, else the previous card's, else the results heading
(`moveFocusFromClosingCard`). Added chart cards are never stored. New product pins retain package identity per point; see [Charts and explorer cards](CHARTS.md) for callout and
legacy-pin rules.
