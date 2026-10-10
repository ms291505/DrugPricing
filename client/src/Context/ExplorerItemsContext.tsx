import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ExplorerItem } from "../library/explorerItems";
import { FULL_WINDOW, type DateWindow } from "../library/dates";
import type { PersistedExplorerState } from "../library/persist";

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
  /** The Page Tools chart dates: auto charts show them, and new charts start with them. */
  chartWindow: DateWindow;
  setChartWindow: (window: DateWindow) => void;
  /** Pinned line charts in the same pricing unit share one price axis. */
  matchScale: boolean;
  setMatchScale: (matchScale: boolean) => void;
};

export const ExplorerItemsContext = createContext<ExplorerItemsContextType>({
  pinnedItems: [],
  addItem: () => { },
  updateItem: () => { },
  removeItem: () => { },
  moveItem: () => { },
  setAllCollapsed: () => { },
  highlight: null,
  chartWindow: FULL_WINDOW,
  setChartWindow: () => { },
  matchScale: false,
  setMatchScale: () => { },
});

type ProviderProps = {
  children: React.ReactNode,
  /** State restored from storage. */
  initial?: PersistedExplorerState,
};

/**
 * Holds one tab's pinned items and the chart settings both search pages share. Each search tab
 * type wraps its own provider with this.
 */
export const ExplorerItemsProvider = ({ children, initial }: ProviderProps) => {
  const [pinnedItems, setPinnedItems] = useState<ExplorerItem[]>(initial?.pinnedItems ?? []);
  const [chartWindow, setChartWindow] = useState<DateWindow>(initial?.chartWindow ?? FULL_WINDOW);
  const [matchScale, setMatchScale] = useState(initial?.matchScale ?? false);
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
    chartWindow, setChartWindow, matchScale, setMatchScale,
  }), [pinnedItems, addItem, updateItem, removeItem, moveItem, setAllCollapsed, highlight, chartWindow, matchScale]);

  return (
    <ExplorerItemsContext.Provider value={value}>
      {children}
    </ExplorerItemsContext.Provider>
  );
};

export const useExplorerItems = () => {
  return useContext(ExplorerItemsContext);
};
