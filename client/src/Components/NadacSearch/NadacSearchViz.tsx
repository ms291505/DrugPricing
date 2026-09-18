import { useSearchContext } from "../../Context/SearchContext"
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper"
import Grid from "@mui/material/Grid";
import TableViz from "./TableViz";
import BarViz from "./BarViz";
import LineViz from "./LineViz";
import { useNadacSearch } from "../../hooks/useNadacSearch";
import VizTools from "./VizTools";
import { useEffect } from "react";
import type { BarChart, LineChart, NadacPrice } from "../../library/types";
import { CHART_AUTO_ADD_UPPER_THRESHOLD } from "../../library/constants";


export default function NadacSearchViz() {

  const { charts, setCharts } = useSearchContext();
  const { data, isLoading } = useNadacSearch();

  function countPackages(prices: NadacPrice[]) {
    const uniquePackages = new Set(...prices.map(p => p.ndc));
    return [...uniquePackages].length;
  }

  useEffect(() => {
    if (data && countPackages(data.prices) <= CHART_AUTO_ADD_UPPER_THRESHOLD) {
      const barChart: BarChart = {
        type: "bar",
        nadacPrices: data.prices,
        id: "defaultBar"
      }
      const lineChart: LineChart = {
        type: "line",
        nadacPrices: data.prices,
        id: "defaultLine"
      }
      setCharts([barChart, lineChart]);
    }
  }, [data, setCharts])

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        width: "100%"
      }}
    >
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 3 }}>
          <VizTools />
        </Grid>
        <Grid size={{ xs: 12, sm: 9 }}>
          <Paper sx={{ p: 1 }}>
            <TableViz nadacPrices={data?.prices ?? []} loading={isLoading} />
          </Paper>
        </Grid>
      </Grid>
      <Grid container spacing={2} justifyContent="center">
        {charts.map((chart) => (
          <Grid key={chart.id} size={{ xs: 12, sm: 6 }}>
            <Paper>
              {
                chart.type === "line"
                  ? <LineViz nadacPrices={chart.nadacPrices} />
                  : <BarViz nadacPrices={chart.nadacPrices} />
              }
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
