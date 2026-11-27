import { rangeKey, type LineVizRow } from "./createLineVizData";
import { distinctRange, formatPrice } from "./chartScale";
import { formatDate } from "./dates";
import type { BarValue } from "./explorerItems";
import type { PriceSummary } from "./prices";

/*
 * What a chart says about its active point: the tooltip draws it, and the screen-reader readout
 * speaks it. Both build from these, so the two never disagree.
 */

export type TooltipRow = {
  ndc: string,
  price: number,
  /** The packages' range when a product averages several that differ at the precision shown. */
  range: [number, number] | null,
};

/** The shown series priced on one date, highest first. */
export function tooltipRows(row: LineVizRow, shownNdcs: string[]): TooltipRow[] {
  return shownNdcs
    .flatMap(ndc => {
      const price = row[ndc];
      if (typeof price !== "number") return [];
      return [{ ndc, price, range: distinctRange(row[rangeKey(ndc)] as [number, number] | undefined) ?? null }];
    })
    .sort((a, b) => b.price - a.price);
}

/** "Jan 13, 2026, per each: 0003-0894 $5.53; 0074-0124 $6,741.08, packages $6,736.72 to $6,745.43." */
export function lineAnnouncement(date: number, unit: string, rows: TooltipRow[]): string {
  const items = rows.map(({ ndc, price, range }) =>
    `${ndc} ${formatPrice(price)}${range ? `, packages ${formatPrice(range[0])} to ${formatPrice(range[1])}` : ""}`);
  return `${formatDate(date)}, per ${unit}: ${items.join("; ")}.`;
}

/** "0074-0124: latest $6,745.00 on Oct 7, 2026, range $6,500.00 to $6,745.00, per each." */
export function barAnnouncement(row: PriceSummary, barValue: BarValue, unit: string): string {
  const value = barValue === "latest"
    ? `latest ${formatPrice(row.latest)} on ${formatDate(row.latestDate)}`
    : `average ${formatPrice(row.average)}`;
  return `${row.ndc}: ${value}, range ${formatPrice(row.min)} to ${formatPrice(row.max)}, per ${unit}.`;
}

/** The docked readout's height limit: past it, the readout scrolls. Smaller on a phone. */
export const READOUT_MAX_HEIGHT = { wide: 200, compact: 132 };

// The docked readout's box model, in px: its padding and border, the header, the gap after the
// header and between rows, and the rows' lines (body2 20 px, caption 20 px).
const DOCK_FRAME = 12 + 2;
const HEADER = 24;
const GAP = 4;
export const READOUT_LINE_HEIGHT_PX = 20;
/** The height of one text line in a readout, px. */

/**
 * The height a line chart's docked readout reserves for its series, so moving between dates (some
 * with fewer prices) doesn't move the chart under the pointer. On wider screens each row also
 * shows its description, and a third line for an averaged product's package range. Each of those
 * lines is a single ellipsised line, so a row is never taller than reserved.
 *
 * @param rangeCount - the series that are averaged products (they can show a range line)
 */
export function lineReadoutHeight(seriesCount: number, compact: boolean, rangeCount = 0): number {
  const rows = Math.max(seriesCount, 1);
  const row = compact ? 22 : 2 * READOUT_LINE_HEIGHT_PX;
  const ranges = compact ? 0 : Math.min(rangeCount, rows) * READOUT_LINE_HEIGHT_PX;
  const max = compact ? READOUT_MAX_HEIGHT.compact : READOUT_MAX_HEIGHT.wide;
  return Math.min(max, DOCK_FRAME + HEADER + GAP + rows * row + (rows - 1) * GAP + ranges);
}

/** Lines a bar readout's description may take before it is clamped with an ellipsis. */
export const BAR_DESCRIPTION_LINES = 2;

/**
 * The height a bar chart's docked readout reserves: one row in full. On wider screens that is its
 * description (always reserved at `BAR_DESCRIPTION_LINES` lines, which it is clamped to, so a
 * short or a long description gives the same height), the value and range line, and "Average of N
 * packages" when a row averages a product's packages. On a phone it is the value and the range on
 * lines of their own, since together they wrap at some prices. Every line is a single ellipsised
 * line except the clamped description, so none can add height.
 */
export function barReadoutHeight(compact: boolean, averagesPackages: boolean): number {
  // Elements stacked under the header (gaps go between them) and their total text lines.
  const elements = compact ? 2 : averagesPackages ? 3 : 2;
  const lines = compact ? 2 : BAR_DESCRIPTION_LINES + (averagesPackages ? 2 : 1);
  return DOCK_FRAME + HEADER + GAP + lines * READOUT_LINE_HEIGHT_PX + (elements - 1) * GAP;
}

/** The data row recharts reports as active (`activeTooltipIndex`, a number or numeric string). */
export function rowAtIndex<Row>(rows: Row[], index: unknown): Row | undefined {
  const i = typeof index === "number" ? index : typeof index === "string" && index !== "" ? Number(index) : NaN;
  return Number.isInteger(i) ? rows[i] : undefined;
}
