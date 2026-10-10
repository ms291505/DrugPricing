import { Box, } from "@mui/material";
import FdaSearchTool from "./FdaSearchTool";
import useFdaSearch from "../../hooks/useFdaSearch";
import FdaExplorer from "./FdaExplorer";
import PinnedSection from "../ExplorerGrid/PinnedSection";

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
      {/* Outside the isSuccess gate: pinned items render from their snapshots, so they show
          even when the tab's search is missing, still loading, or failing. */}
      <Box sx={{ mt: 1 }}>
        <PinnedSection />
      </Box>
    </Box>
  )
}
