import { useSearchContext } from "../Context/SearchContext"
import Box from "@mui/material/Box";
// import Button from "@mui/material/Button"
import Paper from "@mui/material/Paper"
import Grid from "@mui/material/Grid";
import TableViz from "./TableViz";
import BarViz from "./BarViz";
import LineViz from "./LineViz";
// import { useState } from "react";
// import CreateChart from "./CreateChart";
// import nadacPriceToDrug from "../library/nadacPriceToDrug";
import { useNadacSearch } from "../hooks/useNadacSearch";
import VizTools from "./VizTools";


export default function NadacSearchViz() {

  const { vizData, charts } = useSearchContext();
  // const drugs = nadacPriceToDrug(vizData);
  const { isLoading } = useNadacSearch();


  // const [addOpen, setAddOpen] = useState(false);

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
            <TableViz nadacPrices={vizData} loading={isLoading} />
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Paper>
            <BarViz nadacPrices={vizData} />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Paper>
            <LineViz nadacPrices={vizData} />
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={2} justifyContent="center">
        {charts.map((chart) => (
          <Grid key={chart.id} size={{ xs: 12, sm: 6, lg: 4 }}>
            <Paper>
              {
                chart.type === "line"
                  ? <LineViz nadacPrices={chart.nadacPrices} />
                  : <BarViz nadacPrices={chart.nadacPrices} />
              }
            </Paper>
          </Grid>
        ))}
        {/* <Grid size={{ xs: 12, sm: 6, lg: 4 }}> */}
        {/*   <Paper sx={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", p: 4 }}> */}
        {/*     {addOpen */}
        {/*       ? <CreateChart drugs={drugs} onCancel={() => setAddOpen(false)} /> */}
        {/*       : <Button sx={{ width: "100%", height: "100%" }} onClick={() => setAddOpen(true)}>Add Graph</Button> */}
        {/*     } */}
        {/*   </Paper> */}
        {/* </Grid> */}
      </Grid>
    </Box>
  )
}
