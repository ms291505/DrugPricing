import type { ReactNode } from "react";
import { Box } from "@mui/material";
import useFdaSearch, { useRefinedFdaSearch } from "../../hooks/useFdaSearch";
import PinnedSection from "../ExplorerGrid/PinnedSection";
import { isTooManyRows } from "../../library/apiErrors";
import QueryErrorToast from "../ui/QueryErrorToast";
import FdaSearchPanel from "./FdaSearchPanel";
import FdaResults from "./FdaResults";
import type { SearchPanelLayout } from "../SearchPanel";

type Props = {
  /** Forces the search panel's layout: a workspace tab is compact. */
  panelLayout?: SearchPanelLayout,
  searchNavigation?: ReactNode,
  standaloneAction?: ReactNode,
  /** Standalone Search supplies one shared section below both sources. */
  pinnedSection?: ReactNode,
};

/** The FDA search page: the panel (search and filters), its results, then the tab's pins. */
export default function FdaSearch({ panelLayout, searchNavigation, standaloneAction, pinnedSection = <PinnedSection /> }: Props) {
  const { error } = useFdaSearch();
  // The result as the page shows it, computed once here and passed down.
  const view = useRefinedFdaSearch();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, minHeight: 0, width: "100%" }}>
      {/* A too-large search explains itself above the results (`TooManyRowsNotice`). */}
      <QueryErrorToast error={isTooManyRows(error) ? null : error} />
      <FdaSearchPanel view={view} layout={panelLayout} navigation={searchNavigation} standaloneAction={standaloneAction} />
      <FdaResults view={view} />
      {/* Pinned items render from their snapshots, so they show even when the tab's search is
          missing, still loading, or failing. */}
      {pinnedSection}
    </Box>
  );
}
