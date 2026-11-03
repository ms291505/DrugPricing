import { useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import { RETIRED_CHART_SERIES_COLORS } from "../../theme";
import { seriesColorInPalette } from "../../library/seriesColors";
import { fromChartSeries, itemTitle, type ChartItem } from "../../library/explorerItems";
import { useExplorerItems } from "../../Context/ExplorerItemsContext";
import LineViz from "../Charts/LineViz";
import BarViz from "../Charts/BarViz";

type Props = {
  item: ChartItem,
  /** Shared price range per pricing unit from "Match scale". Line charts only. */
  priceRanges?: Map<string, [number, number]>,
}

/** Draws a pinned chart from its stored snapshot: its dates, colors, and bar value. */
export default function ChartItemBody({ item, priceRanges }: Props) {
  const { updateItem } = useExplorerItems();
  const prices = useMemo(() => fromChartSeries(item.series), [item.series]);
  const palette = useTheme().palette.chart.series;
  // Charts pinned before colors were stored have none; theirs come from palette order. Colors
  // from a retired palette move to today's, slot for slot.
  const colors = useMemo(
    () => new Map(item.series.flatMap(series => series.color
      ? [[series.ndc, seriesColorInPalette(series.color, palette, RETIRED_CHART_SERIES_COLORS)] as const]
      : [])),
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
