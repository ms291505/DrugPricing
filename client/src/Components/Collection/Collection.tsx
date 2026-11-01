import { Box } from "@mui/material";
import PinnedSection from "../ExplorerGrid/PinnedSection";
import { useWorkspaceActions } from "../../Context/workspaceContexts";
import { useTabInstanceContext } from "../../Context/TabInstanceContext";
import { useEffect } from "react";
import { useExplorerItems } from "../../Context/ExplorerItemsContext";

export default function Collection() {
  const { registerTab } = useWorkspaceActions();
  const { id: tabId } = useTabInstanceContext();
  const { addItem } = useExplorerItems();
  useEffect(
    () => registerTab(tabId, item => addItem(item)),
    [tabId, registerTab, addItem]
  );
  return (
    <Box sx={{ display: "flex", flexDirection: "column", width: "100%" }}>
      <Box>
        This is a collection.
      </Box>
      <PinnedSection />
    </Box>
  )
}
