/*
 * App-wide preferences saved once for every tab and window (`persist.ts`). Appearance and charts
 * are edited in Settings; column visibility is edited from each results table's Columns tool.
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
export type ColumnVisibilityOverrides = Record<string, boolean>;
export type TableColumnOverrides = Record<ResultTableType, ColumnVisibilityOverrides>;

// MUI's GRID_CHECKBOX_SELECTION_COL_DEF.field; selection is always visible, never a saved choice.
export const RESULT_SELECTION_FIELD = "__check__";
export const DEFAULT_COLUMN_OVERRIDES: TableColumnOverrides = { fdaProduct: {}, fdaPackage: {}, nadac: {} };

// Latest Price Date is hidden: a stale latest price carries a marker with its date instead.
export const DEFAULT_HIDDEN_COLUMNS: Record<ResultTableType, string[]> = {
  fdaProduct: ["latestPriceDate", "minPrice", "maxPrice", "nonProprietaryName", "routeName", "labelerName", "productTypeName", "packageCount"],
  fdaPackage: ["latestPriceDate", "minPrice", "maxPrice", "productNdc", "nonProprietaryName", "samplePackage", "dosageFormName", "routeName", "labelerName", "productTypeName"],
  nadac: ["latestPriceDate", "minPrice", "maxPrice"],
};

/** Missing or malformed tables fall back independently; invalid fields don't cost valid choices. */
export function readColumnOverrides(raw: unknown): TableColumnOverrides {
  const saved = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const read = (table: ResultTableType): ColumnVisibilityOverrides => {
    const fields = saved[table];
    return fields && typeof fields === "object" && !Array.isArray(fields)
      ? Object.fromEntries(Object.entries(fields).filter(([field, visible]) => field !== RESULT_SELECTION_FIELD && typeof visible === "boolean"))
      : {};
  };
  return { fdaProduct: read("fdaProduct"), fdaPackage: read("fdaPackage"), nadac: read("nadac") };
}

/** Merge current defaults with deliberate choices, leaving new defaults free to evolve. */
export function columnVisibilityModel(hiddenDefaults: string[], overrides: ColumnVisibilityOverrides): Record<string, boolean> {
  return { ...Object.fromEntries(hiddenDefaults.map(field => [field, false])), ...overrides };
}

/** MUI omits visible fields from its model. Save only deviations from today's defaults. */
export function columnOverridesFromModel(hiddenDefaults: string[], model: Record<string, boolean>): ColumnVisibilityOverrides {
  const hidden = new Set(hiddenDefaults);
  const fields = new Set([...hiddenDefaults, ...Object.keys(model)]);
  return Object.fromEntries([...fields]
    .filter(field => {
      const visible = model[field] !== false;
      const defaultVisible = !hidden.has(field);
      return field !== RESULT_SELECTION_FIELD && visible !== defaultVisible;
    })
    .map(field => [field, model[field] !== false]));
}

export type AppSettings = {
  barStyle: BarStyle,
  colorMode: ColorMode,
  /** Turning on Line or Bar above the results also pins a copy of what it charts. */
  autoPinCharts: boolean,
  columnOverrides: TableColumnOverrides,
};

export const DEFAULT_SETTINGS: AppSettings = {
  barStyle: "dot",
  colorMode: "dark",
  autoPinCharts: false,
  columnOverrides: DEFAULT_COLUMN_OVERRIDES,
};
