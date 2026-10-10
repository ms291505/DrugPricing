import { useMemo } from "react";
import { fromChartSeries, type ChartItem } from "../../library/explorerItems";
import { LINE_VIZ_COLORS } from "../../library/constants";
import LineViz from "../Charts/LineViz";
import BarViz from "../Charts/BarViz";

type Props = {
  item: ChartItem,
  /** Price-axis maximum per pricing unit from "Match scale". Line charts only. */
  priceMax?: Map<string, number>,
}

/** Draws a pinned chart from its stored snapshot, showing the item's dates. */
export default function ChartItemBody({ item, priceMax }: Props) {
  const prices = useMemo(() => fromChartSeries(item.series), [item.series]);

  switch (item.chartType) {
    case "line":
      return (
        <LineViz
          nadacPrices={prices}
          lineColors={LINE_VIZ_COLORS}
          dateWindow={item.dateWindow}
          changeSpan={item.changeSpan}
          priceMax={priceMax}
        />
      );
    case "bar":
      return <BarViz nadacPrices={prices} dateWindow={item.dateWindow} />;
  }
}
