import { Box, Chip, Typography } from "@mui/material";
import type { ReactNode } from "react";
import type { ChartPrice } from "../../library/types";
import { pricingUnitLabel, splitByPricingUnit } from "../../library/chartSeries";
import { clipToWindow, FULL_WINDOW, type DateWindow } from "../../library/dates";

type Props = {
  nadacPrices: ChartPrice[],
  /** Only prices in this window are drawn. */
  dateWindow?: DateWindow,
  renderChart: (nadacPrices: ChartPrice[], pricingUnit: string) => ReactNode,
}

/**
 * Renders one chart per pricing unit so $/each and $/mL never share a y-axis,
 * and captions each chart with its unit.
 */
export default function UnitSplit({ nadacPrices, dateWindow = FULL_WINDOW, renderChart }: Props) {
  const groups = splitByPricingUnit(clipToWindow(nadacPrices, dateWindow));
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
          <Typography variant="caption" color="text.secondary" component="p">
            USD per {pricingUnitLabel(pricingUnit)}
          </Typography>
          {renderChart(unitPrices, pricingUnit)}
        </Box>
      ))}
    </Box>
  )
}
