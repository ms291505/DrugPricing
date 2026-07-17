import { Box } from "@mui/material";
import { useWorkspaceContext } from "../../Context/WorkspaceContext";
import TabInstance from "./TabInstance";
import WorkspaceDrawer from "./WorkspaceDrawer";

export default function Workspace() {
  const { tabs, paneAssignment } = useWorkspaceContext();
  return (<Box display="flex">
    <WorkspaceDrawer />
    <Box>
      {tabs.map(tab => <TabInstance key={tab.id} visible={paneAssignment.includes(tab.id)} workspaceTab={tab} />)}
    </Box>
  </Box>)
}
