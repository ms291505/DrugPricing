
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
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
  /** The Drug filter's options (`nadacFilterOptions`): excluding a drug doesn't remove it. */
  ndcDescriptions: string[],
}

export default function VizTools({ prices, ndcDescriptions }: Props) {
  const { criteria, setCriteria, selectedRows } = useNadacSearchContext();
  const { addItem } = useExplorerItems();
  const origin = useNadacChartOrigin();
  const { chartDates, setChartDates, chartWindow, bounds } = useChartWindow(origin.resultPrices);
  const colors = useSeriesColors(origin.resultPrices, prices);

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
          <InputLabel id="drug-filter-select-label" shrink>{CONSTANT.label.ndcDescriptionNadacSearchFilter}</InputLabel>
          <Select
            labelId="drug-filter-select-label"
            label={CONSTANT.label.ndcDescriptionNadacSearchFilter}
            id="drug-filter"
            name="drug-filter"
            multiple
            // Excluding every drug still shows "0 of N drugs", which needs the label kept up.
            displayEmpty
            notched
            value={selectedNdcDescriptions}
            disabled={ndcDescriptions.length === 0}
            // A count, not the first names: it says when the filter is on.
            renderValue={selected => ndcDescriptions.length === 0 ? ""
              : selected.length === ndcDescriptions.length ? "All drugs"
              : `${selected.length} of ${ndcDescriptions.length} drugs`}
            onChange={(e) => {
              const newDescriptions = typeof e.target.value === "string"
                ? e.target.value.split(",")
                : e.target.value;

              // Exclusions of drugs not listed now (OTC while it's hidden) are kept.
              setCriteria(prev => ({
                ...prev,
                excludedNdcDescriptions: [
                  ...prev.excludedNdcDescriptions.filter(description => !ndcDescriptions.includes(description)),
                  ...ndcDescriptions.filter(description => !newDescriptions.includes(description)),
                ],
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
