import { Box } from "@mui/material";
import { useWorkspacePanes, useWorkspaceTabs } from "../../Context/WorkspaceContext";
import TabInstance from "./TabInstance";
import WorkspaceDrawer from "./WorkspaceDrawer";
import MobileDrawerFab from "./MobileDrawerFab";
import WhiteSpaceToolBar from "../ui/WhiteSpaceToolBar";

export default function Workspace() {
  const tabs = useWorkspaceTabs();
  const { paneAssignment } = useWorkspacePanes();
  return (
    <>
      <WhiteSpaceToolBar />
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
              <TabInstance key={tab.id} visible={paneAssignment.includes(tab.id)} workspaceTab={tab} />
            )
          }
        </Box>
      </Box>
    </>
  )
}
