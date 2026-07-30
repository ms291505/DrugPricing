import React, { createContext, useContext, useState, type Dispatch, type SetStateAction } from "react";

type TabInstanceContextType = {
  id: string;
  setId: Dispatch<SetStateAction<string>>;
}

export const TabInstanceContext = createContext<TabInstanceContextType>(
  {
    id: "",
    setId: () => { },
  }
);

export const TabInstanceContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [id, setId] = useState("");
  return (
    <TabInstanceContext.Provider value={{
      id,
      setId
    }}
    >
      {children}
    </TabInstanceContext.Provider >
  )

}
export const useTabInstanceContext = () => {
  return useContext(TabInstanceContext);
}
