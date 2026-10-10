import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ExplorerItem } from "../library/explorerItems";

const HIGHLIGHT_MS = 2000;

type Highlight = {
  id: string,
  /** Scroll the item into view and move focus to its heading (Add Chart). Pin only highlights. */
  focus: boolean,
};

type ExplorerItemsContextType = {
  pinnedItems: ExplorerItem[];
  addItem: (item: ExplorerItem, options?: { focus?: boolean }) => void;
  updateItem: (id: string, update: (item: ExplorerItem) => ExplorerItem) => void;
  removeItem: (id: string) => void;
  /** Moves an item up (-1) or down (+1) one place. */
  moveItem: (id: string, delta: -1 | 1) => void;
  setAllCollapsed: (collapsed: boolean) => void;
  /** The item just added, briefly, so its card can draw attention to itself. */
  highlight: Highlight | null;
};

export const ExplorerItemsContext = createContext<ExplorerItemsContextType>({
  pinnedItems: [],
  addItem: () => { },
  updateItem: () => { },
  removeItem: () => { },
  moveItem: () => { },
  setAllCollapsed: () => { },
  highlight: null,
});

type ProviderProps = {
  children: React.ReactNode,
  /** Items restored from storage. */
  initialItems?: ExplorerItem[],
};

/** Holds one tab's pinned items. Each search tab type wraps its own provider with this. */
export const ExplorerItemsProvider = ({ children, initialItems }: ProviderProps) => {
  const [pinnedItems, setPinnedItems] = useState<ExplorerItem[]>(initialItems ?? []);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const addItem = useCallback((item: ExplorerItem, options?: { focus?: boolean }) => {
    setPinnedItems(prev => [...prev, item]);
    setHighlight({ id: item.id, focus: options?.focus ?? false });
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlight(null), HIGHLIGHT_MS);
  }, []);

  const updateItem = useCallback((id: string, update: (item: ExplorerItem) => ExplorerItem) => {
    setPinnedItems(prev => prev.map(item => item.id === id ? update(item) : item));
  }, []);

  const removeItem = useCallback((id: string) => {
    setPinnedItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const moveItem = useCallback((id: string, delta: -1 | 1) => {
    setPinnedItems(prev => {
      const from = prev.findIndex(item => item.id === id);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }, []);

  const setAllCollapsed = useCallback((collapsed: boolean) => {
    setPinnedItems(prev => prev.map(item => ({ ...item, collapsed })));
  }, []);

  const value = useMemo(() => ({
    pinnedItems, addItem, updateItem, removeItem, moveItem, setAllCollapsed, highlight,
  }), [pinnedItems, addItem, updateItem, removeItem, moveItem, setAllCollapsed, highlight]);

  return (
    <ExplorerItemsContext.Provider value={value}>
      {children}
    </ExplorerItemsContext.Provider>
  );
};

export const useExplorerItems = () => {
  return useContext(ExplorerItemsContext);
};
