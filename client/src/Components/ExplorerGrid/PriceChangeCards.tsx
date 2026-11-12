import { Grid, Typography } from "@mui/material";
import PriceChangeCard from "./PriceChangeCard";
import { getAllPricesForFlaggedPackages } from "../../library/flagNadacPriceChange";
import { HALF_WIDTH_GRID_SIZE, MAX_AUTO_PRICE_CHANGE_CHARTS } from "../../library/constants";
import type { ChartOrigin } from "../../library/explorerItems";
import type { DateWindow } from "../../library/dates";
import type { NadacPrice, PackagePriceChange } from "../../library/types";

type Props = {
  /** Every change flagged in the page's result as shown, so only inside the search's dates. */
  changes: PackagePriceChange[],
  /** Package-level prices, where each card finds its package's history. */
  prices: NadacPrice[],
  /** The view's package-level `history`, for pins. */
  history: () => NadacPrice[],
  /** The search's dates: what the cards' full history shows. */
  dateWindow: DateWindow,
  origin: ChartOrigin,
  /** The page's colors for packages. */
  colors: Map<string, string>,
}

/**
 * A search's price-change auto charts, as grid items: a card per flagged change, up to
 * `MAX_AUTO_PRICE_CHANGE_CHARTS`, or else a note saying why there are none.
 */
export default function PriceChangeCards({ changes, prices, history, dateWindow, origin, colors }: Props) {
  const tooMany = changes.length > MAX_AUTO_PRICE_CHANGE_CHARTS;

  return (<>
    {tooMany
      ? <Grid size={12}>
        <Typography variant="body2" color="text.secondary" sx={{ px: { xs: 1, md: 0 } }}>
          {changes.length} price changes in these dates are too many to chart (up to {MAX_AUTO_PRICE_CHANGE_CHARTS}). Narrow the dates or filter the results.
        </Typography>
      </Grid>
      : changes.map((change) => (
        <Grid size={HALF_WIDTH_GRID_SIZE} key={change.packageNdc + change.priceChange.startDate.getTime()}>
          <PriceChangeCard
            change={change}
            prices={getAllPricesForFlaggedPackages(change, prices)}
            history={history}
            searchDates={dateWindow}
            origin={origin}
            colors={colors}
          />
        </Grid>
      ))
    }
  </>);
}
