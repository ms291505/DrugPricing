// TODO: Update to be NadacSearchContext!
import React, { createContext, useContext, useEffect, useMemo, useState } from "react"
import type { NadacPrice, LineChart, BarChart, NadacSearchParams } from "../library/types";
import type { GridRowSelectionModel } from "@mui/x-data-grid";

type SearchContextType = {
  data: Array<NadacPrice>;
  setData: React.Dispatch<React.SetStateAction<Array<NadacPrice>>>;
  vizData: Array<NadacPrice>;
  setVizData: React.Dispatch<React.SetStateAction<Array<NadacPrice>>>;
  selectedNdcDescriptions: string[];
  setSelectedNdcDescriptions: React.Dispatch<React.SetStateAction<string[]>>;
  ndcDescriptions: string[];
  charts: Array<LineChart | BarChart>;
  setCharts: React.Dispatch<React.SetStateAction<Array<LineChart | BarChart>>>;
  newChartRows: GridRowSelectionModel;
  setNewChartRows: React.Dispatch<React.SetStateAction<GridRowSelectionModel>>;
  searchParams: NadacSearchParams | null;
  setSearchParams: React.Dispatch<React.SetStateAction<NadacSearchParams | null>>;
}

export const SearchContext = createContext<SearchContextType>({
  data: [],
  setData: () => { },
  vizData: [],
  setVizData: () => { },
  selectedNdcDescriptions: [],
  setSelectedNdcDescriptions: () => { },
  ndcDescriptions: [],
  charts: [],
  setCharts: () => { },
  newChartRows: { type: "include", ids: new Set() },
  setNewChartRows: () => { },
  searchParams: null,
  setSearchParams: () => { },
});

export const SearchContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [data, setData] = useState<Array<NadacPrice>>([]);
  const [vizData, setVizData] = useState<Array<NadacPrice>>([]);
  const [charts, setCharts] = useState<Array<LineChart | BarChart>>([]);
  const [newChartRows, setNewChartRows] = useState<GridRowSelectionModel>({ type: "include", ids: new Set() })
  const [searchParams, setSearchParams] = useState<NadacSearchParams | null>(null);

  const ndcDescriptions: Array<string> = useMemo(
    () => [...new Set(data.map(drug => drug.ndcDescription))],
    [data]
  )

  const [selectedNdcDescriptions, setSelectedNdcDescriptions] = useState(ndcDescriptions);

  // useEffect(() => console.log(data), [data]);

  useEffect(() => {
    console.log(newChartRows);
  }, [newChartRows]);

  useEffect(() => {
    setSelectedNdcDescriptions(ndcDescriptions);
  }, [ndcDescriptions]);

  return (
    <SearchContext.Provider value={{
      data,
      setData,
      vizData,
      setVizData,
      selectedNdcDescriptions,
      setSelectedNdcDescriptions,
      ndcDescriptions,
      charts,
      setCharts,
      newChartRows,
      setNewChartRows,
      setSearchParams,
      searchParams
    }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearchContext = () => {
  return useContext(SearchContext);
};
