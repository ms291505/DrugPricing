import { Box, } from "@mui/material";
import FdaSearchTool from "./FdaSearchTool";
import useFdaSearch from "../../hooks/useFdaSearch";
import FdaExplorer from "./FdaExplorer";
import PinnedSection from "../ExplorerGrid/PinnedSection";
import QueryErrorToast from "../ui/QueryErrorToast";
import SearchResultToast from "../ui/SearchResultToast";
import useNewSearchResult from "../../hooks/useNewSearchResult";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import { countMessage } from "../../library/searchToasts";

export default function FdaSearch() {
  const { data, isSuccess, error, dataUpdatedAt } = useFdaSearch();
  const { fdaSearchParams } = useFdaSearchContext();
  const resultKey = useNewSearchResult(fdaSearchParams, isSuccess, dataUpdatedAt);

  return (
    <Box sx={{
      display: "flex",
      flexDirection: "column",
      gap: 1,
      minWidth: 0,
      minHeight: 0,
      width: "100%",
    }}>
      <QueryErrorToast error={error} />
      <SearchResultToast resultKey={resultKey} message={data ? countMessage(data.products.length, ["product", "products"], "found") : null} />
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
