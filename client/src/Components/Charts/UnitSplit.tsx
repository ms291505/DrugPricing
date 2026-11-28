import { Box, Chip, Typography } from "@mui/material";
import { useMemo, type ReactNode } from "react";
import type { ChartPrice } from "../../library/types";
import { splitByPricingUnit } from "../../library/prices";
import { clipToWindow, FULL_WINDOW, type DateWindow } from "../../library/dates";
import { titleNamesUnit, unitHeading } from "../../library/chartTitles";

type Props = {
  nadacPrices: ChartPrice[],
  /** The card's title, which names the unit when it was generated (`chartTitle`). */
  title: string,
  /** Only prices in this window are drawn. */
  dateWindow?: DateWindow,
  renderChart: (nadacPrices: ChartPrice[], pricingUnit: string) => ReactNode,
}

/**
 * Renders one chart per pricing unit so $/each and $/mL never share a y-axis. A unit chart whose
 * card title doesn't give its currency and unit (older pins, mixed-unit ones among them, and
 * titles the user chose) gets a heading above it that does, "USD per mL"; a generated title
 * already says it, so new cards show it once, in the title.
 */
export default function UnitSplit({ nadacPrices, title, dateWindow = FULL_WINDOW, renderChart }: Props) {
  // Kept across renders, so each unit chart can keep what it derived from its prices.
  const groups = useMemo(() => splitByPricingUnit(clipToWindow(nadacPrices, dateWindow)), [nadacPrices, dateWindow]);
  const isMixed = groups.length > 1;

  if (groups.length === 0 && nadacPrices.length > 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
        No prices in these dates.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {isMixed
        ? <Chip
          size="small"
          variant="outlined"
          color="warning"
          label={`Mixed units: split into ${groups.length} charts`}
          sx={{ alignSelf: "flex-start" }}
        />
        : null
      }
      {groups.map(({ pricingUnit, nadacPrices: unitPrices }) => (
        <Box key={pricingUnit}>
          {titleNamesUnit(title, pricingUnit) ? null : (
            <Typography variant="subtitle2" component="p">{unitHeading(pricingUnit)}</Typography>
          )}
          {renderChart(unitPrices, pricingUnit)}
        </Box>
      ))}
    </Box>
  )
}
