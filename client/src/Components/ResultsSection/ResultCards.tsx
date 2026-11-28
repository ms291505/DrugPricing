import { useCallback, useMemo, useState, type MouseEvent } from "react";
import { Grid, IconButton, Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
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
import type { AddedCharts } from "../../hooks/useAddedCharts";
import { madeCardsInOrder } from "../../library/resultCards";
import ExplorerGridItem from "../ExplorerGrid/ExplorerGridItem";
import { usePinActions } from "../../Context/pinnedItemsContexts";
import { moveFocusFromClosingCard } from "./closeCard";
import PriceChangeListBody from "./PriceChangeListBody";
import type { ChartContext } from "./PriceChangeChartDialog";
import AddedChartCard from "./AddedChartCard";

type Props = {
  /** What the added charts draw: the table's level (its shown and loaded prices, origin, colors and dates). */
  chartSource: ChartSource,
  /** The page's added charts (`useAddedCharts`). */
  charts: AddedCharts,
  /**
   * The page's packages, which price change lists list. New `prices` (new search, dates or
   * filters) close every scan and change chart; `dateWindow` is the window of a change's chart.
   */
  packageSource: ChartSource,
  /** The page's scans (`usePriceChangeScans`), over the same packages. */
  scans: PriceChangeScans,
};

/** Notable price changes' list id; scans use theirs. */
const AUTO_LIST = "auto";

const gridItemSx = { alignSelf: "flex-start", minWidth: 0 } as const;

/**
 * The cards in the results grid under the table: Notable price changes first, the search's own
 * card, then the cards Line, Bar and Scan price changes made, in the order they were made
 * (`madeCardsInOrder`), so a new one always goes after those already there. Each list opens its
 * own change charts in a dialog (`PriceChangeListBody`).
 */
export default function ResultCards({ chartSource, charts: chartState, packageSource, scans: scanState }: Props) {
  const { prices, loadedPrices, origin, colors, dateWindow } = packageSource;
  const { charts, close: onCloseChart } = chartState;
  const { autoClosed, closeAuto: onCloseAuto, scans, closeScan: onCloseScan } = scanState;
  const groups = useMemo(() => groupPriceEvents(derivePriceEvents(prices, "package")), [prices]);
  // The user's own open/close of a group's package details, kept across searches (a search's
  // loading state has no groups, which unmounts the card).
  const [detailsChoice, setDetailsChoice] = useState<ReadonlyMap<string, boolean>>(new Map());
  const onDetailsToggle = useCallback((key: string, open: boolean) =>
    setDetailsChoice(prev => new Map(prev).set(key, open)), []);

  const chartPrices = useCallback((group: PriceEventGroup, event: PriceEvent) =>
    loadedPrices().filter(p => p.ndc === event.packageNdc && p.pricingUnit === group.pricingUnit), [loadedPrices]);

  // Close keeps focus in the grid when the card holds it (`moveFocusFromClosingCard`).
  const closeList = useCallback((listId: string, event: MouseEvent<HTMLElement>, card: HTMLElement | null) => {
    moveFocusFromClosingCard(card, event);
    if (listId === AUTO_LIST) onCloseAuto();
    else onCloseScan(listId);
  }, [onCloseAuto, onCloseScan]);

  const showAuto = groups.length > 0 && !autoClosed;

  const listProps = { prices, origin, colors, dateWindow, detailsChoice, onDetailsToggle, chartPrices, onClose: closeList };
  return (
    <>
      {showAuto && <PriceChangeListCard key={AUTO_LIST} listId={AUTO_LIST} title="Notable price changes"
        thresholdPercent={NOTABLE_PRICE_CHANGE_PERCENT} groups={groups} detailsKeyPrefix="" {...listProps} />}
      {madeCardsInOrder(charts, scans).map(({ kind, card }) => kind === "chart"
        ? <AddedChartCard key={card.id} source={chartSource} chart={card} onClose={onCloseChart} />
        : (
          <PriceChangeListCard key={card.id} listId={card.id} title={priceChangeListTitle(card.thresholdPercent)}
            thresholdPercent={card.thresholdPercent} groups={card.groups} detailsKeyPrefix={`${card.id}:`} {...listProps} />
        ))}
    </>
  );
}

/** One list's result card: Notable price changes or a scan. It can be pinned and closed. */
function PriceChangeListCard({
  listId, title, thresholdPercent, groups, detailsKeyPrefix, prices, origin, colors, dateWindow,
  detailsChoice, onDetailsToggle, chartPrices, onClose,
}: {
  listId: string,
  title: string,
  thresholdPercent: number,
  groups: PriceEventGroup[],
  detailsKeyPrefix: string,
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
  const { addItems } = usePinActions();
  const chartContext: ChartContext = { listTitle: title, origin, colors, dateWindow };

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
      <ExplorerGridItem title={title} subtitle={priceChangeListSubtitle(thresholdPercent)} headingLevel={3}
        actions={<>
          <Tooltip title="Pin a copy to this tab">
            <IconButton size="small" onClick={pin} aria-label={`Pin ${title}`}><PushPinOutlinedIcon fontSize="small" /></IconButton>
          </Tooltip>
          <Tooltip title="Close">
            <IconButton size="small" aria-label={`Close ${title}`}
              onClick={event => onClose(listId, event, cardRef.current)}><CloseIcon fontSize="small" /></IconButton>
          </Tooltip>
        </>}>
        <PriceChangeListBody groups={groups} widthTier={widthTier} detailsChoice={detailsChoice} detailsKeyPrefix={detailsKeyPrefix}
          onDetailsToggle={onDetailsToggle}
          chartPrices={chartPrices} chartContext={chartContext} />
      </ExplorerGridItem>
    </Grid>
  );
}
