import React, { createContext, useContext, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { validateTabTitle, type LayoutMode, type TabType, type WorkspaceTab } from "../library/types";
import { defaultTitleFor } from "../library/tabTypeRegistry";
import { loadWorkspace, pruneTabStates, removeTabState, saveWorkspace } from "../library/persist";

type WorkspaceContextType = {
  tabs: Array<WorkspaceTab>;
  addTab: (type: TabType, title?: string) => string;
  removeTab: (id: string) => void;
  renameTab: (id: string, title: string) => void;
  changeTabType: (id: string, type: TabType) => void;
  layoutMode: LayoutMode;
  setLayoutMode: Dispatch<SetStateAction<LayoutMode>>;
  paneAssignment: Array<string | null>;
  setPaneAssigment: Dispatch<SetStateAction<Array<string | null>>>;
  mobileDrawerIsOpen: boolean
  setMobileDrawerIsOpen: Dispatch<SetStateAction<boolean>>;
  mobileDrawerIsClosing: boolean
  setMobileDrawerIsClosing: Dispatch<SetStateAction<boolean>>;
  findTab: (id: string) => WorkspaceTab | undefined;
};

export const WorkspaceContext = createContext<WorkspaceContextType>({
  tabs: [],
  addTab: () => "",
  removeTab: () => { },
  renameTab: () => { },
  changeTabType: () => { },
  layoutMode: "single",
  setLayoutMode: () => { },
  paneAssignment: [null],
  setPaneAssigment: () => { },
  mobileDrawerIsOpen: false,
  setMobileDrawerIsOpen: () => { },
  mobileDrawerIsClosing: false,
  setMobileDrawerIsClosing: () => { },
  findTab: () => undefined,
});

export const WorkspaceContextProvider = ({ children }: { children: React.ReactNode }) => {
  function createNewTab() {
    const newId = crypto.randomUUID();
    const newTab: WorkspaceTab = {
      id: newId,
      type: "new",
      title: defaultTitleFor("new"),
    }

    return newTab;
  }
  // Restore the workspace saved in localStorage, if any; otherwise start with one blank tab.
  const [initialWorkspace] = useState(() => {
    const tab = createNewTab();
    const workspace = loadWorkspace() ?? { tabs: [tab], layoutMode: "single" as LayoutMode, paneAssignment: [tab.id] };
    // Saved state for tabs that aren't in the workspace can never be shown again.
    pruneTabStates(workspace.tabs.map(t => t.id));
    return workspace;
  });
  const [tabs, setTabs] = useState<Array<WorkspaceTab>>(initialWorkspace.tabs);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(initialWorkspace.layoutMode);
  const [mobileDrawerIsOpen, setMobileDrawerIsOpen] = useState(false);
  const [mobileDrawerIsClosing, setMobileDrawerIsClosing] = useState(false);
  const [paneAssignment, setPaneAssigment] = useState<Array<string | null>>(initialWorkspace.paneAssignment);

  useEffect(() => {
    saveWorkspace({ tabs, layoutMode, paneAssignment });
  }, [tabs, layoutMode, paneAssignment]);

  const addTab = (tabType: TabType, title?: string) => {
    const id = crypto.randomUUID();
    const newTab: WorkspaceTab =
    {
      id: id,
      type: tabType,
      title: title ?? defaultTitleFor(tabType),
    }
    setTabs(prev => [...prev, newTab]);
    return id;
  }

  const findTab = (id: string) => {
    const tab = tabs.find(t => t.id === id);
    return tab;
  }

  const removeTab = (id: string) => {
    const getReplacementPane = () => {
      const idx = tabs.findIndex(tab => tab.id === id);
      const replacementIdx = idx < (tabs.length - 1) ? idx + 1 : idx - 1;
      return replacementIdx < 0 ? null : tabs[replacementIdx].id;
    }

    setPaneAssigment(prev => (
      prev.map(
        pane => (
          pane === id
            ? getReplacementPane()
            : pane
        )
      )));

    setTabs(prev => prev.filter(t => t.id !== id));
    removeTabState(id);
  };

  const renameTab = (id: string, newTitle: string) => {
    const tab = findTab(id);

    if (!tab) throw new Error("Attempted to rename a tab doesn't exist.");

    const isValid = validateTabTitle(newTitle, tab.title);

    if (isValid)
      setTabs(prev => prev.map(t => (t.id === id ? { ...t, title: newTitle.trim() } : t)));
  };

  const changeTabType = (id: string, type: TabType) => {
    // Saved state belongs to the old type; the tab starts fresh as the new one.
    removeTabState(id);
    setTabs(prev => prev.map(
      t => (
        t.id === id
          ? { id: t.id, title: defaultTitleFor(type), type: type }
          : t)));
  }

  return (
    <WorkspaceContext.Provider value={{
      tabs,
      addTab,
      removeTab,
      renameTab,
      changeTabType,
      layoutMode,
      setLayoutMode,
      paneAssignment,
      setPaneAssigment,
      mobileDrawerIsClosing,
      mobileDrawerIsOpen,
      setMobileDrawerIsClosing,
      setMobileDrawerIsOpen,
      findTab,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspaceContext = () => {
  return useContext(WorkspaceContext);
}
