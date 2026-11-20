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
 * A search tab's title after Clear search: its type's default again while it still has the title
 * its search gave it (`searchTitle`), else unchanged, so a name the user chose stays.
 */
export function titleAfterClear(tab: WorkspaceTab, searchTitle: string | null): string {
  return searchTitle !== null && tab.title === searchTitle ? defaultTitleFor(tab.type) : tab.title;
}

export function validateTabTitle(newTitle: string, oldTitle?: string) {
  let isValid = true;

  if (newTitle.trim() === "") isValid = false;

  if (oldTitle && newTitle.trim() === oldTitle) isValid = false;

  return isValid;
}
