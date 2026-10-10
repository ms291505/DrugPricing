import FdaSearch from "../Components/FDA/FdaSearch";
import NadacSearch from "../Components/NadacSearch/NadacSearch";
import TabCreator from "../Components/Workspace/TabCreator";
import { FdaTabProvider, NadacTabProvider } from "../Context/TabProviders";
import type { TabType } from "./types";

export type TabTypeDefinition = {
  Provider: React.ComponentType<{ children: React.ReactNode }>;
  Content: React.ComponentType;
  defaultTitle: string;
}

export const tabTypeRegistry: Record<TabType, TabTypeDefinition> = {
  fda: {
    Provider: FdaTabProvider,
    Content: FdaSearch,
    defaultTitle: "New FDA Search",
  },
  nadac: {
    Provider: NadacTabProvider,
    Content: NadacSearch,
    defaultTitle: "New NADAC Search",
  },
  new: {
    Provider: FdaTabProvider,
    Content: TabCreator,
    defaultTitle: "New Tab",
  }
};

export const defaultTitleFor = (tabType: TabType) => tabTypeRegistry[tabType].defaultTitle;
