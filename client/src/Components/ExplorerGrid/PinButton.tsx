import { IconButton, Tooltip } from "@mui/material";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import toast from "react-hot-toast";
import { usePinActions } from "../../Context/pinnedItemsContexts";
import {
  createChartItem, withLoadedHistory, type ChartChangeSpan, type ChartOrigin, type ChartType,
} from "../../library/explorerItems";
import type { ChartPrice } from "../../library/types";
import type { DateWindow } from "../../library/dates";
import type { BarValue } from "../../library/explorerItems";

type Props = {
  title: string,
  chartType: ChartType,
  /** What the chart draws: the page's result as shown. */
  prices: ChartPrice[],
  /** The view's `history` at this chart's level: the pin keeps every loaded date of its series. */
  history: () => ChartPrice[],
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
export default function PinButton({ title, chartType, prices, history, origin, dateWindow, changeSpan, colors, barValue }: Props) {
  const { addItem } = usePinActions();

  const handlePin = () => {
    addItem(createChartItem({
      chartType, prices: withLoadedHistory(prices, history()), defaultTitle: title, origin, dateWindow, changeSpan,
      colors, barValue,
    }));
    toast.success(`Pinned "${title}"`);
  };

  return (
    <Tooltip title="Pin a copy to this tab">
      <IconButton size="small" onClick={handlePin} aria-label={`Pin ${title}`}>
        <PushPinOutlinedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}
