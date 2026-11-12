// TODO: Update to be NadacSearchContext!
import { type Dispatch, type ReactNode, type SetStateAction, createContext, useCallback, useContext, useMemo, useState } from "react"
import type { NadacPrice } from "../library/types";
import type { GridRowSelectionModel } from "@mui/x-data-grid";
import {
  applyNadacSearch, createNadacCriteria, nadacLoadRequest,
  type NadacCriteria, type NadacLoad, type NadacLoadFields,
} from "../library/searchCriteria";
import useSearchLoad from "../hooks/useSearchLoad";

type NadacSearchContextType = {
  /** The applied criteria. Refine fields apply at once; load fields change through `search`. */
  criteria: NadacCriteria;
  setCriteria: Dispatch<SetStateAction<NadacCriteria>>;
  /** The Search button: applies the form's load fields. */
  search: (fields: NadacLoadFields) => void;
  /** What the criteria ask for; its dates clip the result. See `useSearchLoad`. */
  requested: NadacLoad | null;
  /** What the query fetches: `requested`, or a wider load that holds it. */
  loaded: NadacLoad | null;
  /** The load the user's last Search fetched or re-ran; the result toasts' key. */
  lastSearch: NadacLoad | null;
  /** True while a Search waits for app-init. */
  waiting: boolean;
  data: Array<NadacPrice>;
  setData: React.Dispatch<React.SetStateAction<Array<NadacPrice>>>;
  /** `data` without the descriptions the Drug page filter excludes. Only Add Chart reads it. */
  vizData: Array<NadacPrice>;
  selectedNdcDescriptions: string[];
  setSelectedNdcDescriptions: (selected: string[]) => void;
  ndcDescriptions: string[];
  selectedRows: GridRowSelectionModel;
  setSelectedRows: React.Dispatch<React.SetStateAction<GridRowSelectionModel>>;
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
  data: [],
  setData: () => { },
  vizData: [],
  selectedNdcDescriptions: [],
  setSelectedNdcDescriptions: () => { },
  ndcDescriptions: [],
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

export const NadacSearchContextProvider = ({ children, initial, searchEnabled = true }: ProviderProps) => {
  const [data, setData] = useState<Array<NadacPrice>>([]);
  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>({ type: "include", ids: new Set() })
  const { criteria, setCriteria, search, requested, loaded, lastSearch, waiting } = useSearchLoad(
    initial?.criteria ?? createNadacCriteria(), nadacLoadRequest, applyNadacSearch);
  const { excludedNdcDescriptions } = criteria;

  const ndcDescriptions: Array<string> = useMemo(
    () => [...new Set(data.map(drug => drug.ndcDescription))],
    [data]
  )

  const selectedNdcDescriptions = useMemo(
    () => ndcDescriptions.filter(description => !excludedNdcDescriptions.includes(description)),
    [ndcDescriptions, excludedNdcDescriptions]
  );

  const setSelectedNdcDescriptions = useCallback((selected: string[]) => {
    setCriteria(prev => ({
      ...prev,
      excludedNdcDescriptions: ndcDescriptions.filter(description => !selected.includes(description)),
    }));
  }, [ndcDescriptions, setCriteria]);

  const vizData = useMemo(() => {
    if (excludedNdcDescriptions.length === 0) return data;
    const excluded = new Set(excludedNdcDescriptions);
    return data.filter(price => !excluded.has(price.ndcDescription));
  }, [data, excludedNdcDescriptions]);

  return (
    <NadacSearchContext.Provider value={{
      criteria,
      setCriteria,
      search,
      requested,
      loaded,
      lastSearch,
      waiting,
      data,
      setData,
      vizData,
      selectedNdcDescriptions,
      setSelectedNdcDescriptions,
      ndcDescriptions,
      selectedRows,
      setSelectedRows,
      searchEnabled,
    }}>
      {children}
    </NadacSearchContext.Provider>
  );
};

export const useSearchContext = () => {
  return useContext(NadacSearchContext);
};
