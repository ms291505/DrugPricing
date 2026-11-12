import { memo, useMemo } from "react";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { visuallyHidden } from "@mui/utils";
import { themedSeriesColor } from "../../theme";
import { fromChartSeries, itemTitle, type ChartItem } from "../../library/explorerItems";
import { usePinActions } from "../../Context/pinnedItemsContexts";
import useNearViewport from "../../hooks/useNearViewport";
import useMobile from "../../hooks/useMobile";
import LineViz from "../Charts/LineViz";
import BarViz from "../Charts/BarViz";

type Props = {
  item: ChartItem,
  /** Shared price range per pricing unit from "Match scale". Line charts only. */
  priceRanges?: Map<string, [number, number]>,
}

/**
 * Draws a pinned chart from its stored snapshot: its dates, colors, and bar value. A chart is
 * drawn once it comes near the viewport, so a tab with many pins draws only those in view.
 */
export default memo(function ChartItemBody({ item, priceRanges }: Props) {
  const { ref, near } = useNearViewport<HTMLDivElement>();
  const isMobile = useMobile();

  if (!near) {
    return (
      // About a line chart's height, so the page doesn't jump much as charts are drawn.
      <Box ref={ref} sx={{ width: "100%", aspectRatio: isMobile ? "4 / 3" : "16 / 9", minHeight: 220, maxHeight: 420 }}>
        <Box sx={visuallyHidden}>Chart not drawn yet: it draws when scrolled into view.</Box>
      </Box>
    );
  }
  return <PinnedChart item={item} priceRanges={priceRanges} />;
});

function PinnedChart({ item, priceRanges }: Props) {
  const { updateItem } = usePinActions();
  const prices = useMemo(() => fromChartSeries(item.series), [item.series]);
  const palette = useTheme().palette.chart.series;
  // Charts pinned before colors were stored have none; theirs come from palette order. Stored
  // colors are drawn in the current mode's palette, whichever mode they were pinned in.
  const colors = useMemo(
    () => new Map(item.series.flatMap(series =>
      series.color ? [[series.ndc, themedSeriesColor(series.color, palette)] as const] : [])),
    [item.series, palette]);

  switch (item.chartType) {
    case "line":
      return (
        <LineViz
          nadacPrices={prices}
          title={itemTitle(item)}
          colors={colors}
          dateWindow={item.dateWindow}
          changeSpan={item.changeSpan}
          priceRanges={priceRanges}
        />
      );
    case "bar":
      return (
        <BarViz
          nadacPrices={prices}
          title={itemTitle(item)}
          colors={colors}
          dateWindow={item.dateWindow}
          barValue={item.barValue ?? "latest"}
          onBarValueChange={(barValue) => updateItem(item.id, prev => ({ ...prev, barValue }))}
        />
      );
  }
}
