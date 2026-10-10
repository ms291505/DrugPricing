import React, { useEffect, useState } from "react";
import { FdaSearchContextProvider, useFdaSearchContext } from "./FdaSearchContext";
import { SearchContextProvider, useSearchContext } from "./SearchContext";
import { ExplorerItemsProvider, useExplorerItems } from "./ExplorerItemsContext";
import { loadFdaTabState, loadNadacTabState, saveTabState } from "../library/persist";

// Each search tab gets its own page context plus its own pinned items, restored from and saved
// to storage under the tab's id. Restoring the search params re-runs the search.

type TabProviderProps = {
  children: React.ReactNode,
  tabId: string,
  /** False until the tab is first shown; the search waits for it. Standalone pages are always active. */
  active?: boolean,
};

export const FdaTabProvider = ({ children, tabId, active = true }: TabProviderProps) => {
  const [saved] = useState(() => loadFdaTabState(tabId));
  return (
    <FdaSearchContextProvider initial={saved ?? undefined} searchEnabled={active}>
      <ExplorerItemsProvider initialItems={saved?.pinnedItems}>
        <SaveFdaTab tabId={tabId} />
        {children}
      </ExplorerItemsProvider>
    </FdaSearchContextProvider>
  );
};

export const NadacTabProvider = ({ children, tabId, active = true }: TabProviderProps) => {
  const [saved] = useState(() => loadNadacTabState(tabId));
  return (
    <SearchContextProvider initial={saved ?? undefined} searchEnabled={active}>
      <ExplorerItemsProvider initialItems={saved?.pinnedItems}>
        <SaveNadacTab tabId={tabId} />
        {children}
      </ExplorerItemsProvider>
    </SearchContextProvider>
  );
};

/** A tab that hasn't chosen a search type yet: nothing to restore or save. */
export const BlankTabProvider = ({ children }: TabProviderProps) => (
  <FdaSearchContextProvider>
    <ExplorerItemsProvider>{children}</ExplorerItemsProvider>
  </FdaSearchContextProvider>
);

function SaveFdaTab({ tabId }: { tabId: string }) {
  const { fdaSearchParams, fdaResultFilter, fdaResultDetailLevel } = useFdaSearchContext();
  const { pinnedItems } = useExplorerItems();

  useEffect(() => {
    saveTabState(tabId, {
      type: "fda",
      searchParams: fdaSearchParams,
      resultFilter: fdaResultFilter,
      detailLevel: fdaResultDetailLevel,
      pinnedItems,
    });
  }, [tabId, fdaSearchParams, fdaResultFilter, fdaResultDetailLevel, pinnedItems]);

  return null;
}

function SaveNadacTab({ tabId }: { tabId: string }) {
  const { searchParams, excludedNdcDescriptions } = useSearchContext();
  const { pinnedItems } = useExplorerItems();

  useEffect(() => {
    saveTabState(tabId, {
      type: "nadac",
      searchParams,
      excludedNdcDescriptions,
      pinnedItems,
    });
  }, [tabId, searchParams, excludedNdcDescriptions, pinnedItems]);

  return null;
}
