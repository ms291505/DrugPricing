import { use, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { Box, Button, Tooltip, Typography } from "@mui/material";
import { useNavigate } from "react-router";
import { usePageVisible } from "../../Context/pageVisibility";
import { SearchFooterSlotContext } from "../../Context/searchNavigation";
import { useWorkspaceActions, useWorkspaceReadOnly } from "../../Context/workspaceContexts";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import { useNadacSearchContext } from "../../Context/NadacSearchContext";
import { usePinnedItems } from "../../Context/pinnedItemsContexts";
import useFdaSearch from "../../hooks/useFdaSearch";
import { useNadacSearch } from "../../hooks/useNadacSearch";
import { fdaSearchLabel, nadacSearchLabel } from "../../library/searchCriteria";
import { copySearchToWorkspace } from "../../library/workspaceSearch";
import type { DateWindow } from "../../library/dates";
import { isStorageReadOnly, type PersistedSearchTab } from "../../library/persist";

/**
 * The last thing on a standalone search page, below the results and the shared pins. Those pins render
 * in App, outside the source's providers, so this portals into the slot App keeps under them while
 * keeping the source's own context. Nothing renders before a search has loaded, or while the page is hidden.
 */
function AddSearchToWorkspace({ state, dates, title, ready, started }: {
  state: PersistedSearchTab, dates: DateWindow | undefined, title: string, ready: boolean, started: boolean,
}) {
  const slot = use(SearchFooterSlotContext);
  const { addSearchTab } = useWorkspaceActions();
  const readOnly = useWorkspaceReadOnly();
  const visible = usePageVisible();
  const navigate = useNavigate();
  const adding = useRef(false);
  // Returning to the search permits a deliberate second copy. Two clicks before leaving don't.
  useEffect(() => { if (visible) adding.current = false; }, [visible]);
  const reason = readOnly ? "Reload to use the workspace changed in another window."
    : !ready ? "Load a search successfully before adding it to Workspace." : "";
  if (!slot || !visible || !started) return null;
  return createPortal(<Box sx={{ mt: 4, px: { xs: 1, md: 0 }, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5 }}>
    <Tooltip title={reason}>
      <span>
        <Button variant="outlined" color="inherit" size="small" disabled={!ready || readOnly}
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
    <Typography variant="body2" color="text.secondary">
      Copies this search and its pinned charts into a new workspace tab.
    </Typography>
  </Box>, slot);
}

export function AddFdaSearchToWorkspace() {
  const { criteria, requested, loaded, fdaResultDetailLevel } = useFdaSearchContext();
  const { isSuccess } = useFdaSearch();
  const pinnedItems = usePinnedItems();
  return <AddSearchToWorkspace state={{ type: "fda", criteria, detailLevel: fdaResultDetailLevel, pinnedItems }}
    dates={requested?.dates} title={fdaSearchLabel(criteria).toUpperCase()} ready={loaded !== null && isSuccess} started={loaded !== null} />;
}

export function AddNadacSearchToWorkspace() {
  const { criteria, requested, loaded } = useNadacSearchContext();
  const { isSuccess } = useNadacSearch();
  const pinnedItems = usePinnedItems();
  return <AddSearchToWorkspace state={{ type: "nadac", criteria, pinnedItems }}
    dates={requested?.dates} title={nadacSearchLabel(criteria).toUpperCase()} ready={loaded !== null && isSuccess} started={loaded !== null} />;
}
