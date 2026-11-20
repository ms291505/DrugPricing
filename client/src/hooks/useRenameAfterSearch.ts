import { useWorkspaceActions, useWorkspaceTab } from "../Context/workspaceContexts";
import { useTabInstanceContext } from "../Context/TabInstanceContext";
import { titleAfterClear, titleFollowsSearch } from "../library/tabType";

/**
 * Names a search tab after each search while its title follows its search (`titleFollowsSearch`:
 * the default, or the title the previous search gave it), so a name the user chose stays. Only
 * search panels call it: it reads the tab list, which changes on every tab change. Standalone
 * pages aren't tabs, so it does nothing there.
 *
 * @returns a function to call on Search with the tab's new title (null: keep the title) and the
 * title the search on screen gave it (null without one)
 */
export default function useRenameAfterSearch() {
  const { renameTab } = useWorkspaceActions();
  const { id } = useTabInstanceContext();
  const tab = useWorkspaceTab(id);
  return (title: string | null, previousTitle: string | null) => {
    if (tab && title && title !== tab.title && titleFollowsSearch(tab, previousTitle)) renameTab(id, title);
  };
}

/**
 * Gives a search tab back its default title on Clear search while its title follows the search
 * (`titleAfterClear`). Standalone pages aren't tabs, so it does nothing there.
 *
 * @returns a function to call on Clear search with the title the cleared search gave the tab
 */
export function useRestoreTitleAfterClear() {
  const { renameTab } = useWorkspaceActions();
  const { id } = useTabInstanceContext();
  const tab = useWorkspaceTab(id);
  return (searchTitle: string | null) => {
    if (!tab) return;
    const title = titleAfterClear(tab, searchTitle);
    if (title !== tab.title) renameTab(id, title);
  };
}
