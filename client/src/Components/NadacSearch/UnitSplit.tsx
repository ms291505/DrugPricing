import { Box, Chip, Typography } from "@mui/material";
import type { ReactNode } from "react";
import type { NadacPrice } from "../../library/types";
import { pricingUnitLabel, splitByPricingUnit } from "../../library/chartSeries";

type Props = {
  nadacPrices: NadacPrice[],
  renderChart: (nadacPrices: NadacPrice[], pricingUnit: string) => ReactNode,
}

/**
 * Renders one chart per pricing unit so $/each and $/mL never share a y-axis,
 * and captions each chart with its unit.
 */
export default function UnitSplit({ nadacPrices, renderChart }: Props) {
  const groups = splitByPricingUnit(nadacPrices);
  const isMixed = groups.length > 1;

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
