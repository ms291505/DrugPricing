import { useExplorerItems } from "../../Context/ExplorerItemsContext";
import { createChartItem, type ChartChangeSpan, type ChartOrigin, type ChartType } from "../../library/explorerItems";
import type { ChartPrice } from "../../library/types";
import type { DateWindow } from "../../library/dates";
import type { BarValue } from "../../library/seriesSummary";
import PinIconButton from "./PinIconButton";

type Props = {
  title: string,
  chartType: ChartType,
  prices: ChartPrice[],
  origin: ChartOrigin,
  dateWindow: DateWindow,
  changeSpan?: ChartChangeSpan,
  /** The page's series colors, kept with the pinned copy. */
  colors?: Map<string, string>,
  barValue?: BarValue,
}

/**
 * Pins a system (auto) chart: copies it into the tab's Pinned section as a frozen snapshot,
 * which then survives new searches and filter changes.
 */
export default function PinButton({ title, chartType, prices, origin, dateWindow, changeSpan, colors, barValue }: Props) {
  const { addItem } = useExplorerItems();

  return (
    <PinIconButton
      title={title}
      tooltip="Pin a copy to this tab"
      onPin={() => addItem("pinned", createChartItem({ chartType, prices, defaultTitle: title, origin, dateWindow, changeSpan, colors, barValue }))}
    />
  );
}
