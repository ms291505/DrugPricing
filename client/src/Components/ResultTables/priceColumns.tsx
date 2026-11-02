import type { GridColDef, GridValidRowModel } from "@mui/x-data-grid";
import { Box, Tooltip } from "@mui/material";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import type { UnitPriceSummary } from "../../library/prices";
import { formatPrice } from "../../library/chartScale";
import { pricingUnitLabel } from "../../library/chartSeries";
import { formatDate } from "../../library/dates";

/** A results-table row with its prices summarized once per unit, when the rows are built. */
export type PricedRow = GridValidRowModel & { priceSummaries: UnitPriceSummary[] };

/** Shown for a row without prices, and for the price columns of a row priced in several units. */
const NO_PRICE = "—";

const price = (value: number | undefined) => value === undefined ? NO_PRICE : formatPrice(value);

/** The row's summary when it is priced in exactly one unit: prices in different units never combine. */
const singleUnit = (row: PricedRow) => row.priceSummaries.length === 1 ? row.priceSummaries[0] : undefined;

/**
 * The price columns every result table shares. `latest` goes near the left so a phone shows it
 * without scrolling, and carries the unit; `history` sits further right.
 *
 * A row priced in several units (a few products whose packages differ, e.g. packets per each and
 * canisters per gram) shows "Mixed units" instead of prices, and still its latest price date.
 *
 * @param mixedUnitsHint - where to find the prices of a mixed-unit row, added to its tooltip
 */
export function createPriceColumns<R extends PricedRow>(mixedUnitsHint?: string): { latest: GridColDef<R>, history: GridColDef<R>[] } {
  return {
    latest: {
      field: "latestPrice",
      headerName: "Latest Price",
      type: "number",
      width: 125,
      valueGetter: (_, row) => singleUnit(row)?.latest,
      valueFormatter: (value: number | undefined, row) => value === undefined
        ? NO_PRICE
        : `${formatPrice(value)}/${pricingUnitLabel(singleUnit(row)!.pricingUnit)}`,
      renderCell: ({ row, formattedValue }) => row.priceSummaries.length > 1
        ? <MixedUnits pricingUnits={row.priceSummaries.map(summary => summary.pricingUnit)} hint={mixedUnitsHint} />
        : formattedValue as string,
    },
    history: [
      {
        field: "latestPriceDate",
        headerName: "Latest Price Date",
        width: 135,
        valueGetter: (_, row) => row.priceSummaries.length === 0
          ? undefined
          : Math.max(...row.priceSummaries.map(summary => summary.latestDate)),
        valueFormatter: (value: number | undefined) => value === undefined ? NO_PRICE : formatDate(value),
      },
      {
        field: "minPrice",
        headerName: "Min Price",
        type: "number",
        valueGetter: (_, row) => singleUnit(row)?.min,
        valueFormatter: price,
      },
      {
        field: "maxPrice",
        headerName: "Max Price",
        type: "number",
        valueGetter: (_, row) => singleUnit(row)?.max,
        valueFormatter: price,
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
