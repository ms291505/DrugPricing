import { useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";
import ExplorerGridItem from "./ExplorerGridItem";
import PinButton from "./PinButton";
import LineViz from "../Charts/LineViz";
import { percentageChangeToString } from "../../library/flagNadacPriceChange";
import { priceChangeTitle } from "../../library/chartTitles";
import { windowAround, type DateWindow } from "../../library/dates";
import { PRICE_CHANGE_WINDOW_MONTHS } from "../../library/constants";
import type { ChartChangeSpan, ChartOrigin } from "../../library/explorerItems";
import type { NadacPrice, PackagePriceChange } from "../../library/types";

type Props = {
  change: PackagePriceChange,
  /** Every price of the changed package in the search's dates. */
  prices: NadacPrice[],
  /** The view's package-level `history`, for pins. */
  history: () => NadacPrice[],
  /** The search's dates: the full history shows them, so a pin of it shows what the card did. */
  searchDates: DateWindow,
  origin: ChartOrigin,
  /** The page's colors for packages. */
  colors: Map<string, string>,
}

/**
 * An auto chart for one flagged price change. It opens on the months around the change, with
 * the change shaded, and can widen to the package's full history. Pinning keeps the current view.
 */
export default function PriceChangeCard({ change, prices, history, searchDates, origin, colors }: Props) {
  const [showFullHistory, setShowFullHistory] = useState(false);

  const { startDate, endDate, percentage, oldPrice, newPrice } = change.priceChange;
  const changeLabel = percentageChangeToString(percentage);
  const changeSpan: ChartChangeSpan = {
    start: startDate.getTime(), end: endDate.getTime(), label: changeLabel, direction: percentage > 0 ? "rise" : "drop",
    from: oldPrice, to: newPrice,
  };
  const dateWindow = showFullHistory
    ? searchDates
    : windowAround(changeSpan.start, changeSpan.end, PRICE_CHANGE_WINDOW_MONTHS);

  const title = priceChangeTitle(changeLabel, changeSpan.end, change.packageNdc);
  const toggleLabel = "Show full history";

  return (
    <ExplorerGridItem
      title={title}
      actions={<>
        <Tooltip title={showFullHistory ? `Focus on ${PRICE_CHANGE_WINDOW_MONTHS} months either side` : toggleLabel}>
          <IconButton
            size="small"
            aria-label={`${toggleLabel}: ${title}`}
            aria-pressed={showFullHistory}
            onClick={() => setShowFullHistory(show => !show)}
          >
            {showFullHistory ? <CloseFullscreenIcon fontSize="small" /> : <OpenInFullIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
        <PinButton
          title={title}
          chartType="line"
          prices={prices}
          history={history}
          origin={origin}
          dateWindow={dateWindow}
          changeSpan={changeSpan}
          colors={colors}
        />
      </>}
    >
      <LineViz nadacPrices={prices} title={title} colors={colors} dateWindow={dateWindow} changeSpan={changeSpan} />
    </ExplorerGridItem>
  );
}
