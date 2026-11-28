import type { WidthTier } from "../hooks/useWidthTier";
import { STALE_MARKER_WIDTH } from "./constants";

/**
 * A column's narrowest and widest width in px. Autosizing sizes it to its content between the two;
 * a drag respects only `min`, so a user can widen a column past `max` (`applyColumnBounds`).
 */
export type Bounds = { min: number, max: number };

/** The `wide` bounds, with changes for the narrower tiers of the table's own width (not the window's). */
export type ColumnBounds = Bounds & { medium?: Partial<Bounds>, narrow?: Partial<Bounds> };

/**
 * Every result-table column's bounds, by field (the tables share fields, so a field has one
 * entry; a test checks that every column has one). The grid's autosize already floors a column at
 * its measured header, so `min` is only the content floor (what dragging and the size before the
 * first measure respect), and `max` is the widest real content or the unsorted header, whichever is
 * wider, on wide and medium. On narrow `max` may sit below the header: the title ellipsises and the
 * grid shows it whole in a tooltip. Only the long text columns are tiered; most have one pair.
 */
export const COLUMN_BOUNDS: Readonly<Record<string, ColumnBounds>> = {
  proprietaryName: { min: 70, max: 150, narrow: { max: 120 } },
  // Fixed: wide enough for the complete stored identifier (tabular digits).
  ndcPackageCode: { min: 120, max: 120 },
  productNdc: { min: 120, max: 120 },
  ndc: { min: 120, max: 120 },
  // The widest price ("$1,234.56/each") plus the stale marker; a phone shows it beside the checkbox and NDC.
  latestPrice: { min: 90, max: 125 + STALE_MARKER_WIDTH },
  latestPriceDate: { min: 110, max: 165, narrow: { max: 135 } },
  minPrice: { min: 85, max: 130 },
  maxPrice: { min: 85, max: 130 },
  // Sparkline (56 + 8 gap) and the longest label ("Dropped 43% ($4.17) on Jan 14, 2026"), which ellipsises.
  priceActivity: { min: 125, max: 340, medium: { max: 300 }, narrow: { max: 240 } },
  strengthNumber: { min: 70, max: 150, narrow: { max: 110 } },
  // Descriptions run 60 to 100 characters, so even wide ellipsises the longest.
  packageDescription: { min: 120, max: 320, medium: { max: 250 }, narrow: { max: 180 } },
  ndcDescription: { min: 100, max: 420, medium: { max: 350 }, narrow: { max: 220 } },
  // Generic names join every ingredient; labelers are company names.
  nonProprietaryName: { min: 100, max: 200, medium: { max: 150 }, narrow: { max: 130 } },
  labelerName: { min: 75, max: 200, medium: { max: 150 }, narrow: { max: 120 } },
  samplePackage: { min: 50, max: 75 },
  // "TABLET: FILM COATED" is about 150px.
  dosageFormName: { min: 60, max: 170, medium: { max: 130 }, narrow: { max: 100 } },
  routeName: { min: 60, max: 140, narrow: { max: 120 } },
  productTypeName: { min: 60, max: 90 },
  packageCount: { min: 60, max: 90 },
};

/** The bounds of one column in a tier. `max` never falls below `min`. */
export function resolveBounds(bounds: ColumnBounds, tier: WidthTier): Bounds {
  const { min, max } = { ...bounds, ...(tier === "wide" ? undefined : bounds[tier]) };
  return { min, max: Math.max(min, max) };
}

type SizedColumn = { field: string, width?: number, minWidth?: number, maxWidth?: number };

/**
 * The columns with their table-width tier's `min` as `minWidth`, and `width`, the size before the
 * grid measures, at `max`. They get no `maxWidth`, so a drag can widen a column past `max`, which
 * only autosizing respects (`autosizeMaxWidths`). A column without bounds is returned as it is.
 * A new array resets the grid's dragged widths, so call it only when the tier changes.
 */
export function applyColumnBounds<C extends SizedColumn>(columns: readonly C[], tier: WidthTier, table: Readonly<Record<string, ColumnBounds>> = COLUMN_BOUNDS): C[] {
  return columns.map(column => {
    const bounds = table[column.field];
    if (!bounds) return column;
    const { min, max } = resolveBounds(bounds, tier);
    const { maxWidth: _maxWidth, ...rest } = column;
    return { ...rest, width: max, minWidth: min } as C;
  });
}

/** Each bounded column's `max` in the tier, by field: the widest autosizing makes it. */
export function autosizeMaxWidths(columns: readonly SizedColumn[], tier: WidthTier, table: Readonly<Record<string, ColumnBounds>> = COLUMN_BOUNDS): Record<string, number> {
  return Object.fromEntries(columns.flatMap(({ field }) => table[field] ? [[field, resolveBounds(table[field], tier).max]] : []));
}
