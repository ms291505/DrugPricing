import type { SetStateAction } from "react";
import { validateTabTitle, type LayoutMode, type TabType, type WorkspaceTab } from "./types";
import type { PersistedWorkspace } from "./persist";

export type WorkspaceState = PersistedWorkspace;

export type WorkspaceAction =
  | { type: "add", tab: WorkspaceTab }
  | { type: "remove", id: string }
  | { type: "rename", id: string, title: string }
  | { type: "changeType", id: string, tabType: TabType, title: string }
  | { type: "setLayoutMode", value: SetStateAction<LayoutMode> }
  | { type: "setPanes", value: SetStateAction<Array<string | null>> };

const resolve = <T,>(value: SetStateAction<T>, prev: T) =>
  typeof value === "function" ? (value as (prev: T) => T)(prev) : value;

/**
 * Tabs and panes share one reducer because closing a tab picks its replacement pane from the
 * tab list. Every action keeps the identity of the tabs it doesn't change: memoized panes
 * (`TabInstance`, `DrawerTab`) skip rendering on that, so a new object for an unchanged tab
 * re-renders its whole page on every switch.
 */
export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "add":
      return { ...state, tabs: [...state.tabs, action.tab] };
    case "remove": {
      const { tabs } = state;
      const idx = tabs.findIndex(t => t.id === action.id);
      if (idx < 0) return state;
      // The next tab takes the closed tab's pane, or the previous one if it was last.
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
            ? { id: t.id, title: action.title, type: action.tabType }
            : t)),
      };
    case "setLayoutMode":
      return { ...state, layoutMode: resolve(action.value, state.layoutMode) };
    case "setPanes":
      return { ...state, paneAssignment: resolve(action.value, state.paneAssignment) };
  }
}
