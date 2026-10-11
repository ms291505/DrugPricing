/*
 * App-wide preferences, set in the Settings panel (gear in the app bar or the workspace drawer)
 * and saved once for every tab and window (`persist.ts`). They are for choices most people never
 * change, which shouldn't crowd Page Tools.
 */

/**
 * How bar charts draw each series:
 * - `dot`: a dot at the price on a track from its lowest to highest price (default);
 * - `bar`: a bar from $0 to the price, with a neutral range track under it.
 */
export type BarStyle = "dot" | "bar";

export type AppSettings = {
  barStyle: BarStyle,
};

export const DEFAULT_SETTINGS: AppSettings = {
  barStyle: "dot",
};
