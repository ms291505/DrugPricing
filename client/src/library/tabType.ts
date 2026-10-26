import Collection from "../Components/Collection";
import FdaSearch from "../Components/FdaSearch";
import NadacSearch from "../Components/NadacSearch";
import TabCreator from "../Components/TabCreator";
import { BlankTabProvider, CollectionTabProvider, FdaTabProvider, NadacTabProvider } from "../Context/TabProviders";

export type TabType = "fda" | "nadac" | "new" | "collection";

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
  },
  collection: {
    Provider: CollectionTabProvider,
    Content: Collection,
    defaultTitle: "New Collection",
  },
};

export const defaultTitleFor = (tabType: TabType) => tabTypeRegistry[tabType].defaultTitle;

export type WorkspaceTab = {
  id: string;
  type: TabType;
  title: string;
}

export function validateTabTitle(newTitle: string, oldTitle?: string) {
  let isValid = true;

  if (newTitle.trim() === "") isValid = false;

  if (oldTitle && newTitle.trim() === oldTitle) isValid = false;

  return isValid;
}
