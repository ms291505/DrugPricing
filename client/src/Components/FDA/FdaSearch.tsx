import { Box, } from "@mui/material";
import FdaSearchTool from "./FdaSearchTool";
import useFdaSearch from "../../hooks/useFdaSearch";
import FdaExplorer from "./FdaExplorer";

export default function FdaSearch() {
  const { isSuccess } = useFdaSearch();

  return (
    <Box sx={{
      display: "flex",
      flexDirection: "column",
      gap: 1,
      minWidth: 0,
      minHeight: 0,
      width: "100%",
    }}>
      <FdaSearchTool />
      <FdaExplorer visible={isSuccess} />
    </Box>
  )
}
