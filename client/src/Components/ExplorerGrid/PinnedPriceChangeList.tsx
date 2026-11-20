import { useCallback, useMemo, useState } from "react";
import { Box } from "@mui/material";
import { priceChangeListGroups, type PriceChangeListItem } from "../../library/explorerItems";
import type { PriceEvent, PriceEventGroup } from "../../library/priceActivity";
import useWidthTier from "../../hooks/useWidthTier";
import PriceChangeListBody from "../ResultsSection/PriceChangeListBody";

export type PinnedListChartProps = {
  /** The Pinned section's open change charts, by event key. */
  openCharts: ReadonlyMap<string, { cardId: string }>,
  onToggleChart: (item: PriceChangeListItem, key: string, group: PriceEventGroup, event: PriceEvent) => void,
  onRegisterButton: (itemId: string, key: string, button: HTMLButtonElement | null) => void,
};

/**
 * A pinned list's body: its groups, derived again from the stored histories and threshold. Its
 * Chart this change buttons open charts in the Pinned section, over the list's own dates.
 */
export default function PinnedPriceChangeList({ item, openCharts, onToggleChart, onRegisterButton }: PinnedListChartProps & {
  item: PriceChangeListItem,
}) {
  const { histories, thresholdPercent } = item;
  // Not on `item`, which changes whenever the card is collapsed or resized.
  const groups = useMemo(() => priceChangeListGroups({ histories, thresholdPercent }), [histories, thresholdPercent]);
  // The list's own width: a pinned card can be half or full width, in a pane of any width.
  const [ref, widthTier] = useWidthTier<HTMLDivElement>();
  // The user's own open/close of each group's Package details while the card is open.
  const [detailsChoice, setDetailsChoice] = useState<ReadonlyMap<string, boolean>>(new Map());
  const onDetailsToggle = useCallback((key: string, open: boolean) =>
    setDetailsChoice(prev => new Map(prev).set(key, open)), []);
  return (
    <Box ref={ref} sx={{ minWidth: 0 }}>
      <PriceChangeListBody groups={groups} widthTier={widthTier} detailsChoice={detailsChoice} detailsKeyPrefix=""
        onDetailsToggle={onDetailsToggle} openCharts={openCharts}
        onToggleChart={(key, group, event) => onToggleChart(item, key, group, event)}
        onRegisterButton={(key, button) => onRegisterButton(item.id, key, button)} />
    </Box>
  );
}
