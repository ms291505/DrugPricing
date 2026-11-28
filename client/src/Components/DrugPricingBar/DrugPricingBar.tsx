import { useContext } from "react";
import { WorkspaceActionsContext } from "../../Context/workspaceContexts";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { NavLink } from "react-router";
import HomeIcon from "@mui/icons-material/Home";
import NavButton from "./NavButton";
import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar"
import Toolbar from "@mui/material/Toolbar"
import Typography from "@mui/material/Typography"
import { IconButton, Tooltip } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { useGlobalModalActions } from "../../Context/globalModalContexts";
import Portal from "@mui/material/Portal"

export default function DrugPricingBar() {
  const { openModal, openHelp } = useGlobalModalActions();
  const workspaceActions = useContext(WorkspaceActionsContext);
  const closeDrawer = () => workspaceActions?.setMobileDrawerIsOpen(false);
  return (
    <>
      {import.meta.env.DEV && (
        <Portal container={document.body}>
          <Box sx={{
            position: "fixed",
            top: 0,
            right: 16,
            zIndex: (theme) => theme.zIndex.appBar + 1,
            color: "error.main",
            pointerEvents: "none"
          }}>
            <Typography>DEV</Typography>
          </Box>
        </Portal>
      )}
      <AppBar
        // A paper bar in both modes: in light mode MUI's default is primary, which hides the
        // active link.
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: "background.paper",
          color: "text.primary",
        }}
      >
        {/*
          One row at every width: Home, links, then Help and Settings. From `md` the
          side columns are equal, so the links stay centered; on a phone the links take what
          the icons leave, so the icons never wrap to a second row.
        */}
        <Toolbar sx={{
          display: "grid",
          gridTemplateColumns: { xs: "auto minmax(0, 1fr) auto", md: "1fr auto 1fr" },
          alignItems: "center",
          px: { xs: 0.5, sm: 2 },
          "& .active": {
            color: "primary.main",
            fontWeight: "bold",
            borderBottom: 2,
            borderColor: "primary.main",
          },
        }}>
          <Box>
            <Tooltip title="DrugPricing home">
              <IconButton
                component={NavLink}
                to="/welcome"
                onClick={closeDrawer}
                aria-label="DrugPricing home"
                color="inherit"
                sx={{ width: 44, height: 44 }}
              >
                <HomeIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <Box sx={{ display: "flex", gridColumn: 2, justifyContent: "center", gap: { xs: 0, sm: 1 } }}>
            <NavButton to="/search" onClick={closeDrawer}>Search</NavButton>
            <NavButton to="/workspace" onClick={closeDrawer}>Workspace</NavButton>
          </Box>
          <Box sx={{ gridColumn: 3, justifySelf: "end", display: "flex" }}>
            <Tooltip title="Help">
              <IconButton sx={{ width: 44, height: 44 }} aria-label="Help" color="inherit" onClick={() => { closeDrawer(); openHelp(); }}>
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Settings">
              <IconButton sx={{ width: 44, height: 44 }} aria-label="Settings" color="inherit" onClick={() => { closeDrawer(); openModal("settings"); }}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>
      {/* Room for the fixed app bar at every width. */}
      <Toolbar sx={{ mb: 1 }} />
    </>
  );
}
