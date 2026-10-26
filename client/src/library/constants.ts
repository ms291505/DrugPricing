/** A new NADAC search covers this many months, ending at the last loaded as-of date. */
export const DEFAULT_NADAC_SEARCH_MONTHS = 12;
/**
 * How much a fitted price axis may exaggerate a change (see `fittedPriceAxis`): 4 means a 10%
 * change fills at most 40% of the chart height. Lower is stricter; 1 is about a $0 baseline.
 */
export const MAX_AXIS_EXAGGERATION = 4;
/** Price-change charts focus on this many months either side of the change. */
export const PRICE_CHANGE_WINDOW_MONTHS = 3;
export const MIN_NDC_DESCRIPTION_LENGTH = 5;
export const MIN_NDC_LENGTH = 5;
export const DEFAULT_DATA_GRID_PAGE_SIZE = 5;
export const DATA_GRID_PAGE_SIZES = [5, 10, 25];
export const NDC_NDC_DESCRIPTION_DELIMITER = " - ";
export const DEFAULT_TOOLTIP_FONT_SIZE = 12;
export const FILTER_SELECT_DELIMITER = " | ";

export const CONSTANT = {
  label: {
    includeOtcFilter: "Include OTC Products",
    ndcDescriptionNadacSearchFilter: "Drug",
    drugFilterSelect: "Drug"
  },
  selectAllUuid: "c3fb0b4c-317d-4492-947c-3b1e76a7c86f",
  selectNoneUuid: "23147a8f-f376-45a3-973f-b3620d8a69bd",
  staleTime: 1000 * 60 * 10,
  drawerWidth: 240,
  opacity: 0.6,
  tabContextFabHeight: 220,
}

export const SMALL_SPACING = 1;

export const MAX_GLOBAL_MODAL_HEIGHT = 500;
export const MAX_GLOBAL_MODAL_WIDTH = 700;
/** Price-change charts are auto-added only when there are this many flagged changes or fewer. */
export const MAX_AUTO_PRICE_CHANGE_CHARTS = 9;
/** Auto-added charts are drawn only when they would show this many series (NDCs) or fewer. */
export const MAX_AUTO_CHART_SERIES = 8;
/** Grid size of a half-width chart card on both search pages: full width below `md`. */
export const HALF_WIDTH_GRID_SIZE = { xs: 12, md: 6 };
