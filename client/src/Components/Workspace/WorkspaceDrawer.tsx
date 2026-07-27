import { Drawer, } from "@mui/material";
import { CONSTANT } from "../../library/constants.ts";
import DrawerContent from "./DrawerContent.tsx";
import { useWorkspaceContext } from "../../Context/WorkspaceContext.tsx";

export default function WorkspaceDrawer() {
  const { setMobileDrawerIsClosing, mobileDrawerIsOpen, setMobileDrawerIsOpen } = useWorkspaceContext();

  const { drawerWidth } = CONSTANT;


  const handleDrawerClose = () => {
    setMobileDrawerIsClosing(true);
    setMobileDrawerIsOpen(false);
  };

  const handleDrawerTransitionEnd = () => {
    setMobileDrawerIsClosing(false);
  };


  return (
    <>
      <Drawer
        variant="temporary"
        open={mobileDrawerIsOpen}
        onTransitionEnd={handleDrawerTransitionEnd}
        onClose={handleDrawerClose}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
        slotProps={{
          root: {
            keepMounted: true, // Better open performance on mobile.
          },
        }}
      >
        <DrawerContent />
      </Drawer>

      {/* Desktop Version */}
      <Drawer variant="permanent" open={true}
        sx={{
          display: { xs: "none", md: "block" },
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <DrawerContent />
      </Drawer>
    </>
  )
}
