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
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, display: { xs: "none", md: "block" } }}
      >
        <Toolbar sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: "center",
          py: { xs: 1, md: 0 },
          position: "relative",
        }}>
          <Typography variant="h3" sx={{ display: { xs: "none", md: "block" } }}>DrugPricing</Typography>
          <Box sx={{
            display: "flex",
            position: { xs: "static", md: "absolute" },
            left: { md: "50%" },
            transform: { md: "translateX(-50%)" }
          }}>
            <NavButton to="/about">ABOUT</NavButton>
            <Divider orientation="vertical" flexItem sx={{ borderWidth: 1 }} />
            <NavButton to="/nadac-search">NADAC</NavButton>
            <Divider orientation="vertical" flexItem sx={{ borderWidth: 1 }} />
            <NavButton to="/fda-search">FDA</NavButton>
            <Divider orientation="vertical" flexItem sx={{ borderWidth: 1 }} />
            <NavButton to="/workspace">Workspace</NavButton>
          </Box>
          <Tooltip title="Settings">
            <IconButton aria-label="Settings" onClick={() => setGlobalModal("settings")} sx={{ ml: "auto" }}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      {/* Room for the app bar, which phones don't show. */}
      <Toolbar sx={{ mb: 1, display: { xs: "none", md: "flex" } }} />
      <Outlet />
    </>);
}
