import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Button, Grid, IconButton, Tooltip } from "@mui/material";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import toast from "react-hot-toast";
import { derivePriceEvents, groupPriceEvents, type PriceEvent, type PriceEventGroup } from "../../library/priceActivity";
import type { ChartPrice } from "../../library/types";
import { createPriceChangeListItem, fitsPinLimit, type ChartOrigin, type ChartSource } from "../../library/explorerItems";
import type { DateWindow } from "../../library/dates";
import { pinnedPriceChangeListTitle, priceChangeListSubtitle, priceChangeListTitle } from "../../library/chartTitles";
import { HALF_WIDTH_GRID_SIZE, NOTABLE_PRICE_CHANGE_PERCENT } from "../../library/constants";
import useWidthTier from "../../hooks/useWidthTier";
import type { PriceChangeScans } from "../../hooks/usePriceChangeScans";
import ExplorerGridItem from "../ExplorerGrid/ExplorerGridItem";
import { usePinActions } from "../../Context/pinnedItemsContexts";
import { fromKeyboard, holdsFocus, nearestVisible } from "../ui/focus";
import PriceChangeListBody from "./PriceChangeListBody";
import type { ChartContext } from "./PriceChangeChartDialog";

type Props = {
  /**
   * The page's packages. New `prices` (new search, dates or filters) close every scan and chart;
   * `dateWindow` is the window of a change's chart.
   */
  source: ChartSource,
  /** The page's scans (`usePriceChangeScans`), over the same packages. */
  scans: PriceChangeScans,
};

/** Notable price changes' list id; scans use theirs. */
const AUTO_LIST = "auto";

const gridItemSx = { alignSelf: "flex-start", minWidth: 0 } as const;

const CARD_SELECTOR = ":scope > [data-price-change-list]";

/**
 * Notable price changes and the page's scan cards. Each list opens its own change charts in a
 * dialog (`PriceChangeListBody`). Renders nothing when there is no card.
 */
export default function PriceChangesSection({ source, scans: scanState }: Props) {
  const { prices, loadedPrices, origin, colors, dateWindow } = source;
  const { autoClosed, closeAuto: onCloseAuto, scans, closeScan: onCloseScan } = scanState;
  const groups = useMemo(() => groupPriceEvents(derivePriceEvents(prices, "package")), [prices]);
  // The user's own open/close of a group's package details, kept across searches (a search's
  // loading state has no groups, which unmounts the card).
  const [detailsChoice, setDetailsChoice] = useState<ReadonlyMap<string, boolean>>(new Map());
  const onDetailsToggle = useCallback((key: string, open: boolean) =>
    setDetailsChoice(prev => new Map(prev).set(key, open)), []);

  const chartPrices = useCallback((group: PriceEventGroup, event: PriceEvent) =>
    loadedPrices().filter(p => p.ndc === event.packageNdc && p.pricingUnit === group.pricingUnit), [loadedPrices]);

  // A list's Close, when it holds focus, moves it to the next card's toggle, else the previous
  // card's, else the results heading, before the card goes. A tap or click moves nothing.
  const closeList = useCallback((listId: string, event: MouseEvent<HTMLElement>, card: HTMLElement | null) => {
    if (card && holdsFocus(card)) {
      const cards = [...card.parentElement?.querySelectorAll<HTMLElement>(CARD_SELECTOR) ?? []].filter(c => c.checkVisibility());
      const index = cards.indexOf(card);
      const neighbor = cards[index + 1] ?? cards[index - 1];
      const target = neighbor?.querySelector<HTMLElement>("[data-collapse-toggle]") ?? nearestVisible(card, "[data-results-heading]");
      target?.focus({ preventScroll: !fromKeyboard(event) });
    }
    if (listId === AUTO_LIST) onCloseAuto();
    else onCloseScan(listId);
  }, [onCloseAuto, onCloseScan]);

  const showAuto = groups.length > 0 && !autoClosed;
  if (!showAuto && !scans.length) return null;

  const listProps = { prices, origin, colors, dateWindow, detailsChoice, onDetailsToggle, chartPrices, onClose: closeList };
  return (
    <>
      {showAuto && <PriceChangeListCard key={AUTO_LIST} listId={AUTO_LIST} title="Notable price changes"
        thresholdPercent={NOTABLE_PRICE_CHANGE_PERCENT} groups={groups} detailsKeyPrefix="" focusOnMount={false} {...listProps} />}
      {scans.map(scan => (
        <PriceChangeListCard key={scan.id} listId={scan.id} title={priceChangeListTitle(scan.thresholdPercent)}
          thresholdPercent={scan.thresholdPercent} groups={scan.groups} detailsKeyPrefix={`${scan.id}:`} focusOnMount {...listProps} />
      ))}
    </>
  );
}

