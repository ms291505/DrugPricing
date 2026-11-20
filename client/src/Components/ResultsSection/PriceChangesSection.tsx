import { use, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button, Grid, IconButton, Tooltip } from "@mui/material";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import toast from "react-hot-toast";
import { derivePriceEvents, groupPriceEvents, type PriceEvent, type PriceEventGroup } from "../../library/priceActivity";
import type { ChartPrice } from "../../library/types";
import { createPriceChangeListItem, fitsPinLimit, type ChartOrigin } from "../../library/explorerItems";
import type { DateWindow } from "../../library/dates";
import {
  eventChartTitle, pinnedPriceChangeListTitle, priceChangeListSubtitle, priceChangeListTitle,
} from "../../library/chartTitles";
import { HALF_WIDTH_GRID_SIZE, NOTABLE_PRICE_CHANGE_PERCENT } from "../../library/constants";
import useWidthTier from "../../hooks/useWidthTier";
import type { PriceChangeScan } from "../../hooks/usePriceChangeScans";
import ExplorerGridItem from "../ExplorerGrid/ExplorerGridItem";
import { usePinActions } from "../../Context/pinnedItemsContexts";
import { ResultsHeadingContext } from "../../Context/resultsHeading";
import EventChangeChart, { type EventChart } from "./EventChangeChart";
import PriceChangeListBody from "./PriceChangeListBody";

type Props = {
  /** The page's package prices as shown. A new array (new search, dates or filters) closes every scan and chart. */
  prices: ChartPrice[], loadedPrices: () => ChartPrice[], origin: ChartOrigin, colors: Map<string, string>,
  /** The dates the page shows: the window of a change's chart. */
  dateWindow: DateWindow,
  /** From `usePriceChangeScans`. */
  autoClosed: boolean,
  onCloseAuto: () => void,
  scans: PriceChangeScan[],
  onCloseScan: (id: string) => void,
};

/** Notable price changes' list id; scans use theirs. */
const AUTO_LIST = "auto";

const gridItemSx = { alignSelf: "flex-start", minWidth: 0 } as const;

const isShown = <T extends HTMLElement>(element: T | null | undefined): element is T =>
  !!element?.isConnected && element.checkVisibility();
/** In page order, the first first. */
const byPosition = (a: Node, b: Node) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;

/**
 * Notable price changes, the page's scan cards and the package charts opened from any of them.
 * Always mounted, so the open charts and the focus bookkeeping outlive any one card; renders
 * nothing when there is no card and no chart.
 */
