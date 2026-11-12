import React, { useCallback, useMemo, useRef, useState } from "react";
import type { ExplorerItem } from "../library/explorerItems";
import type { PersistedExplorerState } from "../library/persist";
import { PinActionsContext, PinHighlightContext, PinnedItemsContext, type PinHighlight } from "./pinnedItemsContexts";

const HIGHLIGHT_MS = 2000;

type ProviderProps = {
  children: React.ReactNode,
  /** State restored from storage. */
  initial?: PersistedExplorerState,
};

/**
 * Holds one tab's pinned items. Each tab type with pinned items wraps its own provider with this.
 * The items, the actions and the add highlight are separate contexts (`pinnedItemsContexts.ts`).
 */
export const PinnedItemsProvider = ({ children, initial }: ProviderProps) => {
  const [pinnedItems, setPinnedItems] = useState<ExplorerItem[]>(initial?.pinnedItems ?? []);
  const [highlight, setHighlight] = useState<PinHighlight | null>(null);
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
    setPinnedItems(prev => prev.map(item => item.collapsed === collapsed ? item : { ...item, collapsed }));
  }, []);

  const actions = useMemo(() => ({ addItem, updateItem, removeItem, moveItem, setAllCollapsed }),
    [addItem, updateItem, removeItem, moveItem, setAllCollapsed]);

  return (
    <PinActionsContext.Provider value={actions}>
      <PinnedItemsContext.Provider value={pinnedItems}>
        <PinHighlightContext.Provider value={highlight}>
          {children}
        </PinHighlightContext.Provider>
      </PinnedItemsContext.Provider>
    </PinActionsContext.Provider>
  );
};
