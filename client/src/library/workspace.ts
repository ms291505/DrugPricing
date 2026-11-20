import type { SetStateAction } from "react";
import { type LayoutMode, } from "./types";
import { defaultTitleFor, validateTabTitle, type TabType, type WorkspaceTab } from "./tabType.ts";
import type { PersistedWorkspace } from "./persist";

export type WorkspaceState = PersistedWorkspace;

export type WorkspaceAction =
  | { type: "add", tab: WorkspaceTab, show?: boolean }
  /** `fallback` replaces the tab if it is the only one; the caller creates it, so this stays pure. */
  | { type: "remove", id: string, fallback: WorkspaceTab }
  | { type: "rename", id: string, title: string }
  | { type: "changeType", id: string, tabType: TabType, title: string }
  | { type: "setLayoutMode", value: SetStateAction<LayoutMode> }
  | { type: "setPanes", value: SetStateAction<Array<string | null>> }
  /** Starts over with `tab` alone; the caller creates it, so this stays pure. */
  | { type: "reset", tab: WorkspaceTab };

const resolve = <T,>(value: SetStateAction<T>, prev: T) =>
  typeof value === "function" ? (value as (prev: T) => T)(prev) : value;

/**
 * The tab that takes over when `id` closes: the next one, or the previous one if it was last,
 * or `fallbackId` (the new tab that replaces it) if it was the only one. The reducer gives it the
 * closed tab's pane, and the drawer moves keyboard focus to its row. Null for a missing tab.
 */
export function replacementTabId(tabs: WorkspaceTab[], id: string, fallbackId: string): string | null {
  const idx = tabs.findIndex(t => t.id === id);
  if (idx < 0) return null;
  return tabs[idx + 1]?.id ?? tabs[idx - 1]?.id ?? fallbackId;
}

/**
 * Tabs and panes share one reducer because closing a tab picks its replacement pane from the
 * tab list. Every action keeps the identity of the tabs it doesn't change: memoized panes
 * (`TabInstance`, `DrawerTab`) skip rendering on that, so a new object for an unchanged tab
 * re-renders its whole page on every switch.
 *
 * It never returns a workspace without tabs: closing the only tab leaves the new tab the action
 * brings.
 */
export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "add": {
      const displaced = state.tabs.find(tab => tab.id === state.paneAssignment[0]);
      // Reuse only an untouched blank in the destination pane. Keep named blanks and any
      // blank still shown in another pane, just like existing searches.
      const replaceBlank = action.show && displaced?.type === "new"
        && displaced.title === defaultTitleFor("new")
        && !state.paneAssignment.slice(1).includes(displaced.id);
      return {
        ...state,
        tabs: replaceBlank
          ? state.tabs.map(tab => tab === displaced ? action.tab : tab)
          : [...state.tabs, action.tab],
        paneAssignment: action.show ? [action.tab.id, ...state.paneAssignment.slice(1)] : state.paneAssignment,
      };
    }
    case "remove": {
      if (!state.tabs.some(t => t.id === action.id)) return state;
      const replacement = replacementTabId(state.tabs, action.id, action.fallback.id);
      const tabs = state.tabs.filter(t => t.id !== action.id);
      return {
        ...state,
        tabs: tabs.length > 0 ? tabs : [action.fallback],
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
    case "reset":
      return { tabs: [action.tab], layoutMode: "single", paneAssignment: [action.tab.id] };
  }
}
