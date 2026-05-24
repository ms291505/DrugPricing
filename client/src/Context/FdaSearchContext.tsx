import React, { createContext, useContext, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { FdaProductDetail, FdaResultFilter, FdaSearchParams } from "../types";


type FdaSearchContextType = {
  fdaData: Array<FdaProductDetail>;
  setFdaData: Dispatch<SetStateAction<Array<FdaProductDetail>>>;
  fdaSearchParams: FdaSearchParams | null;
  setFdaSearchParams: Dispatch<SetStateAction<FdaSearchParams | null>>;
  fdaResultFilter: FdaResultFilter;
  setFdaResultFilter: Dispatch<SetStateAction<FdaResultFilter>>;
}

export const FdaSearchContext = createContext<FdaSearchContextType>({
  fdaData: [],
  setFdaData: () => { },
  fdaSearchParams: null,
  setFdaSearchParams: () => { },
  fdaResultFilter: { dosageForms: [] },
  setFdaResultFilter: () => { },
});


export const FdaSearchContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [fdaData, setFdaData] = useState<Array<FdaProductDetail>>([]);
  const [fdaSearchParams, setFdaSearchParams] = useState<FdaSearchParams | null>(null)
  const [fdaResultFilter, setFdaResultFilter] = useState<FdaResultFilter>({ dosageForms: [] });

  useEffect(() => {
    console.log(fdaData);
  }, [fdaData])

  return (
    <FdaSearchContext.Provider value={{
      fdaData,
      setFdaData,
      fdaSearchParams,
      setFdaSearchParams,
      fdaResultFilter,
      setFdaResultFilter,
    }}>
      {children}
    </FdaSearchContext.Provider>
  );
};

export const useFdaSearchContext = () => {
  return useContext(FdaSearchContext);
};
