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

export function validateTabTitle(newTitle: string, oldTitle?: string) {
  let isValid = true;

  if (newTitle.trim() === "") isValid = false;

  if (oldTitle && newTitle.trim() === oldTitle) isValid = false;

  return isValid;
}
