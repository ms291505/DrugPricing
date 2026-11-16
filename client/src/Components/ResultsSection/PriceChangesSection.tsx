import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Box, Button, IconButton, Tooltip, Typography } from "@mui/material";
import SsidChartIcon from "@mui/icons-material/SsidChart";
import { derivePriceEvents, groupPriceEvents, priceEventGroupLabel, type PriceEventGroup } from "../../library/priceActivity";
import type { ChartPrice } from "../../library/types";
import type { ChartOrigin } from "../../library/explorerItems";
import { formatDate, type DateWindow } from "../../library/dates";
import { pricingUnitLabel } from "../../library/prices";
import useWidthTier from "../../hooks/useWidthTier";
import PriceEventsList, { PriceEventDetails } from "./PriceEventsList";
import LineViz from "../Charts/LineViz";
import ExplorerGridItem from "../ExplorerGrid/ExplorerGridItem";
import PinButton from "../ExplorerGrid/PinButton";

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
  const headingId = useId();
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
  return <Box component="section" ref={sectionRef} aria-labelledby={headingId} sx={{ minWidth: 0, px: { xs: 1, sm: 0 } }}>
    <Typography id={headingId} ref={sectionHeadingRef} tabIndex={-1} component="h3" variant="subtitle1"
      sx={{ "&:focus": { outline: "none" } }}>Price changes</Typography>
    <Typography variant="body2" color="text.secondary">Package changes of 10% or more in these dates and filters.</Typography>
    <PriceEventsList groups={groups}
      renderGroup={group => <PriceChangeRow group={group} prices={prices} history={history} origin={origin}
        colors={colors} dateWindow={dateWindow} compact={compact}
        detailsOpen={detailsChoice.get(group.key) ?? defaultOpen} onDetailsToggle={onDetailsToggle}
        onFocusInChart={setFocusInChart} />} />
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
 * One change: its summary line with the chart button, Package details, and its own chart when
 * open. The open chart is this row's state, so opening or closing one re-renders nothing else.
 */
const PriceChangeRow = memo(function PriceChangeRow({
  group, prices, history, origin, colors, dateWindow, compact, detailsOpen, onDetailsToggle, onFocusInChart,
}: RowProps) {
  const chartId = useId();
  // Tied to the page's `prices`: new prices make the chart stale, so it never shows.
  const [open, setOpen] = useState<{ prices: ChartPrice[], history: ChartPrice[] } | null>(null);
  const current = open?.prices === prices ? open : null;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!current || !headingRef.current?.checkVisibility()) return;
    headingRef.current.focus({ preventScroll: true });
    headingRef.current.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [current]);
  const toggle = () => {
    if (current) { setOpen(null); return; }
    // Computed now, not for every group up front.
    const affected = new Set(group.events.map(e => e.packageNdc));
    setOpen({ prices, history: history().filter(p => affected.has(p.ndc) && p.pricingUnit === group.pricingUnit) });
  };
  const close = () => {
    setOpen(null);
    onFocusInChart(false);
    buttonRef.current?.focus();
  };
  const title = `Price change · ${formatDate(group.date)} · per ${pricingUnitLabel(group.pricingUnit)}`;
  const isOpen = current !== null;
  return <>
    <Box sx={{ display: "flex", flexWrap: "nowrap", alignItems: "center", columnGap: 0.5 }}>
      <Typography variant="subtitle2" component="p" sx={{ flex: "1 1 auto", minWidth: 0 }}>{priceEventGroupLabel(group)}</Typography>
      <Tooltip title={isOpen ? "Close this chart" : "Chart this change"}>
        <IconButton ref={buttonRef} size="small" aria-label="Chart this change"
          aria-expanded={isOpen} aria-controls={isOpen ? chartId : undefined} onClick={toggle}
          sx={{
            flexShrink: 0, alignSelf: "flex-start",
            color: isOpen ? "primary.main" : "text.secondary", bgcolor: isOpen ? "action.selected" : undefined,
            ...(compact ? { minWidth: 44, minHeight: 44 } : { my: -0.5 }),
          }}>
          <SsidChartIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
    <PriceEventDetails group={group} open={detailsOpen} onToggle={onDetailsToggle} compact={compact} />
    {/* Each change's chart starts with a fresh readout and legend: it mounts when opened. */}
    {current && <Box id={chartId} sx={{ mt: 1, minWidth: 0 }}
      onFocus={() => onFocusInChart(true)}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) onFocusInChart(false); }}>
      <ExplorerGridItem title={title} headingLevel={4} headingRef={headingRef}
        actions={<><PinButton title={title} chartType="line" prices={current.history} history={() => current.history}
          origin={origin} colors={colors} dateWindow={dateWindow} eventDate={group.date} />
          <Button size="small" onClick={close}>Close</Button></>}>
        <LineViz nadacPrices={current.history} title={title} colors={colors} dateWindow={dateWindow} seriesKind="package"
          eventDate={group.date} />
      </ExplorerGridItem>
    </Box>}
  </>;
});
