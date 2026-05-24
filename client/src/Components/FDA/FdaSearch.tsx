import { Box, Grid, Paper } from "@mui/material";
import FdaSearchTool from "./FdaSearchTool";
import FdaSearchResults from "./FdaSearchResults";
import FdaPageTools from "./FdaPageTools";

export default function FdaSearch() {

  return (
    <Box sx={{
      display: "flex",
      flexDirection: "column",
      gap: 1
    }}>
      <FdaSearchTool />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 3 }}>
          <FdaPageTools />
        </Grid>
        <Grid size={{ xs: 12, sm: 9 }}>
          <Paper sx={{ p: 1 }}>
            <FdaSearchResults />
          </Paper>
        </Grid>

      </Grid>
    </Box>
  )
}
