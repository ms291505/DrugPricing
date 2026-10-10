import { IconButton, Tooltip } from "@mui/material";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import toast from "react-hot-toast";
import { useExplorerItems } from "../../Context/ExplorerItemsContext";
import { createChartItem, type ChartType, type ExplorerItemSource } from "../../library/explorerItems";
import type { ChartPrice } from "../../library/types";

type Props = {
  title: string,
  chartType: ChartType,
  prices: ChartPrice[],
  source: Omit<ExplorerItemSource, "seriesCount">,
}

/**
 * Pins a system (auto) chart: copies it into the tab's Pinned section as a frozen snapshot,
 * which then survives new searches and filter changes.
 */
export default function PinButton({ title, chartType, prices, source }: Props) {
  const { addItem } = useExplorerItems();

  const handlePin = () => {
    addItem(createChartItem({ chartType, prices, defaultTitle: title, source }));
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
