import { Drawer, } from "@mui/material";
import { CONSTANT } from "../../library/constants.ts";
import DrawerContent from "./DrawerContent.tsx";
import { useMobileDrawer, useWorkspaceActions } from "../../Context/WorkspaceContext.tsx";

export default function WorkspaceDrawer() {
  const { mobileDrawerIsOpen } = useMobileDrawer();
  const { setMobileDrawerIsOpen } = useWorkspaceActions();

  const { drawerWidth } = CONSTANT;

  const handleDrawerClose = () => {
    setMobileDrawerIsOpen(false);
  };

  return (
    <>
      <Drawer
        variant="temporary"
        open={mobileDrawerIsOpen}
        onClose={handleDrawerClose}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          // No hover on a phone, so the tabs' menu buttons always show.
          '& .tab-menu-icon': { opacity: 1 },
        }}
        slotProps={{
          root: {
            keepMounted: true, // Better open performance on mobile.
          },
          paper: { elevation: 0 }
        }}
      >
        <DrawerContent />
      </Drawer>

      {/* Desktop Version */}
      <Drawer
        variant="permanent"
        open={true}
        sx={{
          display: { xs: "none", md: "block" },
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
        slotProps={{
          paper: { elevation: 0 }
        }}
      >
        <DrawerContent />
      </Drawer>
    </>
  )
}