export default function PriceChangesSection({
  prices, loadedPrices, origin, colors, dateWindow, autoClosed, onCloseAuto, scans, onCloseScan,
}: Props) {
  const groups = useMemo(() => groupPriceEvents(derivePriceEvents(prices, "package")), [prices]);
  // The user's own open/close of a group's package details, kept across searches (a search's
  // loading state has no groups, which unmounts the card).
  const [detailsChoice, setDetailsChoice] = useState<ReadonlyMap<string, boolean>>(new Map());
  const onDetailsToggle = useCallback((key: string, open: boolean) =>
    setDetailsChoice(prev => new Map(prev).set(key, open)), []);
  const resultsHeadingRef = use(ResultsHeadingContext);
  const sectionId = useId();

  const [charts, setCharts] = useState<ReadonlyMap<string, EventChart>>(new Map());
  // New prices discard every open chart (a chart's focus moves in its `onRemovedWithFocus`).
  const [chartsPrices, setChartsPrices] = useState(prices);
  if (chartsPrices !== prices) {
    setChartsPrices(prices);
    setCharts(new Map());
  }

  // Each list's chart buttons by event key, and each list card's heading, for focus.
  const buttons = useRef(new Map<string, Map<string, HTMLButtonElement>>());
  const registerButton = useCallback((listId: string, key: string, button: HTMLButtonElement | null) => {
    const lists = buttons.current.get(key) ?? new Map<string, HTMLButtonElement>();
    if (button) lists.set(listId, button);
    else lists.delete(listId);
    if (lists.size) buttons.current.set(key, lists);
    else buttons.current.delete(key);
  }, []);
  const headings = useRef(new Map<string, HTMLHeadingElement>());
  const registerHeading = useCallback((listId: string, heading: HTMLHeadingElement | null) => {
    if (heading) headings.current.set(listId, heading);
    else headings.current.delete(listId);
  }, []);
  // The open charts as of the last commit, so the stable callbacks below can read them.
  const chartsRef = useRef(charts);
  useLayoutEffect(() => { chartsRef.current = charts; });
  /** Every shown card's heading, lists and charts, in page order. */
  const shownHeadings = useCallback(() => [
    ...headings.current.values(),
    ...[...chartsRef.current.values()].map(chart => document.getElementById(chart.cardId)?.querySelector("h3")),
  ].filter(isShown).sort(byPosition), []);
  const focusResultsHeading = useCallback(() => resultsHeadingRef?.current?.focus({ preventScroll: true }), [resultsHeadingRef]);

  const toggleChart = useCallback((listId: string, key: string, group: PriceEventGroup, event: PriceEvent) => {
    setCharts(prev => {
      const next = new Map(prev);
      if (next.has(key)) next.delete(key);
      else next.set(key, {
        // One id per change, whichever list opened it. Event keys hold no whitespace.
        key, cardId: `${sectionId}-${key}`, openerId: listId, eventDate: group.date,
        title: eventChartTitle(group.date, event.packageNdc, group.pricingUnit),
        prices: loadedPrices().filter(p => p.ndc === event.packageNdc && p.pricingUnit === group.pricingUnit),
      });
      return next;
    });
  }, [loadedPrices, sectionId]);
  const closeChart = useCallback((key: string) => setCharts(prev => {
    const next = new Map(prev);
    next.delete(key);
    return next;
  }), []);
  // Focus that was in a removed chart (Close, or new prices) goes to the button that opened it,
  // else another list's button for the same change, else the first card left (a list, else a
  // chart), else the results heading.
  const onChartRemovedWithFocus = useCallback((chart: EventChart) => {
    const lists = buttons.current.get(chart.key);
    const button = [lists?.get(chart.openerId), ...(lists?.values() ?? [])].find(isShown);
    if (button) return button.focus();
    const heading = shownHeadings()[0];
    if (heading) heading.focus({ preventScroll: true });
    else focusResultsHeading();
  }, [shownHeadings, focusResultsHeading]);

  // A list's Close moves focus to the next card's heading (a list or a chart), else the previous
  // one's, else the results heading, before the card goes.
  const closeList = useCallback((listId: string) => {
    const shown = shownHeadings();
    const index = shown.indexOf(headings.current.get(listId)!);
    const target = index < 0 ? undefined : shown[index + 1] ?? shown[index - 1];
    if (target) target.focus({ preventScroll: true });
    else focusResultsHeading();
    if (listId === AUTO_LIST) onCloseAuto();
    else onCloseScan(listId);
  }, [shownHeadings, focusResultsHeading, onCloseAuto, onCloseScan]);
  // A card new prices removed with focus inside: Notable price changes, else the results heading.
  const onListRemovedWithFocus = useCallback((listId: string) => {
    const auto = headings.current.get(AUTO_LIST);
    if (listId !== AUTO_LIST && isShown(auto)) auto.focus({ preventScroll: true });
    else focusResultsHeading();
  }, [focusResultsHeading]);

  const showAuto = groups.length > 0 && !autoClosed;
  if (!showAuto && !scans.length && !charts.size) return null;

  const listProps = {
    prices, origin, colors, dateWindow, detailsChoice, onDetailsToggle, charts,
    onToggleChart: toggleChart, onRegisterButton: registerButton, onRegisterHeading: registerHeading,
    onClose: closeList, onRemovedWithFocus: onListRemovedWithFocus,
  };
  return (
    <>
      {showAuto && <PriceChangeListCard key={AUTO_LIST} listId={AUTO_LIST} title="Notable price changes"
        thresholdPercent={NOTABLE_PRICE_CHANGE_PERCENT} groups={groups} detailsKeyPrefix="" focusOnMount={false} {...listProps} />}
      {scans.map(scan => (
        <PriceChangeListCard key={scan.id} listId={scan.id} title={priceChangeListTitle(scan.thresholdPercent)}
          thresholdPercent={scan.thresholdPercent} groups={scan.groups} detailsKeyPrefix={`${scan.id}:`} focusOnMount {...listProps} />
      ))}
      {[...charts.values()].map(chart => (
        <Grid key={chart.key} size={HALF_WIDTH_GRID_SIZE} sx={gridItemSx}>
          <EventChangeChart chart={chart} origin={origin} colors={colors} dateWindow={dateWindow}
            onClose={closeChart} onRemovedWithFocus={onChartRemovedWithFocus} />
        </Grid>
      ))}
    </>
  );
}

