import type { Drug, LineChart } from "../types.ts";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import { CONSTANT } from "../library/constants";
import { useState } from "react";
import { useSearchContext } from "../Context/SearchContext.tsx";

type Props = {
  drugs: Drug[],
  onCancel: () => void
};

export default function CreateChart({ drugs, onCancel }: Props) {
  const { setCharts, vizData } = useSearchContext();
  const [selections, setSelections] = useState<string[]>([]);

  const drugItemText = (drug: Drug) => (drug.ndc + " - " + drug.ndcDescription);

  const handleAddChart = () => {
    const chartData = vizData.filter((nadacPrice) => (selections.includes(nadacPrice.ndc)));
    const id = crypto.randomUUID();
    const newChart: LineChart = {
      type: "line",
      nadacPrices: chartData,
      id: id
    };

    setCharts((prev) => [...prev, newChart]);
    onCancel();
  }


  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        m: 2,
        border: 1,
        width: "100%"
      }}>
      <FormControl fullWidth>
        <InputLabel id="chart-drug-select-label">{CONSTANT.label.drugFilterSelect}</InputLabel>
        <Select
          multiple
          label="Drugs"
          id="chart-drug-select"
          name="chart-drug-select"
          value={selections}
          onChange={(e) => {
            const newSelections = typeof e.target.value === "string"
              ? e.target.value.split(",")
              : e.target.value;
            setSelections(newSelections);
          }}
        >
          {drugs.map((drug) => (
            <MenuItem
              key={drug.ndc}
              value={drug.ndc}
            >
              {drugItemText(drug)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Box sx={{ display: "flex", width: "100%", gap: 2 }} >
        <Button sx={{ flex: 1 }} onClick={onCancel}>
          Cancel
        </Button>
        <Button sx={{ flex: 1 }} onClick={handleAddChart}>
          Add chart
        </Button>
      </Box>
    </Box>
  )
}
