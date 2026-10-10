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
import type { BarChart, LineChart } from "../../library/types";
import { MAX_AUTO_CHART_SERIES } from "../../library/constants";
import { countSeries } from "../../library/chartSeries";


export default function NadacSearchViz() {

  const { charts, setCharts } = useSearchContext();
  const { data, isLoading } = useNadacSearch();

  useEffect(() => {
    if (data && countSeries(data.prices) <= MAX_AUTO_CHART_SERIES) {
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
