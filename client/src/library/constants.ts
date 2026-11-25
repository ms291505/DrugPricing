/** A new NADAC search covers this many months, ending at the last loaded as-of date. */
export const DEFAULT_NADAC_SEARCH_MONTHS = 12;
/**
 * How much a fitted price axis may exaggerate a change (see `fittedPriceAxis`): 4 means a 10%
 * change fills at most 40% of the chart height. Lower is stricter; 1 is about a $0 baseline.
 */
export const MAX_AXIS_EXAGGERATION = 4;
export const MIN_NDC_DESCRIPTION_LENGTH = 5;
export const MIN_NDC_LENGTH = 5;
export const DEFAULT_DATA_GRID_PAGE_SIZE = 5;
export const DATA_GRID_PAGE_SIZES = [5, 10, 25];
export const NDC_NDC_DESCRIPTION_DELIMITER = " - ";
export const DEFAULT_TOOLTIP_FONT_SIZE = 12;

export const CONSTANT = {
  staleTime: 1000 * 60 * 10,
  drawerWidth: 240,
  opacity: 0.6,
  tabContextFabHeight: 220,
}

export const SMALL_SPACING = 1;

/** Above this many series (NDCs), turning on or growing a live chart warns that it may be slow and hard to read. */
export const CHART_SERIES_WARNING = 8;
/** The most series a live chart draws: past it, Line and Bar turn off and can't be turned on. */
export const CHART_SERIES_LIMIT = 30;
/**
 * The percent of a significant package price change: the automatic Notable price changes card,
 * Price Activity and line-chart markers.
 */
export const NOTABLE_PRICE_CHANGE_PERCENT = 10;
/** The lowest percent a price change scan accepts: lower lists cover most of a result. */
export const PRICE_CHANGE_SCAN_MIN_PERCENT = 5;
/** The scan field's starting percent. */
export const PRICE_CHANGE_SCAN_DEFAULT_PERCENT = NOTABLE_PRICE_CHANGE_PERCENT;
/**
 * The most characters (`JSON.stringify`) a pinned price change list may take. Lists are stored in
 * `localStorage` with the tab; a bigger one isn't pinned, never truncated.
 */
export const PRICE_CHANGE_LIST_PIN_LIMIT = 500_000;
/** Grid size of a half-width chart card on both search pages: full width below `md`. */
export const HALF_WIDTH_GRID_SIZE = { xs: 12, md: 6 };

/** The stale marker's icon size and its gap to the price, in px: the Latest Price column's maximum allows for both. */
export const STALE_MARKER_SIZE = 16;
export const STALE_MARKER_GAP = 4;
export const STALE_MARKER_WIDTH = STALE_MARKER_SIZE + STALE_MARKER_GAP;
