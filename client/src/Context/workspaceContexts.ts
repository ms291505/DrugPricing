import { createContext, useContext, type Context, type RefObject, type SetStateAction } from "react";
import type { LayoutMode } from "../library/types";
import type { TabType, WorkspaceTab } from "../library/tabType";
import type { ExplorerItem } from "../library/explorerItems";

// The workspace is split into several contexts so a component re-renders only for the state it
// reads. Switching tabs changes only the panes (and, on a phone, the drawer), so hidden tabs,
// which read the tab list and the actions, don't re-render. Don't merge these back into one
// catch-all value.
//
// They live apart from the provider (`WorkspaceContext.tsx`) so a hot update of the provider, or
// of anything it imports, doesn't create new contexts that the mounted provider doesn't serve.
// Their defaults are null, and the hooks throw on null: a consumer that misses the provider
// fails loudly instead of showing an empty workspace.

export type WorkspacePanes = {
  layoutMode: LayoutMode;
  paneAssignment: Array<string | null>;
};

export type MobileDrawerState = {
  mobileDrawerIsOpen: boolean;
};

/** Never change identity, so reading them doesn't re-render a component. */
export type WorkspaceActions = {
  addTab: (type: TabType, title?: string) => string;
  /**
   * Closes the tab and returns the id of the tab that takes over its pane. Closing the only tab
   * leaves a new blank tab.
   */
  removeTab: (id: string) => string | null;
  renameTab: (id: string, title: string) => void;
  changeTabType: (id: string, type: TabType) => void;
  setLayoutMode: (value: SetStateAction<LayoutMode>) => void;
  setPaneAssigment: (value: SetStateAction<Array<string | null>>) => void;
  setMobileDrawerIsOpen: (value: SetStateAction<boolean>) => void;
  /**
   * The phone drawer's toggle button. A modal opened from the phone drawer returns focus here,
   * since the drawer closes as the modal opens and takes the opener with it.
   */
  mobileDrawerToggle: RefObject<HTMLButtonElement | null>;
  addToCollection: (item: ExplorerItem, id?: string) => void;
  /** Closes every tab and deletes their saved state, leaving one blank tab. */
  clearWorkspace: () => void;
  /** Lets a collection tab receive items; returns the unregister function. */
  registerTab: (id: string, receive: (item: ExplorerItem) => void) => () => void;
};

export const WorkspaceTabsContext = createContext<Array<WorkspaceTab> | null>(null);
WorkspaceTabsContext.displayName = "WorkspaceTabs";

export const WorkspacePanesContext = createContext<WorkspacePanes | null>(null);
WorkspacePanesContext.displayName = "WorkspacePanes";

export const MobileDrawerContext = createContext<MobileDrawerState | null>(null);
MobileDrawerContext.displayName = "MobileDrawer";

export const WorkspaceActionsContext = createContext<WorkspaceActions | null>(null);
WorkspaceActionsContext.displayName = "WorkspaceActions";

function useWorkspaceContext<T>(context: Context<T | null>): T {
  const value = useContext(context);
  if (value === null) throw new Error(`${context.displayName} read outside WorkspaceContextProvider`);
  return value;
}

/** Every tab in the workspace. Changes only when a tab is added, removed, renamed or retyped. */
export const useWorkspaceTabs = () => useWorkspaceContext(WorkspaceTabsContext);

export const useWorkspaceTab = (id: string) => useWorkspaceTabs().find(t => t.id === id);

/** Which tabs are shown. Changes on every tab switch, so hidden tabs must not read it. */
export const useWorkspacePanes = () => useWorkspaceContext(WorkspacePanesContext);

/** Changes on every tab tap on a phone; only the drawer itself and its button read it. */
export const useMobileDrawer = () => useWorkspaceContext(MobileDrawerContext);

export const useWorkspaceActions = () => useWorkspaceContext(WorkspaceActionsContext);
