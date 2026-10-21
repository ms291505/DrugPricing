import { createContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { ChartItem } from "../library/explorerItems";

export type CollectionContextType = {
  collection: ChartItem[];
  setCollection: Dispatch<SetStateAction<ChartItem[]>>;
}

export const CollectionContext = createContext<CollectionContextType>({
  collection: [],
  setCollection: () => { },
});

type ProviderProps = {
  children: ReactNode,
}

export const CollectionContextProvider = ({ children }: ProviderProps) => {
  const [collection, setCollection] = useState<ChartItem[]>([]);

  return (
    <CollectionContext.Provider value={{
      collection,
      setCollection,
    }}>
      {children}
    </CollectionContext.Provider>
  );
};
