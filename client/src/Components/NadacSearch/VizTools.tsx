
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useMemo } from "react";
import { useNadacSearchContext } from "../../Context/NadacSearchContext";
import type { NadacPrice } from "../../library/types";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import Paper from "@mui/material/Paper"
import Divider from "@mui/material/Divider"
import { CONSTANT } from "../../library/constants";
import { useExplorerItems } from "../../Context/ExplorerItemsContext";
import { createChartItem, type ChartType } from "../../library/explorerItems";
import { chartTitle, seriesLabels } from "../../library/chartTitles";
import useSeriesColors from "../../hooks/useSeriesColors";
import AddChartControl from "../ExplorerGrid/AddChartControl";
import useNadacChartOrigin from "../../hooks/useNadacChartOrigin";
import ChartDatesControl from "../ExplorerGrid/ChartDatesControl";
import useChartWindow from "../../hooks/useChartWindow";

type Props = {
  /** The result as the page shows it (`useRefinedNadacSearch`): Add Chart's source and the colors' visible set. */
  prices: NadacPrice[],
}

export default function VizTools({ prices }: Props) {
  const { criteria, setCriteria, selectedRows } = useNadacSearchContext();
  const { addItem } = useExplorerItems();
  const origin = useNadacChartOrigin();
  const { chartDates, setChartDates, chartWindow, bounds } = useChartWindow(origin.resultPrices);
  const colors = useSeriesColors(origin.resultPrices, prices);

  // The options come from the loaded result, so excluding a description doesn't remove it.
  const ndcDescriptions = useMemo(
    () => [...new Set(origin.resultPrices.map(price => price.ndcDescription))].sort(),
    [origin.resultPrices]);
  const selectedNdcDescriptions = ndcDescriptions.filter(
    description => !criteria.excludedNdcDescriptions.includes(description));

  const handleAddChart = (chartType: ChartType) => {
    const ndcs = new Set([...selectedRows.ids].map(String));
    const chartData = prices.filter((nadacPrice) => ndcs.has(nadacPrice.ndc));
    if (chartData.length === 0) return;

    addItem(createChartItem({
      chartType,
      prices: chartData,
      defaultTitle: chartTitle(chartType, origin.searchLabel, origin.seriesKind, seriesLabels(chartData)),
      origin,
      dateWindow: chartWindow,
      colors,
    }), { focus: true });
  }
  return (
    <Paper
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        p: 1
      }}>
      <Paper elevation={2} sx={{
        display: "flex",
        justifyContent: "center",
        p: 1
      }}>
        <Typography variant="h6">Tools</Typography>
      </Paper>
      <Typography variant="subtitle2">Page Filters</Typography>
      <Box sx={{ display: "flex" }}>
        <FormControl fullWidth>
          <InputLabel id="drug-filter-select-label">{CONSTANT.label.ndcDescriptionNadacSearchFilter}</InputLabel>
          <Select
            label={CONSTANT.label.ndcDescriptionNadacSearchFilter}
            id="drug-filter"
            name="drug-filter"
            multiple
            value={selectedNdcDescriptions}
            onChange={(e) => {
              const newDescriptions = typeof e.target.value === "string"
                ? e.target.value.split(",")
                : e.target.value;

              setCriteria(prev => ({
                ...prev,
                excludedNdcDescriptions: ndcDescriptions.filter(description => !newDescriptions.includes(description)),
              }));
            }}
          >
            {
              ndcDescriptions.map(drug => {
                return (
                  <MenuItem id={drug} key={drug} value={drug}>{drug}</MenuItem>
                )
              })
            }
          </Select>
        </FormControl>
      </Box>
      <Divider />
      <ChartDatesControl value={chartDates} onChange={setChartDates} bounds={bounds} />
      <AddChartControl selectedCount={selectedRows.ids.size} onAdd={handleAddChart} />
    </Paper>
  )
}
