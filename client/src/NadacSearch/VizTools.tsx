
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useSearchContext } from "../Context/SearchContext";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import Paper from "@mui/material/Paper"
import Divider from "@mui/material/Divider"
import Button from "@mui/material/Button"
import { DRUG_FILTER_SELECT_LABEL } from "../library/constants";
import type { LineChart } from "../types";

export default function VizTools() {
  const { data, setVizData, ndcDescriptions, selectedNdcDescriptions, setSelectedNdcDescriptions, newChartRows, vizData, setCharts } = useSearchContext();
  const addChartButtonText = newChartRows.ids.size > 0 ? "Add Chart" : "Select Drugs to Add Chart";
  const addChartDisabled = newChartRows.ids.size > 0 ? false : true;
  const handleAddChart = () => {
    const ndcs = [...newChartRows.ids];
    const chartData = vizData.filter((nadacPrice) => (ndcs.includes(nadacPrice.ndc)));
    const id = crypto.randomUUID();
    const newChart: LineChart = {
      type: "line",
      nadacPrices: chartData,
      id: id
    };

    setCharts((prev) => [...prev, newChart]);
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
          <InputLabel id="drug-filter-select-label">{DRUG_FILTER_SELECT_LABEL}</InputLabel>
          <Select
            label={DRUG_FILTER_SELECT_LABEL}
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
      <Button disabled={addChartDisabled} variant="outlined" onClick={handleAddChart}>{addChartButtonText}</Button>
    </Paper>
  )
}
