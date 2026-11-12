import React, { createContext, useCallback, useContext, useState, type Dispatch, type SetStateAction } from "react";
import { type FdaResultDetailLevel, } from "../library/types";
import type { GridRowSelectionModel } from "@mui/x-data-grid";
import {
  applyFdaSearch, createFdaCriteria, fdaLoadRequest,
  type FdaCriteria, type FdaLoad, type FdaLoadFields,
} from "../library/searchCriteria";
import { ALL_DATES } from "../library/dates";
import useSearchLoad from "../hooks/useSearchLoad";

export type FdaSearchContextType = {
  /** The applied criteria. Refine fields apply at once; load fields change through `search`. */
  criteria: FdaCriteria;
  setCriteria: Dispatch<SetStateAction<FdaCriteria>>;
  /** The Search button: applies the form's load fields. */
  search: (fields: FdaLoadFields) => void;
  /** What the criteria ask for; its dates clip the result. See `useSearchLoad`. */
  requested: FdaLoad | null;
  /** What the query fetches: `requested`, or a wider load that holds it. */
  loaded: FdaLoad | null;
  /** The load the user's last Search fetched or re-ran; the result toasts' key. */
  lastSearch: FdaLoad | null;
  /** True while a Search waits for app-init. */
  waiting: boolean;
  fdaResultDetailLevel: FdaResultDetailLevel
  /** Also clears `selectedRows`, whose ids mean different things at each level. */
  setFdaResultDetailLevel: (level: FdaResultDetailLevel) => void;
  selectedRows: GridRowSelectionModel;
  setSelectedRows: Dispatch<SetStateAction<GridRowSelectionModel>>;
  /** False while the tab hasn't been shown yet; `useFdaSearch` waits for it. */
  searchEnabled: boolean;
}

export type FdaSearchInitialState = {
  criteria: FdaCriteria,
  detailLevel: FdaResultDetailLevel,
};

export const FdaSearchContext = createContext<FdaSearchContextType>({
  criteria: createFdaCriteria(),
  setCriteria: () => { },
  search: () => { },
  requested: null,
  loaded: null,
  lastSearch: null,
  waiting: false,
  fdaResultDetailLevel: "product",
  setFdaResultDetailLevel: () => { },
  selectedRows: { type: "include", ids: new Set() },
  setSelectedRows: () => { },
  searchEnabled: true,
});

/**
 * FDA searches load all history until Dates becomes a load field on this page (step 3 of
 * plans/search-filters.md, with the request's date parameter fix). Until then the page's Chart
 * dates pick what shows, so the criteria's dates are kept but not loaded.
 */
const fdaLoadRequestAllDates = (criteria: FdaCriteria, lastAsOfDate: number) =>
  fdaLoadRequest({ ...criteria, dates: ALL_DATES }, lastAsOfDate);

type ProviderProps = {
  children: React.ReactNode,
  /** State restored from storage; the search re-runs from `criteria`. */
  initial?: FdaSearchInitialState,
  searchEnabled?: boolean,
};

export const FdaSearchContextProvider = ({ children, initial, searchEnabled = true }: ProviderProps) => {
  // The request ignores the as-of date until step 3, so a search needn't wait for app-init.
  const { criteria, setCriteria, search, requested, loaded, lastSearch, waiting } = useSearchLoad(
    initial?.criteria ?? createFdaCriteria(), fdaLoadRequestAllDates, applyFdaSearch, { waitForAsOfDate: false });
  const [fdaResultDetailLevel, setDetailLevelState] = useState<FdaResultDetailLevel>(initial?.detailLevel ?? "product");

  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>({ type: "include", ids: new Set() });

  // Product rows are keyed by product NDC and package rows by package NDC, so a selection
  // from one level means nothing at the other. Clearing here covers every way the level changes.
  const setFdaResultDetailLevel = useCallback((level: FdaResultDetailLevel) => {
    if (level === fdaResultDetailLevel) return;
    setDetailLevelState(level);
    setSelectedRows({ type: "include", ids: new Set() });
  }, [fdaResultDetailLevel]);

  return (
    <FdaSearchContext.Provider value={{
      criteria,
      setCriteria,
      search,
      requested,
      loaded,
      lastSearch,
      waiting,
      fdaResultDetailLevel,
      setFdaResultDetailLevel,
      selectedRows,
      setSelectedRows,
      searchEnabled,
    }}>
      {children}
    </FdaSearchContext.Provider>
  );
};

export const useFdaSearchContext = () => {
  return useContext(FdaSearchContext);
};
