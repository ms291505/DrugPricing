import { createContext, type ReactNode, type Dispatch, type SetStateAction, useState, useContext } from "react";

export type GlobalModal = "settings" | "about" | "onboarding" | "help";

type GlobalModalContextType = {
  globalModal: GlobalModal | null;
  setGlobalModal: Dispatch<SetStateAction<GlobalModal | null>>;
}

export const GlobalModalContext = createContext<GlobalModalContextType>({
  globalModal: null,
  setGlobalModal: () => { },
})

export const GlobalModalContextProvider = ({ children }: { children: ReactNode }) => {
  const [globalModal, setGlobalModal] = useState<GlobalModal | null>(null);

  return (
    <GlobalModalContext.Provider value={{
      globalModal,
      setGlobalModal,
    }}>
      {children}
    </GlobalModalContext.Provider>
  )
}

export const useGlobalModalContext = () => {
  return useContext(GlobalModalContext);
}
