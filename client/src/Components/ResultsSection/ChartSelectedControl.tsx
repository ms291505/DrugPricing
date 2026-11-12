import { Box, Button, ButtonGroup, Typography } from "@mui/material";
import BarChartIcon from "@mui/icons-material/BarChart";
import SsidChartIcon from "@mui/icons-material/SsidChart";
import type { GridRowSelectionModel } from "@mui/x-data-grid";
import { useExplorerItems } from "../../Context/ExplorerItemsContext";
import { createChartItem, withLoadedHistory, type ChartOrigin, type ChartType } from "../../library/explorerItems";
import { chartTitle, seriesLabels } from "../../library/chartTitles";
import type { DateWindow } from "../../library/dates";
import type { ChartPrice } from "../../library/types";

type Props = {
  /** The page's result as shown, at the table's level: a row's id is its prices' `ndc`. */
  prices: ChartPrice[],
  /** The view's `history` at the table's level: the chart keeps every loaded date of its series. */
  history: () => ChartPrice[],
  selection: GridRowSelectionModel,
  origin: ChartOrigin,
  /** The dates the new chart starts with: the search's. */
  dateWindow: DateWindow,
  colors: Map<string, string>,
};

/** Charts the table's selected rows as a new pinned line or bar chart, which then stays as it is. */
export default function ChartSelectedControl({ prices, history, selection, origin, dateWindow, colors }: Props) {
  const { addItem } = useExplorerItems();
  const count = selection.ids.size;

  const handleChart = (chartType: ChartType) => {
    const ndcs = new Set([...selection.ids].map(String));
    const chartPrices = prices.filter(price => ndcs.has(price.ndc));
    if (chartPrices.length === 0) return;
    addItem(createChartItem({
      chartType,
      prices: withLoadedHistory(chartPrices, history()),
      defaultTitle: chartTitle(chartType, origin.searchLabel, origin.seriesKind, seriesLabels(chartPrices)),
      origin,
      dateWindow,
      colors,
    }), { focus: true });
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Typography variant="body2" color={count === 0 ? "text.secondary" : "text.primary"}>
        {count === 0 ? "Select rows to chart" : `Chart ${count} selected`}
      </Typography>
      <ButtonGroup size="small" variant="outlined" disabled={count === 0}>
        <Button startIcon={<SsidChartIcon />} onClick={() => handleChart("line")}
          aria-label={`Line chart of ${count} selected`}>Line</Button>
        <Button startIcon={<BarChartIcon />} onClick={() => handleChart("bar")}
          aria-label={`Bar chart of ${count} selected`}>Bar</Button>
      </ButtonGroup>
    </Box>
  );
}
