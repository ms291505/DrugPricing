import React, { createContext, useContext, useState, type Dispatch, type SetStateAction } from "react";
import { createFdaResultFilter, type AdvancedFdaSearchParams, type BarChart, type FdaProductDetail, type FdaResultDetailLevel, type FdaResultFilter, type LineChart, } from "../library/types";
import type { GridRowSelectionModel } from "@mui/x-data-grid";


export type FdaSearchContextType = {
  fdaData: Array<FdaProductDetail>;
  setFdaData: Dispatch<SetStateAction<Array<FdaProductDetail>>>;
  fdaSearchParams: AdvancedFdaSearchParams | null;
  setFdaSearchParams: Dispatch<SetStateAction<AdvancedFdaSearchParams | null>>;
  fdaResultFilter: FdaResultFilter;
  setFdaResultFilter: Dispatch<SetStateAction<FdaResultFilter>>;
  fdaResultDetailLevel: FdaResultDetailLevel
  setFdaResultDetailLevel: Dispatch<SetStateAction<FdaResultDetailLevel>>;
  selectedRows: GridRowSelectionModel;
  setSelectedRows: Dispatch<SetStateAction<GridRowSelectionModel>>;
  charts: Array<LineChart | BarChart>;
  setCharts: Dispatch<SetStateAction<Array<LineChart | BarChart>>>;
}

export const FdaSearchContext = createContext<FdaSearchContextType>({
  fdaData: [],
  setFdaData: () => { },
  fdaSearchParams: null,
  setFdaSearchParams: () => { },
  fdaResultFilter: { ...createFdaResultFilter() },
  setFdaResultFilter: () => { },
  fdaResultDetailLevel: "product",
  setFdaResultDetailLevel: () => { },
  selectedRows: { type: "include", ids: new Set() },
  setSelectedRows: () => { },
  charts: [],
  setCharts: () => { },
});


export const FdaSearchContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [fdaData, setFdaData] = useState<Array<FdaProductDetail>>([]);
  const [fdaSearchParams, setFdaSearchParams] = useState<AdvancedFdaSearchParams | null>(null)
  const [fdaResultFilter, setFdaResultFilter] = useState<FdaResultFilter>({ ...createFdaResultFilter() });
  const [fdaResultDetailLevel, setFdaResultDetailLevel] = useState<FdaResultDetailLevel>("product");
  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>({ type: "include", ids: new Set() });
  const [charts, setCharts] = useState<Array<LineChart | BarChart>>([]);

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
      charts,
      setCharts,
    }}>
      {children}
    </FdaSearchContext.Provider>
  );
};

export const useFdaSearchContext = () => {
  return useContext(FdaSearchContext);
};
