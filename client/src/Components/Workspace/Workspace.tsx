import { Box } from "@mui/material";
import { useWorkspacePanes, useWorkspaceTabs } from "../../Context/workspaceContexts";
import TabInstance from "./TabInstance";
import WorkspaceDrawer from "./WorkspaceDrawer";
import MobileDrawerFab from "./MobileDrawerFab";

/** @param onScreen - false while another route is open; the workspace stays mounted, hidden. */
export default function Workspace({ onScreen }: { onScreen: boolean }) {
  const tabs = useWorkspaceTabs();
  const { paneAssignment } = useWorkspacePanes();
  return (
    <>
      <MobileDrawerFab />
      <Box
        sx={{
          display: "flex",
          minWidth: 0,
        }}
      >
        <WorkspaceDrawer />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr)",
            flexGrow: 1,
            minWidth: 0,
          }}
        >
          {
            tabs.map(tab =>
              <TabInstance
                key={tab.id}
                visible={paneAssignment.includes(tab.id)}
                onScreen={onScreen && paneAssignment.includes(tab.id)}
                workspaceTab={tab}
              />
            )
          }
        </Box>
      </Box>
    </>
  )
}
