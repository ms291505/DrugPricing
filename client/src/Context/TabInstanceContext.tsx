import React, { createContext, useContext, useState, type Dispatch, type SetStateAction } from "react";
import type { NdcColorMap } from "../library/types";


type TabInstanceContextType = {
  id: string;
  setId: Dispatch<SetStateAction<string>>;
  ndcColorMap: NdcColorMap | null;
  setNdcColorMap: Dispatch<SetStateAction<NdcColorMap | null>>;
}

export const TabInstanceContext = createContext<TabInstanceContextType>(
  {
    id: "",
    setId: () => { },
    ndcColorMap: null,
    setNdcColorMap: () => { },
  }
);

export const TabInstanceContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [id, setId] = useState("");
  const [ndcColorMap, setNdcColorMap] = useState<NdcColorMap | null>(null);
  return (
    <TabInstanceContext.Provider value={{
      id,
      setId,
      ndcColorMap,
      setNdcColorMap,
    }}
    >
      {children}
    </TabInstanceContext.Provider >
  )

}
export const useTabInstanceContext = () => {
  return useContext(TabInstanceContext);
}
