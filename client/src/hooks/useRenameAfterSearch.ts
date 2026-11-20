import { useWorkspaceActions, useWorkspaceTab } from "../Context/workspaceContexts";
import { useTabInstanceContext } from "../Context/TabInstanceContext";
import { defaultTitleFor, titleAfterClear } from "../library/tabType";

/**
 * Names a search tab after its search while it has its default title, so a name the user chose
 * stays. Only search panels call it: it reads the tab list, which changes on every tab change.
 *
 * @returns a function to call on Search with the tab's new title (null: keep the title)
 */
export default function useRenameAfterSearch() {
  const { renameTab } = useWorkspaceActions();
  const { id } = useTabInstanceContext();
  const tab = useWorkspaceTab(id);
  const canRename = tab ? tab.title === defaultTitleFor(tab.type) : false;
  return (title: string | null) => {
    if (canRename && title) renameTab(id, title);
  };
}

/**
 * Gives a search tab back its default title on Clear search while it still has the title its
 * search gave it (`titleAfterClear`). Standalone pages aren't tabs, so it does nothing there.
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
