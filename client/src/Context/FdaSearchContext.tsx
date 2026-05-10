import { createContext, useContext, useState } from "react";
import type { FdaProductDetail } from "../types";

type FdaSearchContextType = {
  fdaData: Array<FdaProductDetail>;
  setFdaData: React.Dispatch<React.SetStateAction<Array<FdaProductDetail>>>;

}

export const FdaSearchContext = createContext<FdaSearchContextType>({
  fdaData: [],
  setFdaData: () => { },
});


export const FdaSearchContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [fdaData, setFdaData] = useState<Array<FdaProductDetail>>([]);

  return (
    <FdaSearchContext.Provider value={{
      fdaData,
      setFdaData,
    }}>
      {children}
    </FdaSearchContext.Provider>
  );
};

export const useFdaSearchContext = () => {
  return useContext(FdaSearchContext);
};
