import React, { createContext, useState, type Dispatch, type SetStateAction } from "react";
import type { LayoutMode, TabType, WorkspaceTab } from "../types";

type WorkspaceContextType = {
  tabs: Array<WorkspaceTab>;
  addTab: (type: TabType, title?: string) => string;
  removeTab: (id: string) => void;
  renameTab: (id: string, title: string) => void;
  layoutMode: LayoutMode;
  setLayoutMode: Dispatch<SetStateAction<LayoutMode>>;
  paneAssignment: Array<string | null>;
  setPaneAssigment: Dispatch<SetStateAction<Array<string | null>>>;
};

export const WorkspaceContext = createContext<WorkspaceContextType>({
  tabs: [],
  addTab: () => "",
  removeTab: () => { },
  renameTab: () => { },
  layoutMode: "single",
  setLayoutMode: () => { },
  paneAssignment: [null],
  setPaneAssigment: () => { },
});

export const WorkspaceContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [tabs, setTabs] = useState<Array<WorkspaceTab>>([]);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("single");
  const [paneAssignment, setPaneAssigment] = useState<Array<string | null>>([null]);

  const addTab = (tabType: TabType, title?: string) => {
    const id = crypto.randomUUID();
    const newTab: WorkspaceTab =
    {
      id: id,
      type: tabType,
      title: title ?? "New Tab",
    }
    setTabs(prev => [...prev, newTab]);
    return id;
  }
  const removeTab = (id: string) => {
    setTabs(prev => prev.filter(t => t.id !== id));
  };
  const renameTab = (id: string, title: string) => {
    setTabs(prev => prev.map(t => (t.id === id ? { ...t, title } : t)));
  };

  return (
    <WorkspaceContext.Provider value={{
      tabs,
      addTab,
      removeTab,
      renameTab,
      layoutMode,
      setLayoutMode,
      paneAssignment,
      setPaneAssigment
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
