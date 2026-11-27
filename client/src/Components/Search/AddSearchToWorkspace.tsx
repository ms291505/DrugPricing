import toast from "react-hot-toast";
import { useId } from "react";
import { Box, Button, Tooltip, Typography } from "@mui/material";
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

const SAVES = "Saves this search and its pins in this browser, in a new workspace tab.";

/**
 * The action is rendered in its standalone source's search panel, inside the source providers,
 * with a caption saying that Search state lasts only for this browser tab (it is in
 * sessionStorage), so nobody who relied on Search restoring after a restart loses work without
 * warning. The caption shows once there is something to lose: a search, or pins (which Clear
 * search keeps, with their own wording, since there is then no search to add). The button shows
 * once a search has been run. Nothing renders while the page is hidden.
 */
function AddSearchToWorkspace({ state, dates, title, status }: {
  state: PersistedSearchTab, dates: DateWindow | undefined, title: string, status: "idle" | "pending" | "ready",
}) {
  const descriptionId = useId();
  const { addSearchTab } = useWorkspaceActions();
  const readOnly = useWorkspaceReadOnly();
  const visible = usePageVisible();
  const navigate = useNavigate();
  const reason = readOnly ? "Reload to use the workspace changed in another window."
    : status !== "ready" ? "Load a search successfully before adding it to Workspace." : "";
  if (!visible || (status === "idle" && state.pinnedItems.length === 0)) return null;
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", columnGap: 1, minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ flex: "1 1 16em", minWidth: 0, textAlign: "right" }}>
        {status === "idle"
          ? "These pins last until you close this browser tab."
          : "This search and its pins last until you close this browser tab unless you add the search to your workspace."}
      </Typography>
      {/* `hidden` text is still read through aria-describedby, and only there. The tooltip
          describes its wrapper only while open (`describeChild`), so nothing is read twice. */}
      {status !== "idle" && <span id={descriptionId} hidden>{reason || SAVES}</span>}
      {status !== "idle" && <Tooltip title={reason || SAVES} describeChild>
        <span>
          <Button type="button" color="inherit" size="small" disabled={status !== "ready" || readOnly}
            aria-describedby={descriptionId}
            onClick={event => {
              if (event.detail > 1 || !dates || isStorageReadOnly()) return;
              const id = addSearchTab(copySearchToWorkspace(state, dates), title);
              if (id) void navigate("/workspace");
              else toast.error("Couldn't add the search: browser storage is full or unavailable.");
            }}>
            Add search to workspace
          </Button>
        </span>
      </Tooltip>}
    </Box>
  );
}

export function AddFdaSearchToWorkspace() {
  const { criteria, requested, loaded, fdaResultDetailLevel } = useFdaSearchContext();
  const { isSuccess } = useFdaSearch();
  const pinnedItems = usePinnedItems();
  return (
    <AddSearchToWorkspace state={{ type: "fda", criteria, detailLevel: fdaResultDetailLevel, pinnedItems }}
      dates={requested?.dates} title={fdaTabTitle(criteria)} status={loaded === null ? "idle" : isSuccess ? "ready" : "pending"} />
  );
}

export function AddNadacSearchToWorkspace() {
  const { criteria, requested, loaded } = useNadacSearchContext();
  const { isSuccess } = useNadacSearch();
  const pinnedItems = usePinnedItems();
  return (
    <AddSearchToWorkspace state={{ type: "nadac", criteria, pinnedItems }}
      dates={requested?.dates} title={nadacSearchLabel(criteria).toUpperCase()} status={loaded === null ? "idle" : isSuccess ? "ready" : "pending"} />
  );
}
