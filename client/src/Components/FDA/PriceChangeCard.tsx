import { useState } from "react";
import { IconButton, Tooltip } from "@mui/material";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import CloseFullscreenIcon from "@mui/icons-material/CloseFullscreen";
import ExplorerGridItem from "../ExplorerGrid/ExplorerGridItem";
import PinButton from "../ExplorerGrid/PinButton";
import LineViz from "../Charts/LineViz";
import { percentageChangeToString } from "../../library/flagNadacPriceChange";
import { priceChangeTitle } from "../../library/chartTitles";
import { FULL_WINDOW, windowAround } from "../../library/dates";
import { PRICE_CHANGE_WINDOW_MONTHS } from "../../library/constants";
import type { ChartChangeSpan, ChartOrigin } from "../../library/explorerItems";
import type { FdaProductPriceChange, NadacPrice } from "../../library/types";

type Props = {
  change: FdaProductPriceChange,
  /** Every price of the changed package. */
  prices: NadacPrice[],
  origin: ChartOrigin,
  /** The package-level page colors. */
  colors: Map<string, string>,
}

/**
 * An auto chart for one flagged price change. It opens on the months around the change, with
 * the change shaded, and can widen to the package's full history. Pinning keeps the current view.
 */
export default function PriceChangeCard({ change, prices, origin, colors }: Props) {
  const [showFullHistory, setShowFullHistory] = useState(false);

  const { startDate, endDate, percentage, difference } = change.priceChange;
  // percentage = difference / old price, so the old price is difference / percentage.
  const from = difference / percentage;
  const changeLabel = percentageChangeToString(percentage);
  const changeSpan: ChartChangeSpan = {
    start: startDate.getTime(), end: endDate.getTime(), label: changeLabel, direction: percentage > 0 ? "rise" : "drop",
    from, to: from + difference,
  };
  const dateWindow = showFullHistory
    ? FULL_WINDOW
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
          origin={origin}
          dateWindow={dateWindow}
          changeSpan={changeSpan}
          colors={colors}
        />
      </>}
    >
      <LineViz nadacPrices={prices} colors={colors} dateWindow={dateWindow} changeSpan={changeSpan} />
    </ExplorerGridItem>
  );
}
