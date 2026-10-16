import { useWorkspaceActions, useWorkspacePanes, useWorkspaceTabs } from "../../Context/WorkspaceContext.tsx";
import { Box, Typography, Paper, Button } from "@mui/material";
import { useCallback, useEffect, useRef } from "react";
import DrawerTab from "./DrawerTab.tsx";
import NavButton from "../DrugPricingBar/NavButton.tsx";
import TabButton from "./TabButton.tsx";
import { useGlobalModalContext, type GlobalModal } from "../../Context/GlobalModalContext.tsx";
import { replacementTabId } from "../../library/workspace.ts";

export default function DrawerContent() {
  const { addTab, setPaneAssigment, setMobileDrawerIsOpen } = useWorkspaceActions();
  const { setGlobalModal } = useGlobalModalContext();

  const closeMobileDrawer = () => setMobileDrawerIsOpen(false);

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
        <DrawerTabList onAddTab={onClick} />
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

// Only the tab list reads the panes, so a tab switch doesn't re-render the rest of the drawer.
function DrawerTabList({ onAddTab }: { onAddTab: () => void }) {
  const tabs = useWorkspaceTabs();
  const { paneAssignment } = useWorkspacePanes();
  const { removeTab } = useWorkspaceActions();

  const listRef = useRef<HTMLDivElement>(null);
  // Read by `closeTab`, which must stay stable so the memoized rows don't re-render on every
  // add, close, or rename.
  const tabsRef = useRef(tabs);
  // The tab whose row takes focus once the closed tab's row is gone.
  const focusAfterClose = useRef<string | null>(null);

  useEffect(() => {
    tabsRef.current = tabs;
    const id = focusAfterClose.current;
    if (id === null) return;
    focusAfterClose.current = null;
    // Scoped to this list: the phone and desktop drawers both render every tab.
    listRef.current?.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(id)}"]`)?.focus();
  }, [tabs]);

  // The closed row unmounts with its menu and the button the menu would return focus to, which
  // would leave focus on <body>. Focus moves to the tab that takes over its pane instead.
  const closeTab = useCallback((id: string) => {
    focusAfterClose.current = replacementTabId(tabsRef.current, id);
    removeTab(id);
  }, [removeTab]);

  return (
    <Box
      ref={listRef}
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
      {tabs.map(t => (
        <DrawerTab
          key={t.id}
          tab={t}
          selected={paneAssignment.includes(t.id)}
          canClose={tabs.length > 1}
          onClose={closeTab}
        />
      ))}
      <TabButton onClick={onAddTab} />
    </Box>
  )
}
