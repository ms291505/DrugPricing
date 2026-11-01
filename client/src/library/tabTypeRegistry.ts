import Collection from "../Components/Collection";
import FdaSearch from "../Components/FdaSearch";
import NadacSearch from "../Components/NadacSearch";
import TabCreator from "../Components/TabCreator";
import { BlankTabProvider, CollectionTabProvider, FdaTabProvider, NadacTabProvider } from "../Context/TabProviders";
import type { TabType } from "./tabType";

// Kept apart from `tabType.ts` because it imports the pages, which import the workspace context,
// which imports `tabType.ts`. Only `TabInstance` reads it; anything else that needs a tab's type
// or default title imports `tabType.ts`, which imports no components. A cycle through here made
// hot updates fail ("Cannot access 'FdaTabProvider' before initialization").

export type TabTypeDefinition = {
  /**
   * Wraps the tab's content. `tabId` keys the tab's saved state; `active` is false until the
   * tab has been shown, and holds back its search until then.
   */
  Provider: React.ComponentType<{ children: React.ReactNode, tabId: string, active?: boolean }>;
  Content: React.ComponentType;
}

export const tabTypeRegistry: Record<TabType, TabTypeDefinition> = {
  fda: { Provider: FdaTabProvider, Content: FdaSearch },
  nadac: { Provider: NadacTabProvider, Content: NadacSearch },
  new: { Provider: BlankTabProvider, Content: TabCreator },
  collection: { Provider: CollectionTabProvider, Content: Collection },
};
