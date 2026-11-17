import { memo, useCallback, useEffect, useMemo, useRef, useState, type Ref } from "react";
import { Box, Button, Grid, Typography } from "@mui/material";
import { derivePriceEvents, groupPriceEvents, priceEventGroupLabel, type PriceEvent, type PriceEventGroup } from "../../library/priceActivity";
import type { ChartPrice } from "../../library/types";
import type { ChartOrigin } from "../../library/explorerItems";
import { formatDate, type DateWindow } from "../../library/dates";
import { pricingUnitLabel } from "../../library/prices";
import useWidthTier from "../../hooks/useWidthTier";
import PriceEventsList, { PriceEventDetails } from "./PriceEventsList";
import ExplorerGridItem from "../ExplorerGrid/ExplorerGridItem";
import LineViz from "../Charts/LineViz";
import PinButton from "../ExplorerGrid/PinButton";
import { visuallyHidden } from "@mui/utils";
import { HALF_WIDTH_GRID_SIZE } from "../../library/constants";

type Props = {
  prices: ChartPrice[], history: () => ChartPrice[], origin: ChartOrigin, colors: Map<string, string>,
  /** The dates the page shows: the window of a change's chart. */
  dateWindow: DateWindow,
};

/** Notable price changes and its unpinned, event-derived package charts. */
export default function PriceChangesSection(props: Props) {
  const groups = useMemo(() => groupPriceEvents(derivePriceEvents(props.prices, "package")), [props.prices]);
  // The user's own open/close of a group's package details, kept while the page is mounted.
  const [detailsChoice, setDetailsChoice] = useState<ReadonlyMap<string, boolean>>(new Map());
  const onDetailsToggle = useCallback((key: string, open: boolean) =>
    setDetailsChoice(prev => new Map(prev).set(key, open)), []);
  return <PriceChanges {...props} groups={groups} detailsChoice={detailsChoice} onDetailsToggle={onDetailsToggle} />;
}

type ListProps = Props & {
  groups: PriceEventGroup[],
  detailsChoice: ReadonlyMap<string, boolean>,
  onDetailsToggle: (key: string, open: boolean) => void,
};

type OpenEventChart = {
  key: string,
  cardId: string,
  group: PriceEventGroup,
  event: PriceEvent,
  prices: ChartPrice[],
  history: ChartPrice[],
};
type OpenChartState = { prices: ChartPrice[], charts: ReadonlyMap<string, OpenEventChart> };

function PriceChanges({ prices, history, origin, colors, dateWindow, groups, detailsChoice, onDetailsToggle }: ListProps) {
  const sectionHeadingRef = useRef<HTMLHeadingElement>(null);
  // Whether focus is in an event chart: new prices remove it and may leave focus on `body`.
  const focusInChart = useRef(false);
  const [openChartState, setOpenChartState] = useState<OpenChartState>(() => ({ prices, charts: new Map() }));
  const openCharts = openChartState.prices === prices ? openChartState.charts : new Map<string, OpenEventChart>();
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());
  const setFocusInChart = useCallback((inChart: boolean) => { focusInChart.current = inChart; }, []);
  const registerButton = useCallback((key: string, button: HTMLButtonElement | null) => {
    if (button) buttonRefs.current.set(key, button);
    else buttonRefs.current.delete(key);
  }, []);
  const toggleChart = useCallback((group: PriceEventGroup, event: PriceEvent, cardId: string) => {
    const key = eventKey(group, event);
    const packageHistory = history().filter(p => p.ndc === event.packageNdc && p.pricingUnit === group.pricingUnit);
    const chart = { key, cardId, group, event, prices, history: packageHistory };
    setOpenChartState(prev => {
      const next = new Map(prev.prices === prices ? prev.charts : []);
      if (next.has(key)) next.delete(key);
      else next.set(key, chart);
      return { prices, charts: next };
    });
  }, [prices, history]);
  const closeChart = useCallback((key: string) => {
    const opener = buttonRefs.current.get(key);
    if (opener?.isConnected && opener.checkVisibility()) opener.focus();
    else if (sectionHeadingRef.current?.checkVisibility()) sectionHeadingRef.current.focus({ preventScroll: true });
    setFocusInChart(false);
    setOpenChartState(prev => {
      if (prev.prices !== prices) return prev;
      const next = new Map(prev.charts);
      next.delete(key);
      return { prices, charts: next };
    });
  }, [prices, setFocusInChart]);
  const currentCharts = [...openCharts.values()].filter(chart => chart.prices === prices
    && groups.some(group => group.key === chart.group.key && group.events.some(event => eventKey(group, event) === chart.key)));
  const chartIds = new Map(currentCharts.map(chart => [chart.key, chart.cardId]));
  const emptyHeadingRef = useRef<HTMLHeadingElement>(null);
  // New prices immediately hide every old chart. Focus that was in a removed chart lands on the
  // card heading, or on a visually hidden heading if this result has no significant changes.
  useEffect(() => {
    if (focusInChart.current && (document.activeElement === null || document.activeElement === document.body)) {
      const heading = sectionHeadingRef.current ?? emptyHeadingRef.current;
      if (heading?.checkVisibility()) heading.focus({ preventScroll: true });
    }
    focusInChart.current = false;
  }, [prices]);
  return <>
    {groups.length > 0 ? <NotablePriceChangesCard groups={groups} detailsChoice={detailsChoice}
      openChartIds={chartIds} headingRef={sectionHeadingRef} onDetailsToggle={onDetailsToggle}
      onToggleChart={toggleChart} onRegisterButton={registerButton} />
      : <Typography ref={emptyHeadingRef} component="h3" tabIndex={-1} sx={visuallyHidden}>Notable price changes</Typography>}
    {currentCharts.map(chart => <Grid key={chart.key} size={HALF_WIDTH_GRID_SIZE} sx={{ alignSelf: "flex-start", minWidth: 0 }}>
      <EventChangeChart chart={chart} origin={origin} colors={colors} dateWindow={dateWindow}
        onClose={closeChart} onFocusInChart={setFocusInChart} />
    </Grid>)}
  </>;
}

