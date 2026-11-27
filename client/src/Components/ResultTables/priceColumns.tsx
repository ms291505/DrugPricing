import HelpButton from "../Help/HelpButton";
import type { GridApiCommon, GridColDef, GridComparatorFn, GridSortCellParams, GridSortDirection } from "@mui/x-data-grid";
import { Box, Tooltip } from "@mui/material";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import { compareUnitPrices, latestSummary, pricingUnitLabel, type UnitPriceSummary } from "../../library/prices";
import type { PricedRow } from "../../library/resultRows";
import { formatPrice } from "../../library/chartScale";
import { formatDate } from "../../library/dates";
import { STALE_MARKER_GAP, STALE_MARKER_SIZE } from "../../library/constants";

/** Shown for a row without prices, and for the price columns of a row priced in several units. */
const NO_PRICE = "—";

/** The row's summary when it is priced in exactly one unit: prices in different units never combine. */
const singleUnit = (row: PricedRow) => row.priceSummaries.length === 1 ? row.priceSummaries[0] : undefined;

/** A price with its row's unit, "$0.12/mL". */
const unitPrice = (value: number | undefined, row: PricedRow) => value === undefined
  ? NO_PRICE
  : `${formatPrice(value)}/${pricingUnitLabel(singleUnit(row)!.pricingUnit)}`;

const withUnit = (value: number | undefined, cell: GridSortCellParams) => {
  const row = (cell.api as GridApiCommon).getRow<PricedRow>(cell.id);
  const summary = row ? singleUnit(row) : undefined;
  return value === undefined || !summary ? undefined : { pricingUnit: summary.pricingUnit, price: value };
};

/**
 * Sorts a price column by unit first, so rows in different units never interleave, with rows
 * lacking a single-unit price last in both directions. MUI's `sortComparator` can't do that: it
 * negates the comparator for a descending sort, which would move those rows to the top.
 */
const byUnitThenPrice = (direction: GridSortDirection): GridComparatorFn<number | undefined> =>
  (a, b, cellA, cellB) => compareUnitPrices(withUnit(a, cellA), withUnit(b, cellB), direction === "desc" ? "desc" : "asc");

type PriceColumnOptions = {
  /** Where to find the prices of a mixed-unit row, added to its tooltip. */
  mixedUnitsHint?: string,
  /** The rows' prices average several packages per date (FDA products): the headers say so. */
  averagesPackages?: boolean,
};

/**
 * The price columns every result table shares. `latest` goes near the left so a phone shows it
 * without scrolling; `latestDate` and the min and max `range` sits further right.
 * Every price carries its unit, and sorting groups rows by unit.
 *
 * A row priced in several units (a few products whose packages differ, e.g. packets per each and
 * canisters per gram) shows "Mixed units" instead of prices, and still its latest price date.
 *
 * A latest price older than the dates shown reach (`stale`, from `summarizeByUnit`) carries a
 * warning triangle saying when it was last priced, so the Latest Price Date column can stay hidden.
 */
