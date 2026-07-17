import { Box, Button, Drawer, Toolbar } from "@mui/material";
import { useWorkspaceContext } from "../../Context/WorkspaceContext.tsx";
import { CONSTANT } from "../../library/constants.ts";
import DrawerTab from "./DrawerTab.tsx";

export default function WorkspaceDrawer() {
  const { tabs, addTab } = useWorkspaceContext()

  const onClick = () => addTab("fda");

  const { drawerWidth } = CONSTANT;

  return (
    <Drawer variant="permanent" open={true}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
      }}
    >
      <Toolbar />
      <Box
        sx={{
          overflow: "auto",
          p: 1,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1
          }}
        >
          {tabs.map(t => <DrawerTab tab={t}>{t.title}</DrawerTab>)}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center"
            }}
          >
            <Button
              onClick={onClick}
            >
              Add Tab
            </Button>
          </Box>
        </Box>
      </Box>
    </Drawer>
  )
}
