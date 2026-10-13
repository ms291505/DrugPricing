import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type SetStateAction } from "react";
import { validateTabTitle, type LayoutMode, type TabType, type WorkspaceTab } from "../library/types";
import { defaultTitleFor } from "../library/tabTypeRegistry";
import { loadWorkspace, pruneStoredState, removeTabState, saveWorkspace, watchOtherWindows, type PersistedWorkspace } from "../library/persist";
import toast from "react-hot-toast";
import { Box, Button } from "@mui/material";

// The workspace is split into several contexts so a component re-renders only for the state it
// reads. Switching tabs changes only the panes, so hidden tabs, which read the tab list and the
// actions, don't re-render. Don't merge these back into one catch-all value.

type WorkspacePanes = {
  layoutMode: LayoutMode;
  paneAssignment: Array<string | null>;
};

type MobileDrawerState = {
  mobileDrawerIsOpen: boolean;
  mobileDrawerIsClosing: boolean;
};

/** Never change identity, so reading them doesn't re-render a component. */
type WorkspaceActions = {
  addTab: (type: TabType, title?: string) => string;
  removeTab: (id: string) => void;
  renameTab: (id: string, title: string) => void;
  changeTabType: (id: string, type: TabType) => void;
  setLayoutMode: (value: SetStateAction<LayoutMode>) => void;
  setPaneAssigment: (value: SetStateAction<Array<string | null>>) => void;
  setMobileDrawerIsOpen: (value: SetStateAction<boolean>) => void;
  setMobileDrawerIsClosing: (value: SetStateAction<boolean>) => void;
};

const WorkspaceTabsContext = createContext<Array<WorkspaceTab>>([]);

const WorkspacePanesContext = createContext<WorkspacePanes>({
  layoutMode: "single",
  paneAssignment: [null],
});

const MobileDrawerContext = createContext<MobileDrawerState>({
  mobileDrawerIsOpen: false,
  mobileDrawerIsClosing: false,
});

const WorkspaceActionsContext = createContext<WorkspaceActions>({
  addTab: () => "",
  removeTab: () => { },
  renameTab: () => { },
  changeTabType: () => { },
  setLayoutMode: () => { },
  setPaneAssigment: () => { },
  setMobileDrawerIsOpen: () => { },
  setMobileDrawerIsClosing: () => { },
});

type WorkspaceAction =
  | { type: "add", tab: WorkspaceTab }
  | { type: "remove", id: string }
  | { type: "rename", id: string, title: string }
  | { type: "changeType", id: string, tabType: TabType }
  | { type: "setLayoutMode", value: SetStateAction<LayoutMode> }
  | { type: "setPanes", value: SetStateAction<Array<string | null>> };

const resolve = <T,>(value: SetStateAction<T>, prev: T) =>
  typeof value === "function" ? (value as (prev: T) => T)(prev) : value;

// Tabs and panes share one reducer because closing a tab picks its replacement pane from the
// tab list. Unchanged tabs keep their identity, so their panes skip rendering.
function workspaceReducer(state: PersistedWorkspace, action: WorkspaceAction): PersistedWorkspace {
  switch (action.type) {
    case "add":
      return { ...state, tabs: [...state.tabs, action.tab] };
    case "remove": {
      const { tabs } = state;
      const idx = tabs.findIndex(t => t.id === action.id);
      if (idx < 0) return state;
      const replacementIdx = idx < (tabs.length - 1) ? idx + 1 : idx - 1;
      const replacement = replacementIdx < 0 ? null : tabs[replacementIdx].id;
      return {
        ...state,
        tabs: tabs.filter(t => t.id !== action.id),
        paneAssignment: state.paneAssignment.map(pane => pane === action.id ? replacement : pane),
      };
    }
    case "rename": {
      const tab = state.tabs.find(t => t.id === action.id);
      if (!tab || !validateTabTitle(action.title, tab.title)) return state;
      return {
        ...state,
        tabs: state.tabs.map(t => (t.id === action.id ? { ...t, title: action.title.trim() } : t)),
      };
    }
    case "changeType":
      return {
        ...state,
        tabs: state.tabs.map(t => (
          t.id === action.id
            ? { id: t.id, title: defaultTitleFor(action.tabType), type: action.tabType }
            : t)),
      };
    case "setLayoutMode":
      return { ...state, layoutMode: resolve(action.value, state.layoutMode) };
    case "setPanes":
      return { ...state, paneAssignment: resolve(action.value, state.paneAssignment) };
  }
}

function createNewTab(): WorkspaceTab {
  return {
    id: crypto.randomUUID(),
    type: "new",
    title: defaultTitleFor("new"),
  };
}

// Restore the workspace saved in localStorage, if any; otherwise start with one blank tab.
function initWorkspace(): PersistedWorkspace {
  const tab = createNewTab();
  const workspace = loadWorkspace() ?? { tabs: [tab], layoutMode: "single" as LayoutMode, paneAssignment: [tab.id] };
  // Saved state for tabs that aren't in the workspace can never be shown again.
  pruneStoredState(workspace.tabs.map(t => t.id));
  return workspace;
}

export const WorkspaceContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [workspace, dispatch] = useReducer(workspaceReducer, undefined, initWorkspace);
  const { tabs, layoutMode, paneAssignment } = workspace;
  const [mobileDrawerIsOpen, setMobileDrawerIsOpen] = useState(false);
  const [mobileDrawerIsClosing, setMobileDrawerIsClosing] = useState(false);

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
    dispatch({ type: "remove", id });
    removeTabState(id);
  }, []);

  const renameTab = useCallback((id: string, title: string) => {
    dispatch({ type: "rename", id, title });
  }, []);

  const changeTabType = useCallback((id: string, tabType: TabType) => {
    // Saved state belongs to the old type; the tab starts fresh as the new one.
    removeTabState(id);
    dispatch({ type: "changeType", id, tabType });
  }, []);

  const setLayoutMode = useCallback((value: SetStateAction<LayoutMode>) => {
    dispatch({ type: "setLayoutMode", value });
  }, []);

  const setPaneAssigment = useCallback((value: SetStateAction<Array<string | null>>) => {
    dispatch({ type: "setPanes", value });
  }, []);

  const actions = useMemo<WorkspaceActions>(() => ({
    addTab,
    removeTab,
    renameTab,
    changeTabType,
    setLayoutMode,
    setPaneAssigment,
    setMobileDrawerIsOpen,
    setMobileDrawerIsClosing,
  }), [addTab, removeTab, renameTab, changeTabType, setLayoutMode, setPaneAssigment]);

  const panes = useMemo(() => ({ layoutMode, paneAssignment }), [layoutMode, paneAssignment]);

  const mobileDrawer = useMemo(
    () => ({ mobileDrawerIsOpen, mobileDrawerIsClosing }),
    [mobileDrawerIsOpen, mobileDrawerIsClosing]);

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

/** Every tab in the workspace. Changes only when a tab is added, removed, renamed or retyped. */
export const useWorkspaceTabs = () => useContext(WorkspaceTabsContext);

export const useWorkspaceTab = (id: string) => useWorkspaceTabs().find(t => t.id === id);

/** Which tabs are shown. Changes on every tab switch, so hidden tabs must not read it. */
export const useWorkspacePanes = () => useContext(WorkspacePanesContext);

export const useMobileDrawer = () => useContext(MobileDrawerContext);

export const useWorkspaceActions = () => useContext(WorkspaceActionsContext);
