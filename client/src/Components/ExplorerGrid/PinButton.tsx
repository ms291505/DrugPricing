import { IconButton, Tooltip } from "@mui/material";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import toast from "react-hot-toast";
import { usePinActions } from "../../Context/pinnedItemsContexts";
import {
  createChartItem, withLoadedDates, type ChartChangeSpan, type ChartOrigin, type ChartType, type ExplorerItemSource,
} from "../../library/explorerItems";
import type { ChartPrice } from "../../library/types";
import type { DateWindow } from "../../library/dates";
import type { BarValue } from "../../library/explorerItems";

type Props = {
  title: string,
  chartType: ChartType,
  /** What the chart draws: the page's result as shown. */
  prices: ChartPrice[],
  /** The view's `loadedPrices` at this chart's level: the pin keeps every loaded date of its series. */
  loadedPrices: () => ChartPrice[],
  origin: ChartOrigin,
  dateWindow: DateWindow,
  changeSpan?: ChartChangeSpan,
  /** Line charts opened for one change: its date, which the pin keeps marked. */
  eventDate?: number,
  /** The page's series colors, kept with the pinned copy. */
  colors?: Map<string, string>,
  barValue?: BarValue,
  /** A pinned item's provenance, for a chart opened from it (`createChartItem`'s `source`). */
  source?: ExplorerItemSource,
  /** Called after the pin was added. */
  onPinned?: () => void,
}

/**
 * Pins a system (auto) chart: copies it into the tab's Pinned section as a frozen snapshot,
 * which then survives new searches and filter changes.
 */
export default function PinButton({ title, chartType, prices, loadedPrices, origin, dateWindow, changeSpan, eventDate, colors, barValue, source, onPinned }: Props) {
  const { addItems } = usePinActions();

  const handlePin = () => {
    const item = createChartItem({
      chartType, prices: withLoadedDates(prices, loadedPrices()), defaultTitle: title, origin, dateWindow, changeSpan, eventDate,
      colors, barValue, source,
    });
    addItems([item]);
    toast.success(`Pinned "${title}"`);
    onPinned?.();
  };

  return (
    <Tooltip title="Pin a copy to this tab">
      <IconButton size="small" onClick={handlePin} aria-label={`Pin ${title}`}>
        <PushPinOutlinedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}
