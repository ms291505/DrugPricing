import { useWorkspaceActions, useWorkspacePanes, useWorkspaceTabs } from "../../Context/workspaceContexts.ts";
import { Box, Button } from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import SettingsIcon from "@mui/icons-material/Settings";
import { useCallback, useEffect, useRef } from "react";
import DrawerTab from "./DrawerTab.tsx";
import TabButton from "./TabButton.tsx";
import { useGlobalModalActions, type GlobalModal } from "../../Context/globalModalContexts";
import WhiteSpaceToolBar from "../ui/WhiteSpaceToolBar.tsx";
import ConfirmButton from "../ui/ConfirmButton.tsx";

/** `inMobileDrawer`: rendered in the phone drawer, which closes when a modal opens. */
export default function DrawerContent({ inMobileDrawer = false }: { inMobileDrawer?: boolean }) {
  const { addTab, clearWorkspace, setPaneAssigment, setMobileDrawerIsOpen, mobileDrawerToggle } = useWorkspaceActions();
  const { openModal } = useGlobalModalActions();

  const closeMobileDrawer = () => setMobileDrawerIsOpen(false);

  const onClick = () => {
    const newTabId = addTab("new");
    setPaneAssigment([newTabId]);
    closeMobileDrawer();
  }

  const onClearWorkspace = () => {
    clearWorkspace();
    closeMobileDrawer();
  }

  // On a phone the drawer would otherwise stay open behind the modal, and closing the modal
  // would land back in it. Its buttons go with it, so focus returns to the drawer's toggle.
  const openFromDrawer = (modal: GlobalModal) => {
    closeMobileDrawer();
    openModal(modal, inMobileDrawer ? { returnFocus: mobileDrawerToggle.current } : undefined);
  }

  return (

    <>
      <WhiteSpaceToolBar />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          flexGrow: 1,
          minHeight: 0,
        }}
      >
        <DrawerTabList onAddTab={onClick} onClearWorkspace={onClearWorkspace} />
      </Box>
      {/* Outlined, like Add Tab above, so they read as buttons; a rule sets them off from the tabs. */}
      <Box sx={{ display: "flex", gap: 1, py: 1, borderTop: 1, borderColor: "divider" }}>
        <Button variant="outlined" startIcon={<SettingsIcon />} onClick={() => openFromDrawer("settings")} sx={{ flex: 1 }}>
          Settings
        </Button>
        <Button variant="outlined" startIcon={<HelpOutlineIcon />} onClick={() => openFromDrawer("help")} sx={{ flex: 1 }}>
          Help
        </Button>
      </Box>
    </>
  )
}

// Only the tab list reads the panes, so a tab switch doesn't re-render the rest of the drawer.
function DrawerTabList({ onAddTab, onClearWorkspace }: { onAddTab: () => void, onClearWorkspace: () => void }) {
  const tabs = useWorkspaceTabs();
  const { paneAssignment } = useWorkspacePanes();
  const { removeTab } = useWorkspaceActions();

  const listRef = useRef<HTMLDivElement>(null);
  // The tab whose row takes focus once the closed tab's row is gone.
  const focusAfterClose = useRef<string | null>(null);

  useEffect(() => {
    const id = focusAfterClose.current;
    if (id === null) return;
    focusAfterClose.current = null;
    // Scoped to this list: the phone and desktop drawers both render every tab.
    listRef.current?.querySelector<HTMLElement>(`[data-tab-id="${CSS.escape(id)}"]`)?.focus();
  }, [tabs]);

  // The closed row unmounts with its menu and the button the menu would return focus to, which
  // would leave focus on <body>. Focus moves to the tab that takes over its pane instead, which
  // is a new blank tab when the closed one was the only tab. Stable, so the memoized rows don't
  // re-render on every add, close, or rename.
  const closeTab = useCallback((id: string) => {
    focusAfterClose.current = removeTab(id);
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
          onClose={closeTab}
        />
      ))}
      <TabButton onClick={onAddTab} />
      <ConfirmButton
        color="error"
        label="Clear workspace"
        confirmLabel="Click again to clear"
        onConfirm={onClearWorkspace}
      />
    </Box>
  )
}