export function createPriceColumns<R extends PricedRow>({ mixedUnitsHint, averagesPackages }: PriceColumnOptions = {}) {
  const latest: GridColDef<R> = {
    field: "latestPrice",
    headerName: "Latest Price",
    description: averagesPackages ? "Average of the product's packages on its latest price date" : undefined,
    type: "number",
    valueGetter: (_, row) => singleUnit(row)?.latest,
    valueFormatter: unitPrice,
    getSortComparator: byUnitThenPrice,
    renderCell: ({ row, formattedValue, hasFocus }) => {
      const tabIndex = hasFocus ? 0 : -1;
      if (row.priceSummaries.length > 1) return <MixedUnits tabIndex={tabIndex} summaries={row.priceSummaries} hint={mixedUnitsHint} />;
      const summary = singleUnit(row);
      return summary?.stale
        // Middle-aligned in the cell's line box, so the figure sits level with fresh rows' text.
        ? <Box component="span" sx={{ display: "inline-flex", alignItems: "center", verticalAlign: "middle", gap: `${STALE_MARKER_GAP}px` }}>
            <StaleMarker tabIndex={tabIndex} label={`Last priced ${formatDate(summary.latestDate)}`} />
            {formattedValue as string}
          </Box>
        : formattedValue as string;
    },
  };
  const latestDate: GridColDef<R> = {
    field: "latestPriceDate",
    headerName: "Latest Price Date",
    // The value is a timestamp, which the text filters can't match against the shown date.
    filterable: false,
    valueGetter: (_, row) => latestSummary(row.priceSummaries)?.latestDate,
    valueFormatter: (value: number | undefined) => value === undefined ? NO_PRICE : formatDate(value),
  };
  const minPrice: GridColDef<R> = {
    field: "minPrice",
    headerName: "Min Price",
    description: averagesPackages ? "Lowest of the product's daily average across its packages" : undefined,
    type: "number",
    valueGetter: (_, row) => singleUnit(row)?.min,
    valueFormatter: unitPrice,
    getSortComparator: byUnitThenPrice,
  };
  const maxPrice: GridColDef<R> = {
    field: "maxPrice",
    headerName: "Max Price",
    description: averagesPackages ? "Highest of the product's daily average across its packages" : undefined,
    type: "number",
    valueGetter: (_, row) => singleUnit(row)?.max,
    valueFormatter: unitPrice,
    getSortComparator: byUnitThenPrice,
  };
  return { latest, latestDate, range: [minPrice, maxPrice] };
}

/**
 * A warning triangle before a latest price that is older than the dates shown reach (the row's
 * `stale` summary). It sits on the price's left, so right-aligned prices still line up. It is
 * focusable like the cell's other controls, and a tap opens its tooltip at once (a phone has no hover).
 * A click doesn't reach the row, so it doesn't toggle the row's selection.
 *
 * @param label - the tooltip, "Last priced Jan 14, 2026"
 */
function StaleMarker({ label, tabIndex }: { label: string, tabIndex: number }) {
  return (
    <Tooltip title={label} enterTouchDelay={0}>
      <Box component="span" role="img" aria-label={`Stale: ${label}`} tabIndex={tabIndex} onClick={event => event.stopPropagation()}
        sx={{ display: "inline-flex", color: "warning.main", borderRadius: 1, "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" } }}>
        <WarningAmberRounded sx={{ fontSize: STALE_MARKER_SIZE }} />
      </Box>
    </Tooltip>
  );
}

/** "g last priced Mar 4, 2026": a unit of a mixed-unit row, its date apart from the others'. */
const unitLastPriced = (summary: UnitPriceSummary) => `${pricingUnitLabel(summary.pricingUnit)} last priced ${formatDate(summary.latestDate)}`;

type MixedUnitsProps = {
  summaries: UnitPriceSummary[],
  tabIndex: number,
  hint?: string,
}

/**
 * Says the row has prices but no single figure for them, and (on hover or tap) where they are and
 * when each unit was last priced. A stale marker names the units that are stale.
 */
function MixedUnits({ summaries, hint, tabIndex }: MixedUnitsProps) {
  const units = summaries.map(summary => pricingUnitLabel(summary.pricingUnit)).join(", ");
  const title = `Priced in more than one unit (${units}): ${summaries.map(unitLastPriced).join("; ")}.` + (hint ? ` ${hint}` : "");
  const stale = summaries.filter(summary => summary.stale);
  return (
    // No gap: the button's own padding spaces it, and the column has no width to spare.
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", color: "text.secondary" }}>
      {stale.length > 0 && <Box component="span" sx={{ display: "inline-flex", mr: `${STALE_MARKER_GAP}px` }}>
        <StaleMarker tabIndex={tabIndex} label={stale.map(unitLastPriced).join("; ")} />
      </Box>}
      {/* A tap opens it at once: a phone has no hover. The help button sits outside it, so a tap
          on the button opens Help without also flashing the hint. A tap doesn't select the row. */}
      <Tooltip title={title} enterTouchDelay={0}><span onClick={event => event.stopPropagation()}>Mixed units</span></Tooltip>
      <HelpButton topic="the-results-table" tabIndex={tabIndex} />
    </Box>
  );
}
