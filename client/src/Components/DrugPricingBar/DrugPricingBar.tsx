import { Outlet } from "react-router";
import NavButton from "../NavButton/NavButton";
import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar"
import Toolbar from "@mui/material/Toolbar"
import Typography from "@mui/material/Typography"
import { Divider } from "@mui/material";

export default function DrugPricingBar() {
  return (
    <>
      <AppBar>
        <Toolbar sx={{ position: 'relative' }}>
          <Typography variant="h3">drugPricing</Typography>
          <Box sx={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex' }}>
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
