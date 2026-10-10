import { useState } from "react";
import { Box, Button, Tooltip } from "@mui/material";
import BarChartIcon from "@mui/icons-material/BarChart";
import SsidChartIcon from "@mui/icons-material/SsidChart";
import type { ChartType } from "../../library/explorerItems";

type Props = {
  selectedCount: number,
  onAdd: (chartType: ChartType) => void,
}

/** Add Chart button shared by both search pages: pick rows, then a line or bar chart. */
export default function AddChartControl({ selectedCount, onAdd }: Props) {
  const [choosingType, setChoosingType] = useState(false);

  if (selectedCount === 0) {
    return <Button disabled variant="outlined">Select Drugs to Add Chart</Button>;
  }

  if (!choosingType) {
    return <Button variant="outlined" onClick={() => setChoosingType(true)}>Add Chart</Button>;
  }

  const handleAdd = (chartType: ChartType) => {
    onAdd(chartType);
    setChoosingType(false);
  };

  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      <Tooltip title="Add bar chart">
        <Button sx={{ width: "100%" }} variant="contained" aria-label="Add bar chart" onClick={() => handleAdd("bar")}>
          <BarChartIcon />
        </Button>
      </Tooltip>
      <Tooltip title="Add line chart">
        <Button sx={{ width: "100%" }} variant="contained" aria-label="Add line chart" onClick={() => handleAdd("line")}>
          <SsidChartIcon />
        </Button>
      </Tooltip>
    </Box>
  );
}
