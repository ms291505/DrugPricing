import { useEffect, useState, type ReactNode } from "react";
import { FdaSearchContextProvider, useFdaSearchContext } from "./FdaSearchContext";
import { NadacSearchContextProvider, useNadacSearchContext } from "./NadacSearchContext";
import { PinnedItemsProvider } from "./PinnedItemsProvider";
import { usePinnedItems } from "./pinnedItemsContexts";
import {
  loadFdaTabState, loadNadacTabState, loadSearchPins, saveSearchPins, saveStandaloneSearch, STANDALONE_TAB_IDS,
} from "../library/persist";

/** Mounted once around the two standalone sources only. Workspace TabProviders are unchanged. */
export function StandalonePinsProvider({ children }: { children: ReactNode }) {
  const [saved] = useState(loadSearchPins);
  return (
    <PinnedItemsProvider initial={saved}>
      <SaveSearchPins />
      {children}
    </PinnedItemsProvider>
  );
}

function SaveSearchPins() {
  const pins = usePinnedItems();
  useEffect(() => saveSearchPins(pins), [pins]);
  return null;
}

/** These own criteria only; they inherit pins from StandalonePinsProvider. */
export function StandaloneFdaProvider({ children }: { children: ReactNode }) {
  const [saved] = useState(() => loadFdaTabState(STANDALONE_TAB_IDS.fda));
  return (
    <FdaSearchContextProvider initial={saved ?? undefined}>
      <SaveFdaSearch />
      {children}
    </FdaSearchContextProvider>
  );
}

function SaveFdaSearch() {
  const { criteria, fdaResultDetailLevel } = useFdaSearchContext();
  useEffect(() => saveStandaloneSearch({ type: "fda", criteria, detailLevel: fdaResultDetailLevel }), [criteria, fdaResultDetailLevel]);
  return null;
}

export function StandaloneNadacProvider({ children }: { children: ReactNode }) {
  const [saved] = useState(() => loadNadacTabState(STANDALONE_TAB_IDS.nadac));
  return (
    <NadacSearchContextProvider initial={saved ?? undefined}>
      <SaveNadacSearch />
      {children}
    </NadacSearchContextProvider>
  );
}

function SaveNadacSearch() {
  const { criteria } = useNadacSearchContext();
  useEffect(() => saveStandaloneSearch({ type: "nadac", criteria }), [criteria]);
  return null;
}
