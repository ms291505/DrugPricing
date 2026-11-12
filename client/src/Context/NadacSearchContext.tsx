import { type Dispatch, type ReactNode, type SetStateAction, createContext, useContext, useState } from "react"
import type { GridRowSelectionModel } from "@mui/x-data-grid";
import {
  applyNadacSearch, createNadacCriteria, nadacLoadRequest,
  type NadacCriteria, type NadacLoad, type NadacTerms,
} from "../library/searchCriteria";
import useSearchLoad from "../hooks/useSearchLoad";

type NadacSearchContextType = {
  /** The applied criteria. Every field applies at once but the text terms, which change through `search`. */
  criteria: NadacCriteria;
  setCriteria: Dispatch<SetStateAction<NadacCriteria>>;
  /** The Search button: applies the form's text terms. */
  search: (fields: NadacTerms) => void;
  /** What the criteria ask for; its dates clip the result. See `useSearchLoad`. */
  requested: NadacLoad | null;
  /** What the query fetches: `requested`, or a wider load that holds it. */
  loaded: NadacLoad | null;
  /** What the user's last Search asked for; the result toasts' key. */
  lastSearch: NadacLoad | null;
  /** True while a Search waits for app-init. */
  waiting: boolean;
  selectedRows: GridRowSelectionModel;
  setSelectedRows: Dispatch<SetStateAction<GridRowSelectionModel>>;
  /** False while the tab hasn't been shown yet; `useNadacSearch` waits for it. */
  searchEnabled: boolean;
}

export const NadacSearchContext = createContext<NadacSearchContextType>({
  criteria: createNadacCriteria(),
  setCriteria: () => { },
  search: () => { },
  requested: null,
  loaded: null,
  lastSearch: null,
  waiting: false,
  selectedRows: { type: "include", ids: new Set() },
  setSelectedRows: () => { },
  searchEnabled: true,
});

export type NadacSearchInitialState = {
  criteria: NadacCriteria,
};

type ProviderProps = {
  children: ReactNode,
  /** State restored from storage; the search re-runs from `criteria`. */
  initial?: NadacSearchInitialState,
  searchEnabled?: boolean,
};

/**
 * A NADAC search tab's criteria and selection. The result itself isn't held here: it is derived
 * from the query (`useRefinedNadacSearch`).
 */
export const NadacSearchContextProvider = ({ children, initial, searchEnabled = true }: ProviderProps) => {
  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>({ type: "include", ids: new Set() })
  const { criteria, setCriteria, search, requested, loaded, lastSearch, waiting } = useSearchLoad(
    initial?.criteria ?? createNadacCriteria(), nadacLoadRequest, applyNadacSearch);

  return (
    <NadacSearchContext.Provider value={{
      criteria,
      setCriteria,
      search,
      requested,
      loaded,
      lastSearch,
      waiting,
      selectedRows,
      setSelectedRows,
      searchEnabled,
    }}>
      {children}
    </NadacSearchContext.Provider>
  );
};

export const useNadacSearchContext = () => {
  return useContext(NadacSearchContext);
};
