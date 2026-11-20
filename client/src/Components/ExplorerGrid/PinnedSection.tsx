import { memo, useCallback, useId, useMemo, useRef, useState } from "react";
import { Box, Button, Chip, Grid, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { usePinActions, usePinHighlight, usePinnedItems } from "../../Context/pinnedItemsContexts";
import {
  fromChartSeries, isScaleMatched, matchedPriceRange, samePriceRanges,
  type ChartOrigin, type ExplorerItemSource, type PriceChangeListItem,
} from "../../library/explorerItems";
import type { PriceEvent, PriceEventGroup } from "../../library/priceActivity";
import type { DateWindow } from "../../library/dates";
import { eventChartTitle } from "../../library/chartTitles";
import { HALF_WIDTH_GRID_SIZE } from "../../library/constants";
import { themedSeriesColor } from "../../theme";
import useStableValue from "../../hooks/useStableValue";
import EventChangeChart, { type EventChart } from "../ResultsSection/EventChangeChart";
import PinnedItemCard from "./PinnedItemCard";

/** A chart opened from a pinned list, with what it was opened with: the list's dates and provenance. */
type TemporaryChart = EventChart & {
  /** The series' stored color, drawn in the current palette's slot. */
  color?: string,
  dateWindow: DateWindow,
  source: ExplorerItemSource,
  origin: ChartOrigin,
};

const isShown = <T extends HTMLElement>(element: T | null | undefined): element is T =>
  !!element?.isConnected && element.checkVisibility();

/**
 * A tab's pinned items: charts made with Chart selected or pinned from auto charts, and pinned
 * price change lists. They stay as they are across new searches and filter changes. Hidden until
 * something is pinned. Below them, the charts opened from pinned lists, which are not stored.
 * Memoized (no props), so a search page's refine changes don't redraw every pinned chart, and so
 * are the cards: a change to one item, or the add highlight, redraws only that item's card.
 */
export default memo(function PinnedSection() {
  const pinnedItems = usePinnedItems();
  const highlight = usePinHighlight();
  const { setAllCollapsed } = usePinActions();
  const headingId = useId();
  const chartIdPrefix = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Shared axes for the charts the user matched; each card gets them only if it is matched. Kept
  // while the ranges are the same, so a change to an unmatched card doesn't redraw matched ones.
  const priceRanges = useStableValue(useMemo(() => matchedPriceRange(pinnedItems), [pinnedItems]), samePriceRanges);

  // Charts opened from pinned lists, by event key: they stay until their own Close, even when
  // their list is collapsed or removed.
  const [charts, setCharts] = useState<ReadonlyMap<string, TemporaryChart>>(new Map());
  const buttons = useRef(new Map<string, Map<string, HTMLButtonElement>>());
  const registerButton = useCallback((itemId: string, key: string, button: HTMLButtonElement | null) => {
    const lists = buttons.current.get(key) ?? new Map<string, HTMLButtonElement>();
    if (button) lists.set(itemId, button);
    else lists.delete(itemId);
    if (lists.size) buttons.current.set(key, lists);
    else buttons.current.delete(key);
  }, []);
  const toggleChart = useCallback((item: PriceChangeListItem, key: string, group: PriceEventGroup, event: PriceEvent) => {
    setCharts(prev => {
      const next = new Map(prev);
      if (next.has(key)) {
        next.delete(key);
        return next;
      }
      const histories = item.histories.filter(history => history.ndc === event.seriesNdc && history.unit === group.pricingUnit);
      const { searchSource, searchLabel, seriesKind } = item.source;
      next.set(key, {
        // Event keys hold no whitespace.
        key, cardId: `${chartIdPrefix}-${key}`, openerId: item.id, eventDate: group.date,
        title: eventChartTitle(group.date, event.packageNdc, group.pricingUnit),
        prices: fromChartSeries(histories), color: histories[0]?.color,
        dateWindow: item.dateWindow, source: item.source,
        // A pin of the chart keeps `source`; `origin` only names the search.
        origin: { searchSource, searchLabel, seriesKind, resultPrices: [] },
      });
      return next;
    });
  }, [chartIdPrefix]);
  const closeChart = useCallback((key: string) => setCharts(prev => {
    const next = new Map(prev);
    next.delete(key);
    return next;
  }), []);
  // Focus in a closed chart goes to the button that opened it, else its list's heading (when the
  // list is collapsed), else the Pinned heading (the list was removed).
  const onChartRemovedWithFocus = useCallback((chart: EventChart) => {
    const button = buttons.current.get(chart.key)?.get(chart.openerId);
    if (isShown(button)) return button.focus();
    const heading = gridRef.current?.querySelector<HTMLHeadingElement>(`[data-pinned-item="${CSS.escape(chart.openerId)}"] h3`);
    (isShown(heading) ? heading : headingRef.current)?.focus({ preventScroll: true });
  }, []);

  if (pinnedItems.length === 0 && charts.size === 0) return null;

  const anyExpanded = pinnedItems.some(item => !item.collapsed);

  return (
    <Box component="section" aria-labelledby={headingId} sx={{ display: "flex", flexDirection: "column", gap: 1, }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: { xs: 1, md: 0 } }}>
        <Typography component="h2" variant="h6" id={headingId} ref={headingRef} tabIndex={-1}
          sx={{ "&:focus-visible": { outline: "2px solid", outlineOffset: 2 } }}>Pinned</Typography>
        <Chip size="small" label={pinnedItems.length} aria-label={`${pinnedItems.length} pinned items`} />
        {pinnedItems.length > 0 && <Button size="small" sx={{ ml: "auto" }} onClick={() => setAllCollapsed(anyExpanded)}>
          {anyExpanded ? "Collapse all" : "Expand all"}
        </Button>}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ px: { xs: 1, md: 0 } }}>
        Pinned items keep their own data and dates: searches and filters don't change them.
      </Typography>
      <Grid container spacing={2} ref={gridRef}>
        {pinnedItems.map((item, index) => (
          <PinnedItemCard
            key={item.id}
            item={item}
            isFirst={index === 0}
            isLast={index === pinnedItems.length - 1}
            highlight={highlight?.id === item.id ? highlight : null}
            priceRanges={isScaleMatched(item) ? priceRanges : undefined}
            // Lists only: opening a chart must not redraw chart cards.
            {...(item.kind === "price-change-list" && {
              openCharts: charts, onToggleChart: toggleChart, onRegisterButton: registerButton,
            })}
          />
        ))}
      </Grid>
      {charts.size > 0 && <Grid container spacing={2} alignItems="flex-start">
        {[...charts.values()].map(chart => <Grid key={chart.key} size={HALF_WIDTH_GRID_SIZE} sx={{ minWidth: 0 }}>
          <TemporaryChartCard chart={chart} onClose={closeChart} onRemovedWithFocus={onChartRemovedWithFocus} />
        </Grid>)}
      </Grid>}
    </Box>
  );
})

/** A chart opened from a pinned list, in the current palette. Memoized: other charts opening don't redraw it. */
const TemporaryChartCard = memo(function TemporaryChartCard({ chart, onClose, onRemovedWithFocus }: {
  chart: TemporaryChart,
  onClose: (key: string) => void,
  onRemovedWithFocus: (chart: EventChart) => void,
}) {
  const palette = useTheme().palette.chart.series;
  const ndc = chart.prices[0]?.ndc;
  const colors = useMemo(() => new Map(chart.color && ndc ? [[ndc, themedSeriesColor(chart.color, palette)]] : []),
    [chart.color, ndc, palette]);
  return <EventChangeChart chart={chart} origin={chart.origin} colors={colors} dateWindow={chart.dateWindow}
    source={chart.source} onClose={onClose} onRemovedWithFocus={onRemovedWithFocus} />;
});
