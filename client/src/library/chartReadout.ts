import { rangeKey, type LineVizRow } from "./createLineVizData";
import { distinctRange, formatPrice } from "./chartScale";
import { formatDate } from "./dates";
import type { BarValue, SeriesSummary } from "./seriesSummary";

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
export function barAnnouncement(row: SeriesSummary, barValue: BarValue, unit: string): string {
  const value = barValue === "latest"
    ? `latest ${formatPrice(row.latest)} on ${formatDate(row.latestDate)}`
    : `average ${formatPrice(row.average)}`;
  return `${row.ndc}: ${value}, range ${formatPrice(row.min)} to ${formatPrice(row.max)}, per ${unit}.`;
}