/** One list's result card: Notable price changes or a scan. It can be pinned and closed. */
function PriceChangeListCard({
  listId, title, thresholdPercent, groups, detailsKeyPrefix, focusOnMount, prices, origin, colors, dateWindow,
  detailsChoice, onDetailsToggle, charts, onToggleChart, onRegisterButton, onRegisterHeading, onClose, onRemovedWithFocus,
}: {
  listId: string,
  title: string,
  thresholdPercent: number,
  groups: PriceEventGroup[],
  detailsKeyPrefix: string,
  /** A new scan's card takes focus. */
  focusOnMount: boolean,
  prices: ChartPrice[],
  origin: ChartOrigin,
  colors: Map<string, string>,
  dateWindow: DateWindow,
  detailsChoice: ReadonlyMap<string, boolean>,
  onDetailsToggle: (key: string, open: boolean) => void,
  charts: ReadonlyMap<string, EventChart>,
  onToggleChart: (listId: string, key: string, group: PriceEventGroup, event: PriceEvent) => void,
  onRegisterButton: (listId: string, key: string, button: HTMLButtonElement | null) => void,
  onRegisterHeading: (listId: string, heading: HTMLHeadingElement | null) => void,
  onClose: (listId: string) => void,
  /** Called after new prices removed the card with focus inside it. */
  onRemovedWithFocus: (listId: string) => void,
}) {
  // The card's own width: a workspace pane can be narrow in a wide window.
  const [cardRef, widthTier] = useWidthTier<HTMLDivElement>();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { addItems } = usePinActions();

  useLayoutEffect(() => {
    onRegisterHeading(listId, headingRef.current);
    return () => onRegisterHeading(listId, null);
  }, [listId, onRegisterHeading]);
  useEffect(() => {
    if (!focusOnMount || !headingRef.current?.checkVisibility()) return;
    headingRef.current.focus({ preventScroll: true });
    headingRef.current.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [focusOnMount]);
  // As `EventChangeChart`: a layout cleanup still sees the card, and the microtask confirms it left.
  useLayoutEffect(() => {
    const card = cardRef.current;
    return () => {
      if (!card?.contains(document.activeElement)) return;
      queueMicrotask(() => { if (!card.isConnected) onRemovedWithFocus(listId); });
    };
  }, [cardRef, listId, onRemovedWithFocus]);

  const pin = () => {
    const defaultTitle = pinnedPriceChangeListTitle(origin.searchLabel, thresholdPercent);
    const item = createPriceChangeListItem({ prices, groups, thresholdPercent, defaultTitle, origin, dateWindow, colors });
    if (!fitsPinLimit(item)) {
      toast.error(`Too many packages to pin (${item.source.seriesCount}). Narrow the dates or filters, or scan at a higher percent.`);
      return;
    }
    addItems([item]);
    toast.success(`Pinned "${defaultTitle}"`);
  };

  return (
    <Grid ref={cardRef} size={HALF_WIDTH_GRID_SIZE} sx={gridItemSx}>
      <ExplorerGridItem title={title} subtitle={priceChangeListSubtitle(thresholdPercent)} headingLevel={3} headingRef={headingRef}
        actions={<>
          <Tooltip title="Pin a copy to this tab">
            <IconButton size="small" onClick={pin} aria-label={`Pin ${title}`}><PushPinOutlinedIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Button size="small" aria-label={`Close ${title}`}
            onClick={event => { event.currentTarget.focus(); onClose(listId); }}>Close</Button>
        </>}>
        <PriceChangeListBody groups={groups} widthTier={widthTier} detailsChoice={detailsChoice} detailsKeyPrefix={detailsKeyPrefix}
          onDetailsToggle={onDetailsToggle} openCharts={charts}
          onToggleChart={(key, group, event) => onToggleChart(listId, key, group, event)}
          onRegisterButton={(key, button) => onRegisterButton(listId, key, button)} />
      </ExplorerGridItem>
    </Grid>
  );
}
