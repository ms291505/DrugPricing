import { memo, useCallback, useId, useLayoutEffect, useMemo, useRef, useState, type SyntheticEvent } from "react";
import { Box, Button, Grid, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import { visuallyHidden } from "@mui/utils";
import {
  derivePriceEvents, groupPriceEvents, previousObservationNote, priceEventGroupLabel, PRICE_CHANGE_GROUP_LIMIT,
  PRICE_CHANGE_PACKAGE_LIMIT, signedChange, type PriceEvent, type PriceEventGroup,
} from "../../library/priceActivity";
import type { ChartPrice } from "../../library/types";
import type { ChartOrigin } from "../../library/explorerItems";
import { formatDate, type DateWindow } from "../../library/dates";
import { formatPrice } from "../../library/chartScale";
import { pricingUnitLabel } from "../../library/prices";
import useWidthTier from "../../hooks/useWidthTier";
import ExplorerGridItem from "../ExplorerGrid/ExplorerGridItem";
import LineViz from "../Charts/LineViz";
import PinButton from "../ExplorerGrid/PinButton";
import { HALF_WIDTH_GRID_SIZE } from "../../library/constants";

type Props = {
  prices: ChartPrice[], history: () => ChartPrice[], origin: ChartOrigin, colors: Map<string, string>,
  /** The dates the page shows: the window of a change's chart. */
  dateWindow: DateWindow,
};

type OpenChart = { key: string, cardId: string, group: PriceEventGroup, event: PriceEvent, history: ChartPrice[] };

const gridItemSx = { alignSelf: "flex-start", minWidth: 0 } as const;

/** Notable price changes and the package charts opened from it; nothing when the prices have no notable change. */
export default function PriceChangesSection(props: Props) {
  const groups = useMemo(() => groupPriceEvents(derivePriceEvents(props.prices, "package")), [props.prices]);
  // The user's own open/close of a group's package details, kept across searches (a search's
  // loading state has no groups, which unmounts the card). Untouched groups follow the width.
  const [detailsChoice, setDetailsChoice] = useState<ReadonlyMap<string, boolean>>(new Map());
  const onDetailsToggle = useCallback((key: string, open: boolean) =>
    setDetailsChoice(prev => new Map(prev).set(key, open)), []);
  return groups.length > 0
    ? <PriceChanges {...props} groups={groups} detailsChoice={detailsChoice} onDetailsToggle={onDetailsToggle} />
    : null;
}

function PriceChanges({ prices, history, origin, colors, dateWindow, groups, detailsChoice, onDetailsToggle }: Props & {
  groups: PriceEventGroup[],
  detailsChoice: ReadonlyMap<string, boolean>,
  onDetailsToggle: (key: string, open: boolean) => void,
}) {
  // The card's own width: a workspace pane can be narrow in a wide window.
  const [cardRef, widthTier] = useWidthTier<HTMLDivElement>();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [showAllGroups, setShowAllGroups] = useState(false);
  const listId = useId();

  const [charts, setCharts] = useState<ReadonlyMap<string, OpenChart>>(new Map());
  // New prices discard every open chart (a chart's focus moves in its `onRemovedWithFocus`).
  const [chartsPrices, setChartsPrices] = useState(prices);
  if (chartsPrices !== prices) {
    setChartsPrices(prices);
    setCharts(new Map());
  }
  const chartCount = useRef(0);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const registerButton = useCallback((key: string, button: HTMLButtonElement | null) => {
    if (button) buttons.current.set(key, button);
    else buttons.current.delete(key);
  }, []);
  const toggleChart = useCallback((group: PriceEventGroup, event: PriceEvent) => {
    const key = eventKey(group, event);
    const cardId = `${listId}-chart-${chartCount.current++}`;
    const packageHistory = history().filter(p => p.ndc === event.packageNdc && p.pricingUnit === group.pricingUnit);
    setCharts(prev => {
      const next = new Map(prev);
      if (next.has(key)) next.delete(key);
      else next.set(key, { key, cardId, group, event, history: packageHistory });
      return next;
    });
  }, [history, listId]);
  const closeChart = useCallback((key: string) => setCharts(prev => {
    const next = new Map(prev);
    next.delete(key);
    return next;
  }), []);
  // Focus that was in a removed chart (Close, or new prices) goes to the chart's button if it's
  // still shown, else this card's heading, else the results heading.
  const onRemovedWithFocus = useCallback((key: string, results: HTMLElement | null) => {
    const button = buttons.current.get(key);
    if (button?.isConnected && button.checkVisibility()) return button.focus();
    const labelledBy = results?.getAttribute("aria-labelledby");
    const heading = [headingRef.current, labelledBy ? document.getElementById(labelledBy) : null]
      .find(element => element?.isConnected && element.checkVisibility());
    heading?.focus({ preventScroll: true });
  }, []);

  const defaultOpen = widthTier === "wide";
  const compact = widthTier === "narrow";
  const chartIds = new Map([...charts.values()].map(chart => [chart.key, chart.cardId]));
  return <>
    <Grid ref={cardRef} size={HALF_WIDTH_GRID_SIZE} sx={gridItemSx}>
      <ExplorerGridItem title="Notable price changes" subtitle="Package changes of 10% or more in these dates and filters."
        headingLevel={3} headingRef={headingRef}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Box id={listId} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {(showAllGroups ? groups : groups.slice(0, PRICE_CHANGE_GROUP_LIMIT)).map(group =>
              <PriceEventGroupRow key={group.key} group={group} chartIds={chartIds} compact={compact}
                detailsOpen={detailsChoice.get(group.key) ?? defaultOpen} onDetailsToggle={onDetailsToggle}
                onToggleChart={toggleChart} onRegisterButton={registerButton} />)}
          </Box>
          {groups.length > PRICE_CHANGE_GROUP_LIMIT && <Button size="small" sx={{ alignSelf: "flex-start" }}
            aria-expanded={showAllGroups} aria-controls={listId} onClick={() => setShowAllGroups(!showAllGroups)}>
            {showAllGroups ? "Show fewer" : `Show all ${groups.length} events`}
          </Button>}
        </Box>
      </ExplorerGridItem>
    </Grid>
    {[...charts.values()].map(chart => <Grid key={chart.key} size={HALF_WIDTH_GRID_SIZE} sx={gridItemSx}>
      <EventChangeChart chart={chart} origin={origin} colors={colors} dateWindow={dateWindow}
        onClose={closeChart} onRemovedWithFocus={onRemovedWithFocus} />
    </Grid>)}
  </>;
}

/**
 * One date/unit/direction group: its label and a Package details disclosure with one row per
 * package (NDC, old and new price, the change). The label gives the date, unit and direction, so
 * rows repeat none of them.
 */
function PriceEventGroupRow({ group, chartIds, compact, detailsOpen, onDetailsToggle, onToggleChart, onRegisterButton }: {
  group: PriceEventGroup,
  /** Open charts' card ids, by event key. */
  chartIds: ReadonlyMap<string, string>,
  /** Narrow: the amount folds under the percent. */
  compact: boolean,
  detailsOpen: boolean,
  onDetailsToggle: (key: string, open: boolean) => void,
  onToggleChart: (group: PriceEventGroup, event: PriceEvent) => void,
  onRegisterButton: (key: string, button: HTMLButtonElement | null) => void,
}) {
  const [showAll, setShowAll] = useState(false);
  const tableId = useId();
  const label = priceEventGroupLabel(group);
  const capped = group.events.length > PRICE_CHANGE_PACKAGE_LIMIT;
  const events = showAll || !capped ? group.events : group.events.slice(0, PRICE_CHANGE_PACKAGE_LIMIT);
  const glyph = group.direction === "drop" ? "▼" : "▲";
  const glyphColor = group.direction === "drop" ? "chart.drop" : "chart.rise";
  const caption = { display: "block", color: "text.secondary", typography: "caption" } as const;
  return <Box sx={{ width: "100%", borderBottom: 1, borderColor: "divider", py: 1, display: "flex", flexDirection: "column", gap: 0.5, minWidth: 0 }}>
    <Typography variant="subtitle2" component="p">{label}</Typography>
    <Box component="details" open={detailsOpen}
      // A toggle React caused (the default changed) leaves `open` as rendered; only the user's differs.
      onToggle={(event: SyntheticEvent<HTMLDetailsElement>) => {
        const now = event.currentTarget.open;
        if (now !== detailsOpen) onDetailsToggle(group.key, now);
      }}
      sx={{ fontSize: "0.875rem", color: "text.secondary", maxWidth: "100%", "& > summary": { cursor: "pointer", width: "fit-content" } }}>
      <summary>Package details</summary>
      <Box sx={{ maxWidth: "100%", overflowX: "auto", mt: 0.5 }}>
        <Table id={tableId} size="small" sx={{
          width: "100%",
          "& th, & td": { px: 1, py: 0.5, borderColor: "divider", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", verticalAlign: "top" },
          "& th:first-of-type, & td:first-of-type": { pl: 0 },
          "& thead th": { color: "text.secondary", typography: "caption", fontWeight: 600 },
          "& tbody tr:last-of-type th, & tbody tr:last-of-type td": { borderBottom: 0 },
        }}>
          <Box component="caption" sx={visuallyHidden}>{label}: prices per {pricingUnitLabel(group.pricingUnit)}</Box>
          <TableHead>
            <TableRow>
              <TableCell>Package NDC</TableCell>
              <TableCell align="right">Was</TableCell>
              <TableCell align="right">Now</TableCell>
              <TableCell align="right">Change</TableCell>
              {!compact && <TableCell align="right">Amount</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {events.map(event => {
              const key = eventKey(group, event);
              const chartId = chartIds.get(key);
              const { percent, amount } = signedChange(event.change);
              const note = previousObservationNote(event, group);
              return <TableRow key={key}>
                <TableCell component="th" scope="row">
                  {event.packageNdc}
                  <Tooltip title={chartId ? "Close this chart" : "Chart this change"}>
                    <IconButton ref={button => onRegisterButton(key, button)} size="small"
                      aria-label={`${chartId ? "Close" : "Chart"} price change for ${event.packageNdc}`}
                      aria-expanded={!!chartId} aria-controls={chartId} onClick={() => onToggleChart(group, event)}
                      sx={{ ml: 0.5, color: chartId ? "primary.main" : "text.secondary", ...(compact ? { minWidth: 44, minHeight: 44 } : {}) }}>
                      <ShowChartIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {note && <Box component="span" sx={caption}>{note}</Box>}
                </TableCell>
                <TableCell align="right" sx={{ color: "text.secondary" }}>{formatPrice(event.change.oldPrice)}</TableCell>
                <TableCell align="right">{formatPrice(event.change.newPrice)}</TableCell>
                <TableCell align="right"><Box component="span" aria-hidden sx={{ color: glyphColor, mr: 0.5, fontSize: "0.75em" }}>{glyph}</Box>
                  {percent}{compact && <Box component="span" sx={caption}>{amount}</Box>}
                </TableCell>
                {!compact && <TableCell align="right" sx={{ color: "text.secondary" }}>{amount}</TableCell>}
              </TableRow>;
            })}
          </TableBody>
        </Table>
        {capped && <Button size="small" sx={{ ml: -0.5 }} aria-expanded={showAll} aria-controls={tableId}
          onClick={() => setShowAll(value => !value)}>
          {showAll ? "Show fewer packages" : `Show all ${group.events.length} packages`}
        </Button>}
      </Box>
    </Box>
  </Box>;
}

function eventKey(group: PriceEventGroup, event: PriceEvent) {
  const { startDate, endDate, oldPrice, newPrice } = event.change;
  return `${group.key}:${event.seriesNdc}:${event.packageNdc}:${startDate.getTime()}:${endDate.getTime()}:${oldPrice}:${newPrice}`;
}

const EventChangeChart = memo(function EventChangeChart({ chart, origin, colors, dateWindow, onClose, onRemovedWithFocus }: {
  chart: OpenChart, origin: ChartOrigin, colors: Map<string, string>, dateWindow: DateWindow,
  onClose: (key: string) => void,
  /** Called after the chart was removed with focus inside it, with the results section it was in. */
  onRemovedWithFocus: (key: string, results: HTMLElement | null) => void,
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const title = `Price change · ${formatDate(chart.group.date)} · ${chart.event.packageNdc} · per ${pricingUnitLabel(chart.group.pricingUnit)}`;
  // A new chart takes focus. A layout cleanup runs while the chart is still in the document, so
  // it can tell whether focus is about to be lost with it; once the commit is done, the chart is
  // gone unless the cleanup was only StrictMode's rehearsal.
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (headingRef.current?.checkVisibility()) {
      headingRef.current.focus({ preventScroll: true });
      headingRef.current.scrollIntoView({ block: "nearest", behavior: "auto" });
    }
    return () => {
      if (!box?.contains(document.activeElement)) return;
      const results = box.closest("section");
      queueMicrotask(() => { if (!box.isConnected) onRemovedWithFocus(chart.key, results); });
    };
  }, [chart.key, onRemovedWithFocus]);
  return <Box ref={boxRef} id={chart.cardId} sx={{ minWidth: 0 }}>
    <ExplorerGridItem title={title} headingLevel={3} headingRef={headingRef}
      actions={<><PinButton title={title} chartType="line" prices={chart.history} history={() => chart.history}
        origin={origin} colors={colors} dateWindow={dateWindow} eventDate={chart.group.date} />
        <Button size="small" onClick={() => onClose(chart.key)}>Close</Button></>}>
      <LineViz nadacPrices={chart.history} title={title} colors={colors} dateWindow={dateWindow} seriesKind="package"
        eventDate={chart.group.date} />
    </ExplorerGridItem>
  </Box>;
});
