import { useWorkspaceContext } from "../../Context/WorkspaceContext.tsx";
import { Box, Button, Toolbar } from "@mui/material";
import DrawerTab from "./DrawerTab.tsx";

export default function DrawerContent() {
  const { tabs, addTab, setPaneAssigment, setMobileDrawerIsClosing, setMobileDrawerIsOpen, mobileDrawerIsOpen } = useWorkspaceContext();

  const onClick = () => {
    const newTabId = addTab("new");
    setPaneAssigment([newTabId]);
    if (mobileDrawerIsOpen) {
      setMobileDrawerIsClosing(true);
      setMobileDrawerIsOpen(false);
    }
  }

  return (

    <>
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
          {tabs.map(t => <DrawerTab key={t.id} tab={t} />)}
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
    </>
  )
}
