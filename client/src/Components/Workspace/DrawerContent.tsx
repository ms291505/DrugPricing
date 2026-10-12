import { useWorkspaceContext } from "../../Context/WorkspaceContext.tsx";
import { Box, Typography, Paper, Button } from "@mui/material";
import DrawerTab from "./DrawerTab.tsx";
import NavButton from "../DrugPricingBar/NavButton.tsx";
import TabButton from "./TabButton.tsx";
import { useGlobalModalContext, type GlobalModal } from "../../Context/GlobalModalContext.tsx";

export default function DrawerContent() {
  const { tabs, addTab, setPaneAssigment, setMobileDrawerIsClosing, setMobileDrawerIsOpen, mobileDrawerIsOpen } = useWorkspaceContext();
  const { setGlobalModal } = useGlobalModalContext();

  const closeMobileDrawer = () => {
    if (mobileDrawerIsOpen) {
      setMobileDrawerIsClosing(true);
      setMobileDrawerIsOpen(false);
    }
  }

  const onClick = () => {
    const newTabId = addTab("new");
    setPaneAssigment([newTabId]);
    closeMobileDrawer();
  }

  // On a phone the drawer would otherwise stay open behind the modal, and closing the modal
  // would land back in it.
  const openModal = (modal: GlobalModal) => {
    closeMobileDrawer();
    setGlobalModal(modal);
  }

  return (

    <>
      <Paper
        sx={{ p: 1 }}
      >
        <Typography variant="h5">DrugPricing</Typography>
      </Paper>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          flexGrow: 1,
          minHeight: 0,
        }}
      >
        <Box
          id="tab-container"
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
            flexGrow: 1,
            overflow: "auto",
            minHeight: 0,
            py: 1
          }}
        >
          {tabs.map(t => <DrawerTab key={t.id} tab={t} />)}
          <TabButton onClick={onClick} />
        </Box>
      </Box>
      <Paper
        component="div"
        sx={{
          display: "flex",
          flexDirection: "column"
        }}
      >
        <NavButton to="/workspace">Workspace</NavButton>
        <Button onClick={() => openModal("settings")}>SETTINGS</Button>
        <Button onClick={() => openModal("help")}>HELP</Button>
        <Button onClick={() => openModal("about")}>ABOUT</Button>
      </Paper>
    </>
  )
}
