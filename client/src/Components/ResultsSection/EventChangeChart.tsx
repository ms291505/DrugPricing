import { memo, useEffect, useLayoutEffect, useRef } from "react";
import { Box, Button } from "@mui/material";
import type { ChartPrice } from "../../library/types";
import type { ChartOrigin, ExplorerItemSource } from "../../library/explorerItems";
import type { DateWindow } from "../../library/dates";
import ExplorerGridItem from "../ExplorerGrid/ExplorerGridItem";
import LineViz from "../Charts/LineViz";
import PinButton from "../ExplorerGrid/PinButton";

/** One package's Chart this change card, opened from a price change list. Never stored. */
export type EventChart = {
  /** The change's event key (`PriceChangeListBody`): one chart per change, whichever list opened it. */
  key: string,
  /** The card's element id, which the list's button controls. */
  cardId: string,
  title: string,
  /** The package's prices in one unit, which the chart draws and a pin keeps. */
  prices: ChartPrice[],
  /** The change's date, marked on the chart. */
  eventDate: number,
  /** The list whose button opened it, for focus when it closes. */
  openerId: string,
};

type Props = {
  chart: EventChart,
  origin: ChartOrigin,
  colors: Map<string, string>,
  dateWindow: DateWindow,
  /** A pinned list's provenance, kept by a pin of a chart opened from it. */
  source?: ExplorerItemSource,
  onClose: (key: string) => void,
  /** Called after the chart was removed with focus inside it. */
  onRemovedWithFocus: (chart: EventChart) => void,
};

/**
 * A package's price change chart: its line over the list's dates with the change marked, and the
 * readout resting on it. Its owner decides where focus goes when it closes. Memoized: opening one
 * chart doesn't redraw the others.
 */
export default memo(function EventChangeChart({ chart, origin, colors, dateWindow, source, onClose, onRemovedWithFocus }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // A new chart takes focus.
  useEffect(() => {
    if (!headingRef.current?.checkVisibility()) return;
    headingRef.current.focus({ preventScroll: true });
    headingRef.current.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, []);
  // A layout cleanup runs while the chart is still in the document, so it can tell whether focus
  // is about to be lost with it. Once the commit is done the chart is gone, unless the cleanup
  // was only StrictMode's rehearsal or a dependency change.
  useLayoutEffect(() => {
    const box = boxRef.current;
    return () => {
      if (!box?.contains(document.activeElement)) return;
      queueMicrotask(() => { if (!box.isConnected) onRemovedWithFocus(chart); });
    };
  }, [chart, onRemovedWithFocus]);
  return <Box ref={boxRef} id={chart.cardId} sx={{ minWidth: 0 }}>
    <ExplorerGridItem title={chart.title} headingLevel={3} headingRef={headingRef}
      actions={<><PinButton title={chart.title} chartType="line" prices={chart.prices} history={() => chart.prices}
        origin={origin} colors={colors} dateWindow={dateWindow} eventDate={chart.eventDate} source={source} />
        <Button size="small" onClick={event => { event.currentTarget.focus(); onClose(chart.key); }}>Close</Button></>}>
      <LineViz nadacPrices={chart.prices} title={chart.title} colors={colors} dateWindow={dateWindow} seriesKind="package"
        eventDate={chart.eventDate} />
    </ExplorerGridItem>
  </Box>;
});
