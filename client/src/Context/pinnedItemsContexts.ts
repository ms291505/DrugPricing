import { createContext, useContext } from "react";
import type { ExplorerItem } from "../library/explorerItems";

// A tab's pinned items, split by how often each part changes, so a component re-renders only for
// what it reads. The provider is `PinnedItemsProvider`; this module holds no components (see
// "Keep imports acyclic and provider modules component-only" in AGENTS.md).

export type PinHighlight = {
  id: string,
  /** Scroll the item into view and move focus to its heading (Chart selected). Pin only highlights. */
  focus: boolean,
};

export type PinActions = {
  addItem: (item: ExplorerItem, options?: { focus?: boolean }) => void;
  updateItem: (id: string, update: (item: ExplorerItem) => ExplorerItem) => void;
  removeItem: (id: string) => void;
  /** Moves an item up (-1) or down (+1) one place. */
  moveItem: (id: string, delta: -1 | 1) => void;
  setAllCollapsed: (collapsed: boolean) => void;
};

export const PinnedItemsContext = createContext<ExplorerItem[] | null>(null);
export const PinActionsContext = createContext<PinActions | null>(null);
export const PinHighlightContext = createContext<PinHighlight | null>(null);

function required<T>(value: T | null, hook: string): T {
  if (value === null) throw new Error(`${hook} must be used inside PinnedItemsProvider`);
  return value;
}

/** The pinned items. Changes whenever any item does: read it only where the whole list is needed. */
export const usePinnedItems = () => required(useContext(PinnedItemsContext), "usePinnedItems");

/** Adding, changing and removing pinned items. Stable for the life of the tab. */
export const usePinActions = () => required(useContext(PinActionsContext), "usePinActions");

/** The item just added, for 2 seconds, so its card can draw attention to itself. */
export const usePinHighlight = () => useContext(PinHighlightContext);
