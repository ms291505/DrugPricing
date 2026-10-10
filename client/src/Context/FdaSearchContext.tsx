import React, { createContext, useCallback, useContext, useState, type Dispatch, type SetStateAction } from "react";
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
}

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
});


export const FdaSearchContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [fdaData, setFdaData] = useState<Array<FdaProductDetail>>([]);
  const [fdaSearchParams, setFdaSearchParams] = useState<AdvancedFdaSearchParams | null>(null)
  const [fdaResultFilter, setFdaResultFilter] = useState<FdaResultFilter>({ ...createFdaResultFilter() });
  const [fdaResultDetailLevel, setDetailLevelState] = useState<FdaResultDetailLevel>("product");
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
    }}>
      {children}
    </FdaSearchContext.Provider>
  );
};

export const useFdaSearchContext = () => {
  return useContext(FdaSearchContext);
};
