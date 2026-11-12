import { useEffect, useState, type ReactNode } from "react";
import { FdaSearchContextProvider, useFdaSearchContext } from "./FdaSearchContext";
import { NadacSearchContextProvider, useNadacSearchContext } from "./NadacSearchContext";
import { PinnedItemsProvider } from "./PinnedItemsProvider";
import { usePinnedItems } from "./pinnedItemsContexts";
import { loadCollectionTabState, loadFdaTabState, loadNadacTabState, saveTabState } from "../library/persist";

// Each search tab gets its own page context plus its own pinned items, restored from and saved
// to storage under the tab's id. Restoring the criteria re-runs the search.

type TabProviderProps = {
  children: ReactNode,
  tabId: string,
  /** False until the tab is first shown; the search waits for it. Standalone pages are always active. */
  active?: boolean,
};

export const FdaTabProvider = ({ children, tabId, active = true }: TabProviderProps) => {
  const [saved] = useState(() => loadFdaTabState(tabId));
  return (
    <FdaSearchContextProvider initial={saved ?? undefined} searchEnabled={active}>
      <PinnedItemsProvider initial={saved ?? undefined}>
        <SaveFdaTab tabId={tabId} />
        {children}
      </PinnedItemsProvider>
    </FdaSearchContextProvider>
  );
};

export const NadacTabProvider = ({ children, tabId, active = true }: TabProviderProps) => {
  const [saved] = useState(() => loadNadacTabState(tabId));
  return (
    <NadacSearchContextProvider initial={saved ?? undefined} searchEnabled={active}>
      <PinnedItemsProvider initial={saved ?? undefined}>
        <SaveNadacTab tabId={tabId} />
        {children}
      </PinnedItemsProvider>
    </NadacSearchContextProvider>
  );
};

export const CollectionTabProvider = ({ children, tabId }: TabProviderProps) => {
  const [saved] = useState(() => loadCollectionTabState(tabId));
  return (
    <PinnedItemsProvider initial={saved ?? undefined}>
      <SaveCollectionTab tabId={tabId} />
      {children}
    </PinnedItemsProvider>
  )
}

/** A tab that hasn't chosen a search type yet: nothing to restore or save. */
export const BlankTabProvider = ({ children }: TabProviderProps) => (
  <FdaSearchContextProvider>
    <PinnedItemsProvider>{children}</PinnedItemsProvider>
  </FdaSearchContextProvider>
);

function SaveFdaTab({ tabId }: { tabId: string }) {
  const { criteria, fdaResultDetailLevel } = useFdaSearchContext();
  const pinnedItems = usePinnedItems();

  useEffect(() => {
    saveTabState(tabId, { type: "fda", criteria, detailLevel: fdaResultDetailLevel, pinnedItems });
  }, [tabId, criteria, fdaResultDetailLevel, pinnedItems]);

  return null;
}

function SaveNadacTab({ tabId }: { tabId: string }) {
  const { criteria } = useNadacSearchContext();
  const pinnedItems = usePinnedItems();

  useEffect(() => {
    saveTabState(tabId, { type: "nadac", criteria, pinnedItems });
  }, [tabId, criteria, pinnedItems]);

  return null;
}

function SaveCollectionTab({ tabId }: { tabId: string }) {
  const pinnedItems = usePinnedItems();

  useEffect(() => {
    saveTabState(tabId, { type: "collection", pinnedItems });
  }, [tabId, pinnedItems]);

  return null;
}
