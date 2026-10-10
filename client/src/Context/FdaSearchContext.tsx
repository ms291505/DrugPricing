import React, { createContext, useCallback, useContext, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { createFdaResultFilter, defaultAdvFdaSearchParams, type AdvancedFdaSearchParams, type FdaProductDetail, type FdaResultDetailLevel, type FdaResultFilter, } from "../library/types";
import type { GridRowSelectionModel } from "@mui/x-data-grid";

export type FdaSearchContextType = {
  fdaData: Array<FdaProductDetail>;
  setFdaData: Dispatch<SetStateAction<Array<FdaProductDetail>>>;
  fdaSearchParams: AdvancedFdaSearchParams | null;
  setFdaSearchParams: Dispatch<SetStateAction<AdvancedFdaSearchParams | null>>;
  fdaResultFilter: FdaResultFilter;
  setFdaResultFilter: Dispatch<SetStateAction<FdaResultFilter>>;
  fdaResultDetailLevel: FdaResultDetailLevel
  /** Also clears `selectedRows`, whose ids mean different things at each level. */
  setFdaResultDetailLevel: (level: FdaResultDetailLevel) => void;
  selectedRows: GridRowSelectionModel;
  setSelectedRows: Dispatch<SetStateAction<GridRowSelectionModel>>;
  /**
   * True once, for the first results of a search restored from storage: that search's saved
   * result filter must survive the reset to "all options" that new results normally get.
   */
  keepRestoredFilter: (searchParams: AdvancedFdaSearchParams | null) => boolean;
}

export type FdaSearchInitialState = {
  searchParams: AdvancedFdaSearchParams | null,
  resultFilter: FdaResultFilter,
  detailLevel: FdaResultDetailLevel,
};

export const FdaSearchContext = createContext<FdaSearchContextType>({
  fdaData: [],
  setFdaData: () => { },
  fdaSearchParams: { ...defaultAdvFdaSearchParams },
  setFdaSearchParams: () => { },
  fdaResultFilter: { ...createFdaResultFilter() },
  setFdaResultFilter: () => { },
  fdaResultDetailLevel: "product",
  setFdaResultDetailLevel: () => { },
  selectedRows: { type: "include", ids: new Set() },
  setSelectedRows: () => { },
  keepRestoredFilter: () => false,
});


type ProviderProps = {
  children: React.ReactNode,
  /** State restored from storage; the search re-runs from `searchParams`. */
  initial?: FdaSearchInitialState,
};

export const FdaSearchContextProvider = ({ children, initial }: ProviderProps) => {
  const [fdaData, setFdaData] = useState<Array<FdaProductDetail>>([]);
  const [fdaSearchParams, setFdaSearchParams] = useState<AdvancedFdaSearchParams | null>(initial?.searchParams ?? null)
  const [fdaResultFilter, setFdaResultFilter] = useState<FdaResultFilter>(initial?.resultFilter ?? { ...createFdaResultFilter() });
  const [fdaResultDetailLevel, setDetailLevelState] = useState<FdaResultDetailLevel>(initial?.detailLevel ?? "product");

  const restoredFilterFor = useRef(initial?.searchParams ? JSON.stringify(initial.searchParams) : null);
  const keepRestoredFilter = useCallback((searchParams: AdvancedFdaSearchParams | null) => {
    const keep = restoredFilterFor.current !== null && restoredFilterFor.current === JSON.stringify(searchParams);
    restoredFilterFor.current = null;
    return keep;
  }, []);
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
      fdaData,
      setFdaData,
      fdaSearchParams,
      setFdaSearchParams,
      fdaResultFilter,
      setFdaResultFilter,
      fdaResultDetailLevel,
      setFdaResultDetailLevel,
      selectedRows,
      setSelectedRows,
      keepRestoredFilter,
    }}>
      {children}
    </FdaSearchContext.Provider>
  );
};

export const useFdaSearchContext = () => {
  return useContext(FdaSearchContext);
};
