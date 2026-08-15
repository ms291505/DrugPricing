
import { CONSTANT } from "../../library/constants.ts";
import { Fab, } from "@mui/material";
import { alpha } from "@mui/material/styles";
import Menu from "@mui/icons-material/Menu";
import { useWorkspaceContext } from "../../Context/WorkspaceContext.tsx";
import useScrolled from "../../hooks/useScrolled.ts";

export default function MobileDrawerFab() {
  const { mobileDrawerIsOpen, setMobileDrawerIsClosing, setMobileDrawerIsOpen } = useWorkspaceContext();

  const handleClick = () => {
    if (mobileDrawerIsOpen) {
      setMobileDrawerIsClosing(true)
    }
    setMobileDrawerIsOpen(!mobileDrawerIsOpen);
  };

  const { opacity, drawerWidth } = CONSTANT;

  const scrolled = useScrolled();

  return (

    <Fab
      color="primary"
      aria-label="open drawer"
      size="small"
      onClick={handleClick}
      sx={{
        position: "fixed",
        top: 16,
        left: 16,
        transform: mobileDrawerIsOpen ? `translateX(${drawerWidth}px)` : "translateX(0)",
        transition: (theme) =>
          [
            theme.transitions.create("transform", {
              easing: mobileDrawerIsOpen ? theme.transitions.easing.easeOut : theme.transitions.easing.sharp,
              duration: mobileDrawerIsOpen ? theme.transitions.duration.enteringScreen : theme.transitions.duration.leavingScreen,
            }),
            theme.transitions.create("background-color", {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.shortest,
            }),
          ].join(", "),
        zIndex: (theme) => theme.zIndex.drawer + 1,
        display: { xs: "flex", md: "none" },
        bgcolor: (theme) => alpha(theme.palette.primary.main, scrolled ? opacity : 1),
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <Menu fontSize="small" />
    </Fab>
  )
}
