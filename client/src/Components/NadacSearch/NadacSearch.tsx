import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import { useNadacSearch, useRefinedNadacSearch } from "../../hooks/useNadacSearch.ts";
import QueryErrorToast from "../ui/QueryErrorToast.tsx";
import PinnedSection from "../ExplorerGrid/PinnedSection";
import NadacSearchPanel from "./NadacSearchPanel";
import NadacResults from "./NadacResults";
import type { SearchPanelLayout } from "../SearchPanel";

type Props = {
  /** Forces the search panel's layout: a workspace tab is compact. */
  panelLayout?: SearchPanelLayout,
  searchNavigation?: ReactNode,
  standaloneAction?: ReactNode,
  /** Standalone Search supplies one shared section below both sources. */
  pinnedSection?: ReactNode,
};

/** The NADAC search page: the panel (search and filters), its results, then the tab's pins. */
export default function NadacSearch({ panelLayout, searchNavigation, standaloneAction, pinnedSection = <PinnedSection /> }: Props) {
  const { error } = useNadacSearch();
  // The result as the page shows it, computed once here and passed down.
  const view = useRefinedNadacSearch();

  return (<>
    <QueryErrorToast error={error} />
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, width: "100%" }}>
      <NadacSearchPanel view={view} layout={panelLayout} navigation={searchNavigation} standaloneAction={standaloneAction} />
      <NadacResults view={view} />
      {pinnedSection}
    </Box>
  </>);
}
