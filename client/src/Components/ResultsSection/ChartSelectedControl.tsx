import toast from "react-hot-toast";
import { Box, Button, ButtonGroup, Typography } from "@mui/material";
import BarChartIcon from "@mui/icons-material/BarChart";
import SsidChartIcon from "@mui/icons-material/SsidChart";
import type { GridRowSelectionModel } from "@mui/x-data-grid";
import { usePinActions } from "../../Context/pinnedItemsContexts";
import { createChartItems, withLoadedDates, type ChartSource, type ChartType } from "../../library/explorerItems";
import { chartTitle, seriesLabels } from "../../library/chartTitles";

type Props = {
  /** At the table's level: a row's id is its prices' `ndc`. A new chart starts at the search's dates. */
  source: ChartSource,
  selection: GridRowSelectionModel,
};

/** Charts the table's selected rows as a new pinned line or bar chart, which then stays as it is. */
export default function ChartSelectedControl({ source, selection }: Props) {
  const { prices, loadedPrices, origin, dateWindow, colors } = source;
  const { addItems } = usePinActions();
  const count = selection.ids.size;

  const handleChart = (chartType: ChartType) => {
    const ndcs = new Set([...selection.ids].map(String));
    const chartPrices = prices.filter(price => ndcs.has(price.ndc));
    if (chartPrices.length === 0) return;
    const items = createChartItems({
      chartType,
      prices: withLoadedDates(chartPrices, loadedPrices()),
      defaultTitle: chartTitle(chartType, origin.searchLabel, origin.seriesKind, seriesLabels(chartPrices)),
      origin,
      dateWindow,
      colors,
    }, unitPrices => chartTitle(chartType, origin.searchLabel, origin.seriesKind, seriesLabels(unitPrices)));
    addItems(items, { focus: true });
    if (items.length > 1) toast.success(`Added ${items.length} charts, one per pricing unit (${items.map(item => item.series[0].unit).join(", ")}).`);
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