function NotablePriceChangesCard({ groups, detailsChoice, openChartIds, headingRef, onDetailsToggle, onToggleChart, onRegisterButton }: {
  groups: PriceEventGroup[],
  detailsChoice: ReadonlyMap<string, boolean>,
  openChartIds: ReadonlyMap<string, string>,
  headingRef: Ref<HTMLHeadingElement>,
  onDetailsToggle: (key: string, open: boolean) => void,
  onToggleChart: (group: PriceEventGroup, event: PriceEvent, chartId: string) => void,
  onRegisterButton: (key: string, button: HTMLButtonElement | null) => void,
}) {
  // The section's own width: a workspace pane can be narrow in a wide window.
  const [sectionRef, widthTier] = useWidthTier<HTMLDivElement>();
  // Package details start open from `md` up; a group the user toggled keeps its own choice.
  const defaultOpen = widthTier === "wide";
  const compact = widthTier === "narrow";
  return <Grid ref={sectionRef} size={HALF_WIDTH_GRID_SIZE} sx={{ alignSelf: "flex-start", minWidth: 0 }}>
    <ExplorerGridItem title="Notable price changes" subtitle="Package changes of 10% or more in these dates and filters."
      headingLevel={3} headingRef={headingRef}>
      <PriceEventsList groups={groups}
        renderGroup={group => <PriceChangeRow group={group} openChartIds={openChartIds} compact={compact}
          detailsOpen={detailsChoice.get(group.key) ?? defaultOpen} onDetailsToggle={onDetailsToggle}
          onToggleChart={onToggleChart} onRegisterButton={onRegisterButton} />} />
    </ExplorerGridItem>
  </Grid>;
}

type RowProps = {
  group: PriceEventGroup,
  openChartIds: ReadonlyMap<string, string>,
  compact: boolean,
  detailsOpen: boolean,
  onDetailsToggle: (key: string, open: boolean) => void,
  onToggleChart: (group: PriceEventGroup, event: PriceEvent, chartId: string) => void,
  onRegisterButton: (key: string, button: HTMLButtonElement | null) => void,
};

/** One event group and its details; individual package triggers and chart cards are memoized. */
const PriceChangeRow = memo(function PriceChangeRow({
  group, openChartIds, compact, detailsOpen, onDetailsToggle,
  onToggleChart, onRegisterButton,
}: RowProps) {
  return <>
    <Typography variant="subtitle2" component="p">{priceEventGroupLabel(group)}</Typography>
    <PriceEventDetails group={group} openChartIds={openChartIds} onToggleChart={onToggleChart}
      onRegisterButton={onRegisterButton} open={detailsOpen} onToggle={onDetailsToggle} compact={compact} />
  </>;
});

function eventKey(group: PriceEventGroup, event: PriceEvent) {
  const { startDate, endDate, oldPrice, newPrice } = event.change;
  return `${group.key}:${event.seriesNdc}:${event.packageNdc}:${startDate.getTime()}:${endDate.getTime()}:${oldPrice}:${newPrice}`;
}

const EventChangeChart = memo(function EventChangeChart({ chart, origin, colors, dateWindow, onClose, onFocusInChart }: {
  chart: OpenEventChart, origin: ChartOrigin, colors: Map<string, string>, dateWindow: DateWindow,
  onClose: (key: string) => void, onFocusInChart: (inChart: boolean) => void,
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const title = `Price change · ${formatDate(chart.group.date)} · ${chart.event.packageNdc} · per ${pricingUnitLabel(chart.group.pricingUnit)}`;
  useEffect(() => {
    if (!headingRef.current?.checkVisibility()) return;
    headingRef.current.focus({ preventScroll: true });
    headingRef.current.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, []);
  return <Box id={chart.cardId} sx={{ minWidth: 0 }}
    onFocus={() => onFocusInChart(true)}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) onFocusInChart(false); }}>
    <ExplorerGridItem title={title} headingLevel={3} headingRef={headingRef}
      actions={<><PinButton title={title} chartType="line" prices={chart.history} history={() => chart.history}
        origin={origin} colors={colors} dateWindow={dateWindow} eventDate={chart.group.date} />
        <Button size="small" onClick={() => onClose(chart.key)}>Close</Button></>}>
      <LineViz nadacPrices={chart.history} title={title} colors={colors} dateWindow={dateWindow} seriesKind="package"
        eventDate={chart.group.date} />
    </ExplorerGridItem>
  </Box>;
});
