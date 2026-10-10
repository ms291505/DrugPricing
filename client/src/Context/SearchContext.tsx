// TODO: Update to be NadacSearchContext!
import React, { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { NadacPrice, NadacSearchParams } from "../library/types";
import type { GridRowSelectionModel } from "@mui/x-data-grid";

type SearchContextType = {
  data: Array<NadacPrice>;
  setData: React.Dispatch<React.SetStateAction<Array<NadacPrice>>>;
  /** `data` without the descriptions the Drug page filter excludes. Only Add Chart reads it. */
  vizData: Array<NadacPrice>;
  selectedNdcDescriptions: string[];
  setSelectedNdcDescriptions: (selected: string[]) => void;
  /** What the Drug page filter hides. Stored rather than the selection, so it needs no reset when data loads. */
  excludedNdcDescriptions: string[];
  /** Clears the Drug page filter; a new search starts unfiltered. */
  clearNdcDescriptionFilter: () => void;
  ndcDescriptions: string[];
  newChartRows: GridRowSelectionModel;
  setNewChartRows: React.Dispatch<React.SetStateAction<GridRowSelectionModel>>;
  searchParams: NadacSearchParams | null;
  setSearchParams: React.Dispatch<React.SetStateAction<NadacSearchParams | null>>;
}

export const SearchContext = createContext<SearchContextType>({
  data: [],
  setData: () => { },
  vizData: [],
  selectedNdcDescriptions: [],
  setSelectedNdcDescriptions: () => { },
  excludedNdcDescriptions: [],
  clearNdcDescriptionFilter: () => { },
  ndcDescriptions: [],
  newChartRows: { type: "include", ids: new Set() },
  setNewChartRows: () => { },
  searchParams: null,
  setSearchParams: () => { },
});

export type NadacSearchInitialState = {
  searchParams: NadacSearchParams | null,
  excludedNdcDescriptions: string[],
};

type ProviderProps = {
  children: React.ReactNode,
  /** State restored from storage; the search re-runs from `searchParams`. */
  initial?: NadacSearchInitialState,
};

export const SearchContextProvider = ({ children, initial }: ProviderProps) => {
  const [data, setData] = useState<Array<NadacPrice>>([]);
  const [newChartRows, setNewChartRows] = useState<GridRowSelectionModel>({ type: "include", ids: new Set() })
  const [searchParams, setSearchParams] = useState<NadacSearchParams | null>(initial?.searchParams ?? null);
  const [excludedNdcDescriptions, setExcludedNdcDescriptions] = useState<string[]>(initial?.excludedNdcDescriptions ?? []);

  const ndcDescriptions: Array<string> = useMemo(
    () => [...new Set(data.map(drug => drug.ndcDescription))],
    [data]
  )

  const selectedNdcDescriptions = useMemo(
    () => ndcDescriptions.filter(description => !excludedNdcDescriptions.includes(description)),
    [ndcDescriptions, excludedNdcDescriptions]
  );

  const setSelectedNdcDescriptions = useCallback((selected: string[]) => {
    setExcludedNdcDescriptions(ndcDescriptions.filter(description => !selected.includes(description)));
  }, [ndcDescriptions]);

  const clearNdcDescriptionFilter = useCallback(() => setExcludedNdcDescriptions([]), []);

  const vizData = useMemo(() => {
    if (excludedNdcDescriptions.length === 0) return data;
    const excluded = new Set(excludedNdcDescriptions);
    return data.filter(price => !excluded.has(price.ndcDescription));
  }, [data, excludedNdcDescriptions]);

  return (
    <SearchContext.Provider value={{
      data,
      setData,
      vizData,
      selectedNdcDescriptions,
      setSelectedNdcDescriptions,
      excludedNdcDescriptions,
      clearNdcDescriptionFilter,
      ndcDescriptions,
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
