import { Box } from "@mui/material";
import { useWorkspaceContext } from "../../Context/WorkspaceContext";
import TabInstance from "./TabInstance";
import WorkspaceDrawer from "./WorkspaceDrawer";
import MobileDrawerFab from "./MobileDrawerFab";
import { TabInstanceContextProvider, } from "../../Context/TabInstanceContext";

export default function Workspace() {
  const { tabs, paneAssignment } = useWorkspaceContext();
  return (<>
    <MobileDrawerFab />
    <Box
      sx={{
        display: "flex",
        minWidth: 0,
      }}
    >
      <WorkspaceDrawer />
      {
        tabs.map(tab =>
          <TabInstanceContextProvider key={tab.id}>
            <TabInstance key={tab.id} visible={paneAssignment.includes(tab.id)} workspaceTab={tab} />
          </TabInstanceContextProvider>
        )
      }
    </Box>
  </>
  )
}
