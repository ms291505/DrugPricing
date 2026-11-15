import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState, type SetStateAction } from "react";
import type { LayoutMode } from "../library/types";
import { replacementTabId, workspaceReducer, type WorkspaceState } from "../library/workspace";
import { defaultTitleFor, type TabType, type WorkspaceTab } from "../library/tabType";
import { loadWorkspace, pruneStoredState, removeTabState, saveWorkspace, watchOtherWindows } from "../library/persist";
import toast from "react-hot-toast";
import { Box, Button } from "@mui/material";
import type { ExplorerItem } from "../library/explorerItems";
import {
  MobileDrawerContext,
  WorkspaceActionsContext,
  WorkspacePanesContext,
  WorkspaceTabsContext,
  type WorkspaceActions,
} from "./workspaceContexts";

// The contexts and their hooks are in `workspaceContexts.ts`. Export only the provider from here,
// so Fast Refresh can update it in place and keep the workspace state.

function createNewTab(): WorkspaceTab {
  return {
    id: crypto.randomUUID(),
    type: "new",
    title: defaultTitleFor("new"),
  };
}

// Restore the workspace saved in localStorage, if any; otherwise start with one blank tab.
// A saved workspace without tabs doesn't load (`isPersistedWorkspace`).
function initWorkspace(): WorkspaceState {
  const tab = createNewTab();
  const workspace = loadWorkspace() ?? { tabs: [tab], layoutMode: "single" as LayoutMode, paneAssignment: [tab.id] };
  // Saved state for tabs that aren't in the workspace can never be shown again.
  pruneStoredState(workspace.tabs.map(t => t.id.toString()));
  return workspace;
}

export const WorkspaceContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [workspace, dispatch] = useReducer(workspaceReducer, undefined, initWorkspace);
  const { tabs, layoutMode, paneAssignment } = workspace;
  const [mobileDrawerIsOpen, setMobileDrawerIsOpen] = useState(false);
  const mobileDrawerToggle = useRef<HTMLButtonElement>(null);

  // Read by `removeTab`, which must stay stable so reading the actions doesn't re-render. It
  // updates after a commit, while the reducer picks its replacement from the latest state, so
  // `removeTab`'s return value matches the reducer only for one tab change per commit. Every UI
  // path closes one tab per event; a batch of closes would need to pick the replacement here.
  const tabsRef = useRef(tabs);

  // Collection tabs register a receiver for items sent from other tabs. Items sent to a tab that
  // hasn't registered yet (one just created) wait in `pending` until it does.
  const receivers = useRef(new Map<string, (item: ExplorerItem) => void>());
  const pending = useRef(new Map<string, ExplorerItem[]>());

  const registerTab = useCallback(
    (id: string, receive: (item: ExplorerItem) => void) => {
      receivers.current.set(id, receive);
      pending.current.get(id)?.forEach(receive);
      pending.current.delete(id);
      return () => { receivers.current.delete(id); };
    },
    []
  );

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  useEffect(() => {
    saveWorkspace(workspace);
  }, [workspace]);

  // Another window changed the saved workspace: this one stops saving (persist.ts) and asks
  // for a reload, rather than overwriting the newer data with its own older copy.
  useEffect(() => watchOtherWindows(() => {
    toast(
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        Your workspace changed in another window. Changes here won't be saved.
        <Button size="small" variant="outlined" onClick={() => window.location.reload()}>Reload</Button>
      </Box>,
      { id: "workspace-changed-elsewhere", duration: Infinity },
    );
  }), []);

  const addTab = useCallback((tabType: TabType, title?: string) => {
    const tab: WorkspaceTab = {
      id: crypto.randomUUID(),
      type: tabType,
      title: title ?? defaultTitleFor(tabType),
    };
    dispatch({ type: "add", tab });
    return tab.id;
  }, []);

  const removeTab = useCallback((id: string) => {
    // Used only if `id` is the only tab: a workspace always has one.
    const fallback = createNewTab();
    dispatch({ type: "remove", id, fallback });
    removeTabState(id);
    return replacementTabId(tabsRef.current, id, fallback.id);
  }, []);

  const clearWorkspace = useCallback(() => {
    tabsRef.current.forEach(tab => removeTabState(tab.id));
    pending.current.clear();
    dispatch({ type: "reset", tab: createNewTab() });
  }, []);

  const renameTab = useCallback((id: string, title: string) => {
    dispatch({ type: "rename", id, title });
  }, []);

  const changeTabType = useCallback((id: string, tabType: TabType) => {
    // Saved state belongs to the old type; the tab starts fresh as the new one.
    removeTabState(id);
    dispatch({ type: "changeType", id, tabType, title: defaultTitleFor(tabType) });
  }, []);

  const setLayoutMode = useCallback((value: SetStateAction<LayoutMode>) => {
    dispatch({ type: "setLayoutMode", value });
  }, []);

  const setPaneAssigment = useCallback((value: SetStateAction<Array<string | null>>) => {
    dispatch({ type: "setPanes", value });
  }, []);

  // Sends a copy, so the same chart can go to a collection more than once. Without an id, a new
  // collection tab is created for it.
  const addToCollection = useCallback((item: ExplorerItem, id?: string) => {
    const copy = { ...item, id: crypto.randomUUID() };
    const target = id ?? addTab("collection");
    const receive = receivers.current.get(target);
    if (receive) receive(copy);
    else pending.current.set(target, [...(pending.current.get(target) ?? []), copy]);
  }, [addTab]);

  const actions = useMemo<WorkspaceActions>(() => ({
    addTab,
    removeTab,
    renameTab,
    changeTabType,
    setLayoutMode,
    setPaneAssigment,
    setMobileDrawerIsOpen,
    mobileDrawerToggle,
    addToCollection,
    clearWorkspace,
    registerTab,
  }), [addTab, removeTab, renameTab, changeTabType, setLayoutMode, setPaneAssigment, addToCollection, clearWorkspace, registerTab]);

  const panes = useMemo(() => ({ layoutMode, paneAssignment }), [layoutMode, paneAssignment]);

  const mobileDrawer = useMemo(() => ({ mobileDrawerIsOpen }), [mobileDrawerIsOpen]);

  return (
    <WorkspaceActionsContext.Provider value={actions}>
      <WorkspaceTabsContext.Provider value={tabs}>
        <WorkspacePanesContext.Provider value={panes}>
          <MobileDrawerContext.Provider value={mobileDrawer}>
            {children}
          </MobileDrawerContext.Provider>
        </WorkspacePanesContext.Provider>
      </WorkspaceTabsContext.Provider>
    </WorkspaceActionsContext.Provider>
  );
}
