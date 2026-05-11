import { createContext, useContext, useEffect, useState } from "react";
import type { FdaProductDetail, FdaSearchParams } from "../types";

type FdaSearchContextType = {
  fdaData: Array<FdaProductDetail>;
  setFdaData: React.Dispatch<React.SetStateAction<Array<FdaProductDetail>>>;
  fdaSearchParams: FdaSearchParams | null;
  setFdaSearchParams: React.Dispatch<React.SetStateAction<FdaSearchParams | null>>;
}

export const FdaSearchContext = createContext<FdaSearchContextType>({
  fdaData: [],
  setFdaData: () => { },
  fdaSearchParams: null,
  setFdaSearchParams: () => { },
});


export const FdaSearchContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [fdaData, setFdaData] = useState<Array<FdaProductDetail>>([]);
  const [fdaSearchParams, setFdaSearchParams] = useState<FdaSearchParams | null>(null)

  useEffect(() => {
    console.log(fdaData);
  }, [fdaData])

  return (
    <FdaSearchContext.Provider value={{
      fdaData,
      setFdaData,
      fdaSearchParams,
      setFdaSearchParams,
    }}>
      {children}
    </FdaSearchContext.Provider>
  );
};

export const useFdaSearchContext = () => {
  return useContext(FdaSearchContext);
};
