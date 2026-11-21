import { useCallback, useMemo, useState } from "react";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  fromChartSeries, itemTitle, priceChangeListGroups, type PriceChangeListItem,
} from "../../library/explorerItems";
import type { PriceEvent, PriceEventGroup } from "../../library/priceActivity";
import { themedSeriesColor } from "../../theme";
import useWidthTier from "../../hooks/useWidthTier";
import PriceChangeListBody from "../ResultsSection/PriceChangeListBody";
import type { ChartContext } from "../ResultsSection/PriceChangeChartDialog";

/**
 * A pinned list's body: its groups, derived again from the stored histories and threshold. Its
 * Chart this change buttons open a package's change in a dialog, over the list's own dates, whose
 * Pin keeps a copy under Pinned.
 */
export default function PinnedPriceChangeList({ item }: { item: PriceChangeListItem }) {
  const { histories, thresholdPercent, dateWindow, source } = item;
  // Not on `item`, which changes whenever the card is collapsed or resized.
  const groups = useMemo(() => priceChangeListGroups({ histories, thresholdPercent }), [histories, thresholdPercent]);
  // The list's own width: a pinned card can be half or full width, in a pane of any width.
  const [ref, widthTier] = useWidthTier<HTMLDivElement>();
  // The user's own open/close of each group's Package details while the card is open.
  const [detailsChoice, setDetailsChoice] = useState<ReadonlyMap<string, boolean>>(new Map());
  const onDetailsToggle = useCallback((key: string, open: boolean) =>
    setDetailsChoice(prev => new Map(prev).set(key, open)), []);

  const chartPrices = useCallback((group: PriceEventGroup, event: PriceEvent) =>
    fromChartSeries(histories.filter(history => history.ndc === event.seriesNdc && history.unit === group.pricingUnit)),
  [histories]);
  // The stored colors, drawn in the current palette's slots.
  const palette = useTheme().palette.chart.series;
  const colors = useMemo(() => new Map(histories.flatMap(history =>
    history.color ? [[history.ndc, themedSeriesColor(history.color, palette)] as const] : [])), [histories, palette]);
  const title = itemTitle(item);
  const chartContext = useMemo<ChartContext>(() => {
    const { searchSource, searchLabel, seriesKind } = source;
    // A pin of the chart keeps `source`; `origin` only names the search.
    return { listTitle: title, colors, dateWindow, source, origin: { searchSource, searchLabel, seriesKind, resultPrices: [] } };
  }, [title, colors, dateWindow, source]);

  return (
    <Box ref={ref} sx={{ minWidth: 0 }}>
      <PriceChangeListBody groups={groups} widthTier={widthTier} detailsChoice={detailsChoice} detailsKeyPrefix=""
        onDetailsToggle={onDetailsToggle} chartPrices={chartPrices} chartContext={chartContext} />
    </Box>
  );
}
