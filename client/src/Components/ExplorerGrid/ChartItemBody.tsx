import { useMemo } from "react";
import { fromChartSeries, type ChartItem } from "../../library/explorerItems";
import { LINE_VIZ_COLORS } from "../../library/constants";
import LineViz from "../NadacSearch/LineViz";
import BarViz from "../NadacSearch/BarViz";

type Props = {
  item: ChartItem,
}

/** Draws a pinned chart from its stored snapshot. */
export default function ChartItemBody({ item }: Props) {
  const prices = useMemo(() => fromChartSeries(item.series), [item.series]);

  switch (item.chartType) {
    case "line":
      return <LineViz nadacPrices={prices} lineColors={LINE_VIZ_COLORS} />;
    case "bar":
      return <BarViz nadacPrices={prices} />;
  }
}
