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

/**
 * The height a line chart's docked readout reserves for its series, so moving between dates (some
 * with fewer prices) doesn't move the chart under the pointer. Rows are taller on wider screens,
 * where they also show each series' description.
 */
export function lineReadoutHeight(seriesCount: number, compact: boolean): number {
  const header = 24, padding = 12;
  const row = compact ? 22 : 40;
  const max = compact ? READOUT_MAX_HEIGHT.compact : READOUT_MAX_HEIGHT.wide;
  return Math.min(max, header + padding + Math.max(seriesCount, 1) * row);
}

/** The data row recharts reports as active (`activeTooltipIndex`, a number or numeric string). */
export function rowAtIndex<Row>(rows: Row[], index: unknown): Row | undefined {
  const i = typeof index === "number" ? index : typeof index === "string" && index !== "" ? Number(index) : NaN;
  return Number.isInteger(i) ? rows[i] : undefined;
}
