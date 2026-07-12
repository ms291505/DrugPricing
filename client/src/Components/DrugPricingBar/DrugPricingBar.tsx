import { Outlet } from "react-router";
import NavButton from "../NavButton/NavButton";
import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar"
import Toolbar from "@mui/material/Toolbar"
import Typography from "@mui/material/Typography"
import { Divider } from "@mui/material";
import Portal from "@mui/material/Portal"

export default function DrugPricingBar() {
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
      <AppBar>
        <Toolbar sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: "center",
          py: { xs: 1, md: 0 },
          position: "relative"
        }}>
          <Typography variant="h3" sx={{ display: { xs: "none", md: "block" } }}>DrugPricing</Typography>
          <Box sx={{
            display: "flex",
            position: { xs: "static", md: "absolute" },
            left: { md: "50%" },
            transform: { md: "translateX(-50%)" }
          }}>
            <NavButton to="/">HOME</NavButton>
            <Divider orientation="vertical" flexItem sx={{ borderWidth: 1 }} />
            <NavButton to="/nadac-search">NADAC</NavButton>
            <Divider orientation="vertical" flexItem sx={{ borderWidth: 1 }} />
            <NavButton to="/fda-search">FDA</NavButton>
          </Box>
        </Toolbar>
      </AppBar>
      <Toolbar sx={{ mb: 1 }} />
      <Outlet />
    </>);
}
