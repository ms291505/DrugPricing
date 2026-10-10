import React from "react";
import { FdaSearchContextProvider } from "./FdaSearchContext";
import { SearchContextProvider } from "./SearchContext";
import { ExplorerItemsProvider } from "./ExplorerItemsContext";

// Each search tab gets its own page context plus its own pinned items.

export const FdaTabProvider = ({ children }: { children: React.ReactNode }) => (
  <FdaSearchContextProvider>
    <ExplorerItemsProvider>{children}</ExplorerItemsProvider>
  </FdaSearchContextProvider>
);

export const NadacTabProvider = ({ children }: { children: React.ReactNode }) => (
  <SearchContextProvider>
    <ExplorerItemsProvider>{children}</ExplorerItemsProvider>
  </SearchContextProvider>
);
