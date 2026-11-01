import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ExplorerItem } from "../library/explorerItems";
import { ALL_DATES, type ChartDates } from "../library/dates";
import type { PersistedExplorerState } from "../library/persist";

const HIGHLIGHT_MS = 2000;

/**
 * A tab's two lists of user charts.
 * - `pinned`: pinned from auto charts or added charts. New searches and filter changes never
 *   touch them, and they are saved with the tab.
 * - `unpinned` ("Added charts"): made with Add Chart. Not saved, and a new search clears them.
 */
export type ItemList = "pinned" | "unpinned";

type Highlight = {
  id: string,
  /**
   * Scroll the item into view and move focus to its heading (Add Chart, and pinning an added
   * chart, which moves its card). Pinning an auto chart only highlights.
   */
  focus: boolean,
};

type ExplorerItemsContextType = {
  items: Record<ItemList, ExplorerItem[]>;
  addItem: (list: ItemList, item: ExplorerItem, options?: { focus?: boolean }) => void;
  /** Moves an unpinned item to the end of the pinned items. */
  pinItem: (id: string) => void;
  clearUnpinnedItems: () => void;
  updateItem: (id: string, update: (item: ExplorerItem) => ExplorerItem) => void;
  removeItem: (id: string) => void;
  /** Moves an item up (-1) or down (+1) one place within its own list. */
  moveItem: (id: string, delta: -1 | 1) => void;
  setAllCollapsed: (list: ItemList, collapsed: boolean) => void;
  /** The item just added, briefly, so its card can draw attention to itself. */
  highlight: Highlight | null;
  /** The Page Tools chart dates. `useChartWindow` resolves them against the current search. */
  chartDates: ChartDates;
  setChartDates: (chartDates: ChartDates) => void;
};

const NO_ITEMS: Record<ItemList, ExplorerItem[]> = { pinned: [], unpinned: [] };

export const ExplorerItemsContext = createContext<ExplorerItemsContextType>({
  items: NO_ITEMS,
  addItem: () => { },
  pinItem: () => { },
  clearUnpinnedItems: () => { },
  updateItem: () => { },
  removeItem: () => { },
  moveItem: () => { },
  setAllCollapsed: () => { },
  highlight: null,
  chartDates: ALL_DATES,
  setChartDates: () => { },
});

type ProviderProps = {
  children: React.ReactNode,
  /** State restored from storage. */
  initial?: PersistedExplorerState,
};

type Items = Record<ItemList, ExplorerItem[]>;

/** Applies `update` to whichever list holds `id`. */
const updateListHolding = (items: Items, id: string, update: (list: ExplorerItem[]) => ExplorerItem[]): Items => {
  if (items.pinned.some(item => item.id === id)) return { ...items, pinned: update(items.pinned) };
  if (items.unpinned.some(item => item.id === id)) return { ...items, unpinned: update(items.unpinned) };
  return items;
};

/**
 * Holds one tab's pinned and unpinned items and the chart settings both search pages share. Each
 * search tab type wraps its own provider with this.
 *
 * Both lists live in one state so moving an item between them is a single update. Each update
 * keeps the identity of a list it doesn't change, so saving and Match scale skip it.
 */
export const ExplorerItemsProvider = ({ children, initial }: ProviderProps) => {
  const [items, setItems] = useState<Items>(() => ({ pinned: initial?.pinnedItems ?? [], unpinned: [] }));
  const [chartDates, setChartDates] = useState<ChartDates>(initial?.chartDates ?? ALL_DATES);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const highlightItem = useCallback((id: string, focus: boolean) => {
    setHighlight({ id, focus });
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlight(null), HIGHLIGHT_MS);
  }, []);

  const addItem = useCallback((list: ItemList, item: ExplorerItem, options?: { focus?: boolean }) => {
    setItems(prev => ({ ...prev, [list]: [...prev[list], item] }));
    highlightItem(item.id, options?.focus ?? false);
  }, [highlightItem]);

  // The card moves to another section and loses focus with it, so focus follows it there.
  // Match scale is per section, so the chart starts unmatched among the pins: it was matched
  // against added charts, not against these.
  const pinItem = useCallback((id: string) => {
    setItems(prev => {
      const item = prev.unpinned.find(item => item.id === id);
      if (!item) return prev;
      return {
        pinned: [...prev.pinned, { ...item, matchScale: false }],
        unpinned: prev.unpinned.filter(item => item.id !== id),
      };
    });
    highlightItem(id, true);
  }, [highlightItem]);

  const clearUnpinnedItems = useCallback(() => {
    setItems(prev => prev.unpinned.length === 0 ? prev : { ...prev, unpinned: [] });
  }, []);

  const updateItem = useCallback((id: string, update: (item: ExplorerItem) => ExplorerItem) => {
    setItems(prev => updateListHolding(prev, id, list => list.map(item => item.id === id ? update(item) : item)));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => updateListHolding(prev, id, list => list.filter(item => item.id !== id)));
  }, []);

  const moveItem = useCallback((id: string, delta: -1 | 1) => {
    setItems(prev => updateListHolding(prev, id, list => {
      const from = list.findIndex(item => item.id === id);
      const to = from + delta;
      if (to < 0 || to >= list.length) return list;
      const next = [...list];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    }));
  }, []);

  const setAllCollapsed = useCallback((list: ItemList, collapsed: boolean) => {
    setItems(prev => ({ ...prev, [list]: prev[list].map(item => ({ ...item, collapsed })) }));
  }, []);

  const value = useMemo(() => ({
    items, addItem, pinItem, clearUnpinnedItems, updateItem, removeItem, moveItem, setAllCollapsed,
    highlight, chartDates, setChartDates,
  }), [items, addItem, pinItem, clearUnpinnedItems, updateItem, removeItem, moveItem, setAllCollapsed,
    highlight, chartDates]);

  return (
    <ExplorerItemsContext.Provider value={value}>
      {children}
    </ExplorerItemsContext.Provider>
  );
};

export const useExplorerItems = () => {
  return useContext(ExplorerItemsContext);
};