/** One list's result card: Notable price changes or a scan. It can be pinned and closed. */
function PriceChangeListCard({
  listId, title, thresholdPercent, groups, detailsKeyPrefix, focusOnMount, prices, origin, colors, dateWindow,
  detailsChoice, onDetailsToggle, chartPrices, onClose,
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
  chartPrices: (group: PriceEventGroup, event: PriceEvent) => ChartPrice[],
  onClose: (listId: string, event: MouseEvent<HTMLElement>, card: HTMLElement | null) => void,
}) {
  // The card's own width: a workspace pane can be narrow in a wide window.
  const [cardRef, widthTier] = useWidthTier<HTMLDivElement>();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { addItems } = usePinActions();
  useEffect(() => {
    if (!focusOnMount || !headingRef.current?.checkVisibility()) return;
    headingRef.current.focus({ preventScroll: true });
    headingRef.current.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [focusOnMount]);
  const chartContext = useMemo<ChartContext>(() => ({ listTitle: title, origin, colors, dateWindow }),
    [title, origin, colors, dateWindow]);

  // New prices remove the card while focus is in it. A layout cleanup still sees the card, and
  // the microtask confirms it left (not StrictMode's rehearsal). If the section is still there
  // (Clear search unmounts all of it), focus goes to Notable price changes' toggle, else the
  // results heading; there is no event, so it never scrolls.
  useLayoutEffect(() => {
    const card = cardRef.current;
    const container = card?.parentElement;
    return () => {
      if (!card || !container || !holdsFocus(card)) return;
      queueMicrotask(() => {
        if (card.isConnected || !container.isConnected) return;
        const auto = listId === AUTO_LIST ? null
          : container.querySelector<HTMLElement>(`${CARD_SELECTOR}[data-price-change-list="${AUTO_LIST}"] [data-collapse-toggle]`);
        const target = auto?.checkVisibility() ? auto : nearestVisible(container, "[data-results-heading]");
        target?.focus({ preventScroll: true });
      });
    };
  }, [cardRef, listId]);

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
    <Grid ref={cardRef} size={HALF_WIDTH_GRID_SIZE} sx={gridItemSx} data-price-change-list={listId}>
      <ExplorerGridItem title={title} subtitle={priceChangeListSubtitle(thresholdPercent)} headingLevel={3} headingRef={headingRef}
        actions={<>
          <Tooltip title="Pin a copy to this tab">
            <IconButton size="small" onClick={pin} aria-label={`Pin ${title}`}><PushPinOutlinedIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Button size="small" aria-label={`Close ${title}`}
            onClick={event => onClose(listId, event, cardRef.current)}>Close</Button>
        </>}>
        <PriceChangeListBody groups={groups} widthTier={widthTier} detailsChoice={detailsChoice} detailsKeyPrefix={detailsKeyPrefix}
          onDetailsToggle={onDetailsToggle}
          chartPrices={chartPrices} chartContext={chartContext} />
      </ExplorerGridItem>
    </Grid>
  );
}
