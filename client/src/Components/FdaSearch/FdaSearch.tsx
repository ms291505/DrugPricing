import { Box } from "@mui/material";
import useFdaSearch, { useRefinedFdaSearch } from "../../hooks/useFdaSearch";
import PinnedSection from "../ExplorerGrid/PinnedSection";
import QueryErrorToast from "../ui/QueryErrorToast";
import FdaSearchPanel from "./FdaSearchPanel";
import FdaResults from "./FdaResults";

/** The FDA search page: the panel (search and filters), its results, then the tab's pins. */
export default function FdaSearch() {
  const { error } = useFdaSearch();
  // The result as the page shows it, computed once here and passed down.
  const view = useRefinedFdaSearch();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, minHeight: 0, width: "100%" }}>
      <QueryErrorToast error={error} />
      <FdaSearchPanel view={view} />
      <FdaResults view={view} />
      {/* Pinned items render from their snapshots, so they show even when the tab's search is
          missing, still loading, or failing. */}
      <PinnedSection />
    </Box>
  );
}
