import { tabTypeRegistry, type WorkspaceTab } from "../../library/types.ts";
import { Box } from "@mui/material";
type Props = {
  workspaceTab: WorkspaceTab,
  visible: boolean,
}

export default function TabInstance({ workspaceTab, visible }: Props) {
  const { Provider, Content } = tabTypeRegistry[workspaceTab.type];
  return (
    <Box
      sx={{
        display: visible ? "flex" : "none",
        flexGrow: 1,
        minWidth: 0,
        width: "100%",
      }}>
      <Provider>
        <Content />
      </Provider>
    </Box>
  )
}
