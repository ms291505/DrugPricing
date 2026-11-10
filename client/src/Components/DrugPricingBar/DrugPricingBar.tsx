import { Outlet } from "react-router";
import NavButton from "./NavButton";
import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar"
import Toolbar from "@mui/material/Toolbar"
import Typography from "@mui/material/Typography"
import { Divider, IconButton, Tooltip } from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { useGlobalModalContext } from "../../Context/GlobalModalContext";
import Portal from "@mui/material/Portal"

export default function DrugPricingBar() {
  const { setGlobalModal } = useGlobalModalContext();
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
        // A paper bar in both modes: in light mode MUI's default is primary, which hides the active link.
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          display: { xs: "block", md: "block" },
          bgcolor: "background.paper",
          color: "text.primary",
        }}
      >
        {/*
          One row at every width: title, links, gear. The side columns are equal, so the links
          stay centered while there is room; on a phone the title is hidden and the left column
          gives up its space first, so the gear never wraps to a second row.
        */}
        <Toolbar sx={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          px: { xs: 0.5, sm: 2 },
        }}>
          <Typography variant="h3" sx={{ display: { xs: "none", md: "block" } }}>DrugPricing</Typography>
          <Box sx={{ display: "flex", gridColumn: 2, gap: { xs: 0, sm: 1 } }}>
            <NavButton to="/nadac-search">NADAC</NavButton>
            <Divider orientation="vertical" flexItem sx={{ borderWidth: 1 }} />
            <NavButton to="/fda-search">FDA</NavButton>
            <Divider orientation="vertical" flexItem sx={{ borderWidth: 1 }} />
            <NavButton to="/workspace">Workspace</NavButton>
            <Divider orientation="vertical" flexItem sx={{ borderWidth: 1 }} />
            <NavButton to="/about">ABOUT</NavButton>
          </Box>
          <Tooltip title="Settings">
            <IconButton
              aria-label="Settings"
              color="inherit"
              onClick={() => setGlobalModal("settings")}
              sx={{ gridColumn: 3, justifySelf: "end" }}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      {/* Room for the app bar, which phones don't show. */}
      <Toolbar sx={{ mb: 1, display: { xs: "flex", md: "flex" } }} />
      <Outlet />
    </>);
}
