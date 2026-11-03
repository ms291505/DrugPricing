import { useMemo } from "react";
import { Grid, Typography } from "@mui/material";
import PriceChangeCard from "./PriceChangeCard";
import { getAllPricesForFlaggedPackages, priceChangesInWindow } from "../../library/flagNadacPriceChange";
import { HALF_WIDTH_GRID_SIZE, MAX_AUTO_PRICE_CHANGE_CHARTS } from "../../library/constants";
import type { DateWindow } from "../../library/dates";
import type { ChartOrigin } from "../../library/explorerItems";
import type { NadacPrice, PackagePriceChange } from "../../library/types";

type Props = {
  /** Every change the search flagged. */
  changes: PackagePriceChange[],
  /** Package-level prices, where each card finds its package's history. */
  prices: NadacPrice[],
  chartWindow: DateWindow,
  origin: ChartOrigin,
  /** The page's colors for packages. */
  colors: Map<string, string>,
}

/**
 * A search's price-change auto charts, as grid items: a card per flagged change inside the chart
 * dates, up to `MAX_AUTO_PRICE_CHANGE_CHARTS`, and a note for the changes that get no card.
 */
export default function PriceChangeCards({ changes, prices, chartWindow, origin, colors }: Props) {
  // Price-change cards follow the chart dates like the other auto charts; each keeps its own focus.
  const shown = useMemo(() => priceChangesInWindow(changes, chartWindow), [changes, chartWindow]);
  const outside = changes.length - shown.length;
  const tooMany = shown.length > MAX_AUTO_PRICE_CHANGE_CHARTS;
  // Explains why price changes the search found have no card.
  const notes = [
    tooMany
      ? `${shown.length} price changes in these dates are too many to chart (up to ${MAX_AUTO_PRICE_CHANGE_CHARTS}). Narrow the dates or filter the results.`
      : null,
    outside > 0
      ? `${outside === 1 ? "1 price change is" : `${outside} price changes are`} outside the chart dates.`
      : null,
  ].filter(note => note !== null);

  return (<>
    {notes.length > 0
      ? <Grid size={12}>
        <Typography variant="body2" color="text.secondary" sx={{ px: { xs: 1, md: 0 } }}>
          {notes.join(" ")}
        </Typography>
      </Grid>
      : null
    }
    {!tooMany
      ? shown.map((change) => (
        <Grid size={HALF_WIDTH_GRID_SIZE} key={change.packageNdc + change.priceChange.startDate.getTime()}>
          <PriceChangeCard
            change={change}
            prices={getAllPricesForFlaggedPackages(change, prices)}
            origin={origin}
            colors={colors}
          />
        </Grid>
      ))
      : null
    }
  </>);
}
