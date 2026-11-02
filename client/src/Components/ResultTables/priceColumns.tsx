import type { GridApiCommon, GridColDef, GridComparatorFn, GridSortCellParams } from "@mui/x-data-grid";
import { Box, Tooltip } from "@mui/material";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import { compareUnitPrices, latestSummary, pricingUnitLabel } from "../../library/prices";
import type { PricedRow } from "../../library/resultRows";
import { formatPrice } from "../../library/chartScale";
import { formatDate } from "../../library/dates";

/** Shown for a row without prices, and for the price columns of a row priced in several units. */
const NO_PRICE = "—";

/** The row's summary when it is priced in exactly one unit: prices in different units never combine. */
const singleUnit = (row: PricedRow) => row.priceSummaries.length === 1 ? row.priceSummaries[0] : undefined;

/** A price with its row's unit, "$0.12/mL". */
const unitPrice = (value: number | undefined, row: PricedRow) => value === undefined
  ? NO_PRICE
  : `${formatPrice(value)}/${pricingUnitLabel(singleUnit(row)!.pricingUnit)}`;

/** Sorts a price column by unit first, so rows in different units never interleave. */
const byUnitThenPrice: GridComparatorFn<number | undefined> = (a, b, cellA, cellB) => {
  const withUnit = (value: number | undefined, cell: GridSortCellParams) => {
    const row = (cell.api as GridApiCommon).getRow<PricedRow>(cell.id);
    const summary = row ? singleUnit(row) : undefined;
    return value === undefined || !summary ? undefined : { pricingUnit: summary.pricingUnit, price: value };
  };
  return compareUnitPrices(withUnit(a, cellA), withUnit(b, cellB));
};

type PriceColumnOptions = {
  /** Where to find the prices of a mixed-unit row, added to its tooltip. */
  mixedUnitsHint?: string,
  /** The rows' prices average several packages per date (FDA products): the headers say so. */
  averagesPackages?: boolean,
};

/**
 * The price columns every result table shares. `latest` goes near the left so a phone shows it
 * without scrolling; `history` sits further right. Every price carries its unit, and sorting groups
 * rows by unit.
 *
 * A row priced in several units (a few products whose packages differ, e.g. packets per each and
 * canisters per gram) shows "Mixed units" instead of prices, and still its latest price date.
 */
export function createPriceColumns<R extends PricedRow>({ mixedUnitsHint, averagesPackages }: PriceColumnOptions = {}): { latest: GridColDef<R>, history: GridColDef<R>[] } {
  return {
    latest: {
      field: "latestPrice",
      headerName: "Latest Price",
      description: averagesPackages ? "Average of the product's packages on its latest price date" : undefined,
      type: "number",
      width: 125,
      valueGetter: (_, row) => singleUnit(row)?.latest,
      valueFormatter: unitPrice,
      sortComparator: byUnitThenPrice,
      renderCell: ({ row, formattedValue }) => row.priceSummaries.length > 1
        ? <MixedUnits pricingUnits={row.priceSummaries.map(summary => summary.pricingUnit)} hint={mixedUnitsHint} />
        : formattedValue as string,
    },
    history: [
      {
        field: "latestPriceDate",
        headerName: "Latest Price Date",
        width: 135,
        // The value is a timestamp, which the text filters can't match against the shown date.
        filterable: false,
        valueGetter: (_, row) => latestSummary(row.priceSummaries)?.latestDate,
        valueFormatter: (value: number | undefined) => value === undefined ? NO_PRICE : formatDate(value),
      },
      {
        field: "minPrice",
        headerName: "Min Price",
        description: averagesPackages ? "Lowest of the product's daily average across its packages" : undefined,
        type: "number",
        width: 115,
        valueGetter: (_, row) => singleUnit(row)?.min,
        valueFormatter: unitPrice,
        sortComparator: byUnitThenPrice,
      },
      {
        field: "maxPrice",
        headerName: "Max Price",
        description: averagesPackages ? "Highest of the product's daily average across its packages" : undefined,
        type: "number",
        width: 115,
        valueGetter: (_, row) => singleUnit(row)?.max,
        valueFormatter: unitPrice,
        sortComparator: byUnitThenPrice,
      },
    ],
  };
}

type MixedUnitsProps = {
  pricingUnits: string[],
  hint?: string,
}

/** Says the row has prices but no single figure for them, and (on hover or tap) where they are. */
function MixedUnits({ pricingUnits, hint }: MixedUnitsProps) {
  const units = pricingUnits.map(pricingUnitLabel).join(", ");
  const title = `Priced in more than one unit (${units}).` + (hint ? ` ${hint}` : "");
  return (
    // A tap opens it at once: a phone has no hover.
    <Tooltip title={title} enterTouchDelay={0}>
      <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
        Mixed units
        <InfoOutlined fontSize="inherit" />
      </Box>
    </Tooltip>
  );
}
