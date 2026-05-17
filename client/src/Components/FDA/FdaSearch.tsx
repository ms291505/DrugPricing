import { Box, Paper } from "@mui/material";
import FdaSearchTool from "./FdaSearchTool";
import FdaSearchResults from "./FdaSearchResults";

export default function FdaSearch() {

  return (
    <Box sx={{
      display: "flex",
      flexDirection: "column",
      gap: 2
    }}>
      <FdaSearchTool />
      <Paper>
        <FdaSearchResults />
      </Paper>
    </Box>
  )
}
