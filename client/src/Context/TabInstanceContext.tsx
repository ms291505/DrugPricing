import React, { createContext, useContext, useMemo } from "react";

type TabInstanceContextType = {
  id: string;
}

export const TabInstanceContext = createContext<TabInstanceContextType>({ id: "" });

export const TabInstanceContextProvider = ({ id, children }: { id: string, children: React.ReactNode }) => {
  const value = useMemo(() => ({ id }), [id]);
  return (
    <TabInstanceContext.Provider value={value}>
      {children}
    </TabInstanceContext.Provider>
  )
}

export const useTabInstanceContext = () => {
  return useContext(TabInstanceContext);
}
