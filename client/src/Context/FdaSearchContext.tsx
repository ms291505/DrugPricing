import React, { createContext, useContext, useState, type Dispatch, type SetStateAction } from "react";
import { createFdaResultFilter, type FdaProductDetail, type FdaResultDetailLevel, type FdaResultFilter, type FdaSearchParams } from "../types";


export type FdaSearchContextType = {
  fdaData: Array<FdaProductDetail>;
  setFdaData: Dispatch<SetStateAction<Array<FdaProductDetail>>>;
  fdaSearchParams: FdaSearchParams | null;
  setFdaSearchParams: Dispatch<SetStateAction<FdaSearchParams | null>>;
  fdaResultFilter: FdaResultFilter;
  setFdaResultFilter: Dispatch<SetStateAction<FdaResultFilter>>;
  fdaResultDetailLevel: FdaResultDetailLevel
  setFdaResultDetailLevel: Dispatch<SetStateAction<FdaResultDetailLevel>>;
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
});


export const FdaSearchContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [fdaData, setFdaData] = useState<Array<FdaProductDetail>>([]);
  const [fdaSearchParams, setFdaSearchParams] = useState<FdaSearchParams | null>(null)
  const [fdaResultFilter, setFdaResultFilter] = useState<FdaResultFilter>({ ...createFdaResultFilter() });
  const [fdaResultDetailLevel, setFdaResultDetailLevel] = useState<FdaResultDetailLevel>("product");

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
    }}>
      {children}
    </FdaSearchContext.Provider>
  );
};

export const useFdaSearchContext = () => {
  return useContext(FdaSearchContext);
};
