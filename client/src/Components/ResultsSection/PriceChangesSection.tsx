import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import { derivePriceEvents, groupPriceEvents, priceEventGroupLabel, type PriceEventGroup } from "../../library/priceActivity";
import type { ChartPrice } from "../../library/types";
import type { ChartOrigin } from "../../library/explorerItems";
import { type DateWindow } from "../../library/dates";
import useWidthTier from "../../hooks/useWidthTier";
import PriceEventsList, { PriceEventDetails } from "./PriceEventsList";
import ExplorerGridItem from "../ExplorerGrid/ExplorerGridItem";

type Props = {
  prices: ChartPrice[], history: () => ChartPrice[], origin: ChartOrigin, colors: Map<string, string>,
  /** The dates the page shows: the window of a change's chart. */
  dateWindow: DateWindow,
};

/** A compact list of the page's price changes. A chart opens only for an explicit change, in its own row. */
export default function PriceChangesSection(props: Props) {
  const groups = useMemo(() => groupPriceEvents(derivePriceEvents(props.prices, "package")), [props.prices]);
  // The user's own open/close of a group's package details, kept while the page is mounted.
  const [detailsChoice, setDetailsChoice] = useState<ReadonlyMap<string, boolean>>(new Map());
  const onDetailsToggle = useCallback((key: string, open: boolean) =>
    setDetailsChoice(prev => new Map(prev).set(key, open)), []);
  if (!groups.length) return null;
  return <PriceChanges {...props} groups={groups} detailsChoice={detailsChoice} onDetailsToggle={onDetailsToggle} />;
}

type ListProps = Props & {
  groups: PriceEventGroup[],
  detailsChoice: ReadonlyMap<string, boolean>,
  onDetailsToggle: (key: string, open: boolean) => void,
};

function PriceChanges({ prices, history, origin, colors, dateWindow, groups, detailsChoice, onDetailsToggle }: ListProps) {
  // The section's own width: a workspace pane can be narrow in a wide window.
  const [sectionRef, widthTier] = useWidthTier<HTMLElement>();
  const sectionHeadingRef = useRef<HTMLHeadingElement>(null);
  // Whether focus is in some row's chart card: a card that goes away takes it to `body`.
  const focusInChart = useRef(false);
  const setFocusInChart = useCallback((inChart: boolean) => { focusInChart.current = inChart; }, []);
  // New prices discard every chart (each row sees its own `prices` go stale): focus that was in one
  // lands on the section's heading.
  useEffect(() => {
    if (focusInChart.current && (document.activeElement === null || document.activeElement === document.body))
      sectionHeadingRef.current?.focus({ preventScroll: true });
    focusInChart.current = false;
  }, [prices]);
  // Package details start open from `md` up and closed below; a group the user toggled keeps that.
  const defaultOpen = widthTier === "wide";
  const compact = widthTier === "narrow";
  return <Box ref={sectionRef} sx={{ minWidth: 0 }}>
    <ExplorerGridItem title="Price changes" subtitle="Package changes of 10% or more in these dates and filters."
      headingLevel={3} headingRef={sectionHeadingRef}>
      <PriceEventsList groups={groups}
        renderGroup={group => <PriceChangeRow group={group} prices={prices} history={history} origin={origin}
          colors={colors} dateWindow={dateWindow} compact={compact}
          detailsOpen={detailsChoice.get(group.key) ?? defaultOpen} onDetailsToggle={onDetailsToggle}
          onFocusInChart={setFocusInChart} />} />
    </ExplorerGridItem>
  </Box>;
}

type RowProps = Props & {
  group: PriceEventGroup,
  compact: boolean,
  detailsOpen: boolean,
  onDetailsToggle: (key: string, open: boolean) => void,
  onFocusInChart: (inChart: boolean) => void,
};

/**
 * One change group. Each package row owns its chart, so opening one re-renders nothing else.
 */
const PriceChangeRow = memo(function PriceChangeRow({
  group, prices, history, origin, colors, dateWindow, compact, detailsOpen, onDetailsToggle, onFocusInChart,
}: RowProps) {
  return <>
    <Typography variant="subtitle2" component="p">{priceEventGroupLabel(group)}</Typography>
    <PriceEventDetails group={group} prices={prices} history={history} origin={origin} colors={colors}
      dateWindow={dateWindow} open={detailsOpen} onToggle={onDetailsToggle} compact={compact}
      onFocusInChart={onFocusInChart} />
  </>;
});
