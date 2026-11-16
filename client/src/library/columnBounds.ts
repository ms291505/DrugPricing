import type { WidthTier } from "../hooks/useWidthTier";

/** A column's narrowest and widest width in px. The grid sizes it to its content between the two. */
export type Bounds = { min: number, max: number };

/** The `wide` bounds, with changes for the narrower tiers of the table's own width (not the window's). */
type ColumnBounds = Bounds & { medium?: Partial<Bounds>, narrow?: Partial<Bounds> };

/**
 * Every result-table column's bounds, by field (the three tables share fields, so a field has one
 * entry). `min` fits the header label with its sort icon, or a whole identifier (NDCs, tabular
 * digits); `max` is the width of the longest value shown before it ellipsises. Most columns have
 * one pair. Only the long text columns are tiered: they are what a phone has no room for, and what
 * a wide table can show whole. Wide is today's fixed width except where noted.
 */
export const COLUMN_BOUNDS: Readonly<Record<string, ColumnBounds>> = {
  // Brand names are short ("Humira"), so the header sets the minimum.
  proprietaryName: { min: 110, max: 150, narrow: { max: 120 } },
  // The NDC columns keep their fixed width: it fits the complete stored identifier.
  ndcPackageCode: { min: 120, max: 120 },
  productNdc: { min: 120, max: 120 },
  ndc: { min: 120, max: 120 },
  // Latest Price must show on a 375px phone beside the checkbox (44) and NDC (120).
  latestPrice: { min: 125, max: 125 },
  latestPriceDate: { min: 155, max: 155 },
  minPrice: { min: 105, max: 115 },
  maxPrice: { min: 105, max: 115 },
  // Sparkline (56 + 8 gap) and the longest label ("Dropped 43% ($4.17) on Jan 14, 2026"); the label ellipsises.
  priceActivity: { min: 140, max: 360, medium: { max: 300 }, narrow: { max: 240 } },
  strengthNumber: { min: 95, max: 100 },
  // Wide: package descriptions run 60 to 100 characters, so 250 cut nearly all of them.
  packageDescription: { min: 170, max: 320, medium: { max: 250 }, narrow: { max: 180 } },
  // Wide: NADAC descriptions are upper case and the longest passed 350.
  ndcDescription: { min: 115, max: 420, medium: { max: 350 }, narrow: { max: 220 } },
  // Wide: generic names join every ingredient.
  nonProprietaryName: { min: 125, max: 200, medium: { max: 150 }, narrow: { max: 130 } },
  // Wide: labeler names such as "Teva Pharmaceuticals USA, Inc." are about 210px.
  labelerName: { min: 90, max: 200, medium: { max: 150 }, narrow: { max: 120 } },
  samplePackage: { min: 85, max: 85 },
  // Wide: "TABLET: FILM COATED" is about 150px.
  dosageFormName: { min: 70, max: 170, medium: { max: 130 }, narrow: { max: 100 } },
  routeName: { min: 75, max: 100 },
  productTypeName: { min: 95, max: 100 },
  packageCount: { min: 95, max: 100 },
};

/** The bounds of one column in a tier. `max` never falls below `min`. */
export function resolveBounds(bounds: ColumnBounds, tier: WidthTier): Bounds {
  const { min, max } = { ...bounds, ...(tier === "wide" ? undefined : bounds[tier]) };
  return { min, max: Math.max(min, max) };
}

type SizedColumn = { field: string, width?: number, minWidth?: number, maxWidth?: number };

/**
 * The columns with their table-width tier's bounds as `minWidth` and `maxWidth` (and `width`, the
 * size before the grid measures, as the maximum). A column without bounds is returned as it is.
 * A new array resets the grid's dragged widths, so call it only when the tier changes.
 */
export function applyColumnBounds<C extends SizedColumn>(columns: readonly C[], tier: WidthTier, table: Readonly<Record<string, ColumnBounds>> = COLUMN_BOUNDS): C[] {
  return columns.map(column => {
    const bounds = table[column.field];
    if (!bounds) return column;
    const { min, max } = resolveBounds(bounds, tier);
    return { ...column, width: max, minWidth: min, maxWidth: max };
  });
}
