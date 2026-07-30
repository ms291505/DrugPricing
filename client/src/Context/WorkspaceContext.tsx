import React, { createContext, useContext, useState, type Dispatch, type SetStateAction } from "react";
import { defaultTitleFor, type LayoutMode, type TabType, type WorkspaceTab } from "../library/types";

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
});

export const WorkspaceContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [tabs, setTabs] = useState<Array<WorkspaceTab>>([]);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("single");
  const [mobileDrawerIsOpen, setMobileDrawerIsOpen] = useState(false);
  const [mobileDrawerIsClosing, setMobileDrawerIsClosing] = useState(false);
  const [paneAssignment, setPaneAssigment] = useState<Array<string | null>>([null]);

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
  const removeTab = (id: string) => {
    setTabs(prev => prev.filter(t => t.id !== id));
  };
  const renameTab = (id: string, title: string) => {
    setTabs(prev => prev.map(t => (t.id === id ? { ...t, title } : t)));
  };
  const changeTabType = (id: string, type: TabType) => {
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
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspaceContext = () => {
  return useContext(WorkspaceContext);
}
