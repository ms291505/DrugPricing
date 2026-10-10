import FdaSearch from "../Components/FDA/FdaSearch";
import NadacSearch from "../Components/NadacSearch/NadacSearch";
import TabCreator from "../Components/Workspace/TabCreator";
import { BlankTabProvider, FdaTabProvider, NadacTabProvider } from "../Context/TabProviders";
import type { TabType } from "./types";

export type TabTypeDefinition = {
  /**
   * Wraps the tab's content. `tabId` keys the tab's saved state; `active` is false until the
   * tab has been shown, and holds back its search until then.
   */
  Provider: React.ComponentType<{ children: React.ReactNode, tabId: string, active?: boolean }>;
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
    Provider: BlankTabProvider,
    Content: TabCreator,
    defaultTitle: "New Tab",
  }
};

export const defaultTitleFor = (tabType: TabType) => tabTypeRegistry[tabType].defaultTitle;
