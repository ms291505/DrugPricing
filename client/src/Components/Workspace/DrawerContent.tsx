import { useWorkspaceActions, useWorkspacePanes, useWorkspaceTabs } from "../../Context/workspaceContexts.ts";
import { Box, } from "@mui/material";
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import DrawerTab from "./DrawerTab.tsx";
import TabButton from "./TabButton.tsx";
import WhiteSpaceToolBar from "../ui/WhiteSpaceToolBar.tsx";
import ConfirmButton from "../ui/ConfirmButton.tsx";
import { WorkspaceMenuNote } from "../StorageNotes";

/** `inMobileDrawer`: rendered in the phone drawer, which closes when a modal opens. */
export default function DrawerContent({ inMobileDrawer = false }: { inMobileDrawer?: boolean }) {
  const { addTab, clearWorkspace, setPaneAssigment, setMobileDrawerIsOpen, } = useWorkspaceActions();

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
        {/* Built here, not in the list, so a tab switch (which re-renders the list) doesn't
            re-render it. */}
        <DrawerTabList onAddTab={onClick} onClearWorkspace={onClearWorkspace}
          storageNote={<WorkspaceMenuNote inMobileDrawer={inMobileDrawer} />} />
      </Box>
    </>
  )
}

// Only the tab list reads the panes, so a tab switch doesn't re-render the rest of the drawer.
function DrawerTabList({ onAddTab, onClearWorkspace, storageNote }: {
  onAddTab: () => void, onClearWorkspace: () => void, storageNote: ReactNode,
}) {
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
  // would leave keyboard focus on <body>. From the keyboard, focus moves to the tab that takes
  // over its pane instead (a new blank tab when the closed one was the only tab), in the effect
  // above, after the menu's focus trap is gone. After a tap nothing moves. Stable, so the
  // memoized rows don't re-render on every add, close, or rename.
  const closeTab = useCallback((id: string, fromKeyboard: boolean) => {
    const replacement = removeTab(id);
    if (fromKeyboard) focusAfterClose.current = replacement;
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
      {/* Directly above Clear workspace, so the way to delete what it describes is right there. */}
      {storageNote}
      <ConfirmButton
        color="error"
        label="Clear workspace"
        confirmLabel="Click again to clear"
        onConfirm={onClearWorkspace}
      />
    </Box>
  )
}
