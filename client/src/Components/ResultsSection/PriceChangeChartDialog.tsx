import { useEffect, useId, useState } from "react";
import { Box, Dialog, DialogContent, Typography } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import type { ChartPrice } from "../../library/types";
import type { ChartOrigin, ExplorerItemSource } from "../../library/explorerItems";
import { dateBounds, formatWindow, type DateWindow } from "../../library/dates";
import { usePageVisible } from "../../Context/pageVisibility";
import TitleBar from "../GlobalModal/TitleBar";
import LineViz from "../Charts/LineViz";
import PinButton from "../ExplorerGrid/PinButton";

/** The change a price change list's Chart button opened. Never stored. */
export type OpenChange = {
  /** The change's event key (`PriceChangeListBody`). */
  key: string,
  /** `eventChartTitle`: the date, package NDC and unit. Names the dialog. */
  title: string,
  /** The package's prices in one unit, which the chart draws and a pin keeps. */
  prices: ChartPrice[],
  /** The change's date, marked on the chart. */
  eventDate: number,
};

/** What a list gives the charts it opens. */
export type ChartContext = {
  /** The list's title, shown under the dialog's own. */
  listTitle: string,
  origin: ChartOrigin,
  colors: Map<string, string>,
  dateWindow: DateWindow,
  /** A pinned list's provenance, kept by a pin of a chart opened from it. */
  source?: ExplorerItemSource,
};

type Props = {
  change: OpenChange,
  context: ChartContext,
  onClose: () => void,
};

/**
 * One package's price change, charted in a dialog: its line over the list's dates with the change
 * marked and the readout resting on it. A local `Dialog`, not `GlobalModal`, which renders outside
 * the tab's pin provider, so Pin in it would reach the wrong pins. Render it only while a change
 * is open. Hidden pages and tabs stay mounted and the dialog portals into `<body>`, so it closes
 * itself while its page isn't shown.
 */
export default function PriceChangeChartDialog({ change, context, onClose }: Props) {
  const visible = usePageVisible();
  useEffect(() => {
    if (!visible) onClose();
  }, [visible, onClose]);

  const theme = useTheme();
  // Landscape phones are wider than `sm` but too short for a card.
  const fullScreen = useMediaQuery(`${theme.breakpoints.down("sm")}, (max-height: 500px)`);
  const contextId = useId();
  const [pins, setPins] = useState(0);

  if (!visible) return null;
  const { listTitle, origin, colors, dateWindow, source } = context;
  const dates = formatWindow(dateWindow, dateBounds(change.prices));
  return (
    <Dialog open onClose={onClose} fullScreen={fullScreen} fullWidth maxWidth="md" aria-describedby={contextId}>
      <TitleBar title={change.title} onClose={onClose} />
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography id={contextId} variant="body2" color="text.secondary" sx={{ flexGrow: 1, minWidth: 0 }}>
            {listTitle}{dates && ` · ${dates}`}
          </Typography>
          <PinButton title={change.title} chartType="line" prices={change.prices} loadedPrices={() => change.prices}
            origin={origin} colors={colors} dateWindow={dateWindow} eventDate={change.eventDate} source={source}
            onPinned={() => setPins(count => count + 1)} />
        </Box>
        {/* Always mounted so a screen reader hears it (MUI hides the app's toasts while the dialog is open); the text changes per pin so a second pin is heard too. */}
        <Box role="status" sx={visuallyHidden}>
          {pins === 1 && "Pinned. It's under Pinned on this tab."}
          {pins > 1 && `Pinned ${pins} copies. They're under Pinned on this tab.`}
        </Box>
        <LineViz nadacPrices={change.prices} title={change.title} colors={colors} dateWindow={dateWindow} seriesKind="package"
          eventDate={change.eventDate} />
      </DialogContent>
    </Dialog>
  );
}
