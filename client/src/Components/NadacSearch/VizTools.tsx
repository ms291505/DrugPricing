
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useSearchContext } from "../../Context/SearchContext";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import Paper from "@mui/material/Paper"
import Divider from "@mui/material/Divider"
import { CONSTANT } from "../../library/constants";
import { useExplorerItems } from "../../Context/ExplorerItemsContext";
import { addedChartTitle, createChartItem, type ChartType } from "../../library/explorerItems";
import { countSeries } from "../../library/chartSeries";
import AddChartControl from "../ExplorerGrid/AddChartControl";
import useNadacChartOrigin from "../../hooks/useNadacChartOrigin";

export default function VizTools() {
  const { data, setVizData, ndcDescriptions, selectedNdcDescriptions, setSelectedNdcDescriptions, newChartRows, vizData } = useSearchContext();
  const { addItem } = useExplorerItems();
  const origin = useNadacChartOrigin();

  const handleAddChart = (chartType: ChartType) => {
    const ndcs = new Set([...newChartRows.ids].map(String));
    const chartData = vizData.filter((nadacPrice) => ndcs.has(nadacPrice.ndc));
    if (chartData.length === 0) return;

    addItem(createChartItem({
      chartType,
      prices: chartData,
      defaultTitle: addedChartTitle(chartType, countSeries(chartData), origin.seriesKind),
      origin,
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

              setSelectedNdcDescriptions(newDescriptions);
              setVizData(data.filter((drug) => newDescriptions.includes(drug.ndcDescription)));
            }}
          >
            {
              ndcDescriptions.map(drug => {
                return (
                  <MenuItem id={drug} value={drug}>{drug}</MenuItem>
                )
              })
            }
          </Select>
        </FormControl>
      </Box>
      <Divider />
      <AddChartControl selectedCount={newChartRows.ids.size} onAdd={handleAddChart} />
    </Paper>
  )
}
