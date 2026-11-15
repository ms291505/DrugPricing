/*
 * App-wide preferences saved once for every tab and window (`persist.ts`). Appearance is edited
 * in Settings; hidden columns are edited from each results table's Columns tool.
 */

/**
 * How bar charts draw each series:
 * - `dot`: a dot at the price on a track from its lowest to highest price (default);
 * - `bar`: a bar from $0 to the price, with a neutral range track under it.
 */
export type BarStyle = "dot" | "bar";

/** The app's color theme (`THEMES` in `theme.ts`). Dark is the app's own; light is MUI's default. */
export type ColorMode = "dark" | "light";

/** Column choices are shared by every instance of the same results table. */
export type ResultTableType = "fdaProduct" | "fdaPackage" | "nadac";
export type HiddenColumns = Record<ResultTableType, string[]>;

export const DEFAULT_HIDDEN_COLUMNS: HiddenColumns = {
  fdaProduct: ["minPrice", "maxPrice", "nonProprietaryName", "routeName", "labelerName", "productTypeName", "packageCount"],
  fdaPackage: ["minPrice", "maxPrice", "productNdc", "nonProprietaryName", "samplePackage", "dosageFormName", "routeName", "labelerName", "productTypeName"],
  nadac: ["minPrice", "maxPrice"],
};

/** Missing or malformed tables fall back independently; one bad field doesn't lose the rest. */
export function readHiddenColumns(raw: unknown): HiddenColumns {
  const saved = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const read = (table: ResultTableType) => Array.isArray(saved[table])
    ? [...new Set((saved[table] as unknown[]).filter((field): field is string => typeof field === "string" && field !== "__check__"))]
    : DEFAULT_HIDDEN_COLUMNS[table];
  return { fdaProduct: read("fdaProduct"), fdaPackage: read("fdaPackage"), nadac: read("nadac") };
}

/** Only hidden fields are stored, so new default columns appear for existing users. */
export function columnVisibilityModel(hidden: string[]): Record<string, boolean> {
  return Object.fromEntries(hidden.map(field => [field, false]));
}

export type AppSettings = {
  barStyle: BarStyle,
  colorMode: ColorMode,
  hiddenColumns: HiddenColumns,
};

export const DEFAULT_SETTINGS: AppSettings = {
  barStyle: "dot",
  colorMode: "dark",
  hiddenColumns: DEFAULT_HIDDEN_COLUMNS,
};
