export type TabType = "fda" | "nadac" | "new" | "collection";

// Each type's page and provider are in `tabTypeRegistry.ts`; this module imports no components.
const DEFAULT_TITLES: Record<TabType, string> = {
  fda: "New FDA Search",
  nadac: "New NADAC Search",
  new: "New Tab",
  collection: "New Collection",
};

export const defaultTitleFor = (tabType: TabType) => DEFAULT_TITLES[tabType];

export type WorkspaceTab = {
  id: string;
  type: TabType;
  title: string;
}

/**
 * Whether a search tab's title follows its search: it is still its type's default, or the title
 * the search on screen gave it (`searchTitle`; null without one). A name the user chose doesn't.
 */
export function titleFollowsSearch(tab: WorkspaceTab, searchTitle: string | null): boolean {
  return tab.title === defaultTitleFor(tab.type) || (searchTitle !== null && tab.title === searchTitle);
}

/**
 * A search tab's title after Clear search: its type's default again while it follows the search
 * (`titleFollowsSearch`), else unchanged.
 */
export function titleAfterClear(tab: WorkspaceTab, searchTitle: string | null): string {
  return titleFollowsSearch(tab, searchTitle) ? defaultTitleFor(tab.type) : tab.title;
}

export function validateTabTitle(newTitle: string, oldTitle?: string) {
  let isValid = true;

  if (newTitle.trim() === "") isValid = false;

  if (oldTitle && newTitle.trim() === oldTitle) isValid = false;

  return isValid;
}
