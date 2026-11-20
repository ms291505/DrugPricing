import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { Box, Button, Tooltip } from "@mui/material";
import { useNavigate } from "react-router";
import { usePageVisible } from "../../Context/pageVisibility";
import { useWorkspaceActions, useWorkspaceReadOnly } from "../../Context/workspaceContexts";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import { useNadacSearchContext } from "../../Context/NadacSearchContext";
import { usePinnedItems } from "../../Context/pinnedItemsContexts";
import useFdaSearch from "../../hooks/useFdaSearch";
import { useNadacSearch } from "../../hooks/useNadacSearch";
import { fdaTabTitle, nadacSearchLabel } from "../../library/searchCriteria";
import { copySearchToWorkspace } from "../../library/workspaceSearch";
import type { DateWindow } from "../../library/dates";
import { isStorageReadOnly, type PersistedSearchTab } from "../../library/persist";

/**
 * The action is rendered in its standalone source's search panel, inside the source providers.
 * Nothing renders before a search has been run, or while the page is hidden.
 */
function AddSearchToWorkspace({ state, dates, title, ready, started }: {
  state: PersistedSearchTab, dates: DateWindow | undefined, title: string, ready: boolean, started: boolean,
}) {
  const { addSearchTab } = useWorkspaceActions();
  const readOnly = useWorkspaceReadOnly();
  const visible = usePageVisible();
  const navigate = useNavigate();
  const adding = useRef(false);
  // Returning to the search permits a deliberate second copy. Two clicks before leaving don't.
  useEffect(() => { if (visible) adding.current = false; }, [visible]);
  const reason = readOnly ? "Reload to use the workspace changed in another window."
    : !ready ? "Load a search successfully before adding it to Workspace." : "";
  if (!visible || !started) return null;
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1 }}>
      <Tooltip title={reason || "Copies this search and all pinned charts into a new workspace tab."}>
        <span>
          <Button type="button" color="inherit" size="small" disabled={!ready || readOnly}
            onClick={event => {
              if (adding.current || event.detail > 1 || !dates) return;
              adding.current = true;
              const id = addSearchTab(copySearchToWorkspace(state, dates), title);
              if (id) void navigate("/workspace");
              else {
                adding.current = false;
                if (!isStorageReadOnly()) toast.error("Couldn't add the search: browser storage is full or unavailable.");
              }
            }}>
            Add search to workspace
          </Button>
        </span>
      </Tooltip>
    </Box>
  );
}

export function AddFdaSearchToWorkspace() {
  const { criteria, requested, loaded, fdaResultDetailLevel } = useFdaSearchContext();
  const { isSuccess } = useFdaSearch();
  const pinnedItems = usePinnedItems();
  return (
    <AddSearchToWorkspace state={{ type: "fda", criteria, detailLevel: fdaResultDetailLevel, pinnedItems }}
      dates={requested?.dates} title={fdaTabTitle(criteria)} ready={loaded !== null && isSuccess} started={loaded !== null} />
  );
}

export function AddNadacSearchToWorkspace() {
  const { criteria, requested, loaded } = useNadacSearchContext();
  const { isSuccess } = useNadacSearch();
  const pinnedItems = usePinnedItems();
  return (
    <AddSearchToWorkspace state={{ type: "nadac", criteria, pinnedItems }}
      dates={requested?.dates} title={nadacSearchLabel(criteria).toUpperCase()} ready={loaded !== null && isSuccess} started={loaded !== null} />
  );
}
