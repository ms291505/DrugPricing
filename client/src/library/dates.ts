import type { ChartPrice } from "./types";

/*
 * NADAC dates are calendar days. The API sends them as "YYYY-MM-DD", which `new Date` reads as
 * UTC midnight, so everything here works in UTC: date inputs convert with `fromDateInput` /
 * `toDateInput`, and labels format with `timeZone: "UTC"`. Formatting in local time would show
 * the day before in the Americas.
 */

/**
 * The dates a chart shows, as ms since epoch, both ends inclusive. A null end is open: the chart
 * runs to its first or last price. The window is a view setting; the data behind it is kept whole.
 */
export type DateWindow = { start: number | null, end: number | null };

/** A window with both ends set. */
export type ClosedDateWindow = { start: number, end: number };

export const FULL_WINDOW: DateWindow = { start: null, end: null };

export const isFullWindow = ({ start, end }: DateWindow) => start === null && end === null;

export const inWindow = (time: number, { start, end }: DateWindow) =>
  (start === null || time >= start) && (end === null || time <= end);

/** The prices whose as-of date falls inside the window. */
export function clipToWindow<T extends ChartPrice>(prices: T[], dateWindow: DateWindow): T[] {
  if (isFullWindow(dateWindow)) return prices;
  return prices.filter(price => inWindow(price.asOfDate.getTime(), dateWindow));
}

/** First and last as-of date of the prices, or null when there are none. */
export function dateBounds(prices: ChartPrice[]): { first: number, last: number } | null {
  if (prices.length === 0) return null;
  let first = Infinity;
  let last = -Infinity;
  for (const price of prices) {
    const time = price.asOfDate.getTime();
    if (time < first) first = time;
    if (time > last) last = time;
  }
  return { first, last };
}

/** Moves a date by whole calendar months (UTC), e.g. for a ±3 month window. */
export function addMonths(time: number, months: number): number {
  const date = new Date(time);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.getTime();
}

/** A window from `months` before `start` to `months` after `end`. */
export const windowAround = (start: number, end: number, months: number): ClosedDateWindow =>
  ({ start: addMonths(start, -months), end: addMonths(end, months) });

/** The last `months` months up to `last`. */
export const windowEndingAt = (last: number, months: number): ClosedDateWindow =>
  ({ start: addMonths(last, -months), end: last });

/** "YYYY-MM-DD" for a date input, or "" for an open end. */
export const toDateInput = (time: number | null) => time === null ? "" : new Date(time).toISOString().slice(0, 10);

/** Reads a date input's "YYYY-MM-DD" value; "" (cleared) or an invalid date is an open end. */
export function fromDateInput(value: string): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

/** "Jan 13, 2026" */
export const formatDate = (time: number) =>
  new Date(time).toLocaleDateString(undefined, { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });

/** "1/13/2026", for axis ticks. */
export const formatShortDate = (time: number) =>
  new Date(time).toLocaleDateString(undefined, { timeZone: "UTC" });

/**
 * The window as text, with open ends filled in from the data, e.g. "Oct 14, 2025 – Apr 13, 2026".
 * Returns null when the window is open and there's no data to describe.
 */
export function formatWindow(dateWindow: DateWindow, bounds: { first: number, last: number } | null): string | null {
  const start = dateWindow.start ?? bounds?.first;
  const end = dateWindow.end ?? bounds?.last;
  if (start === undefined || end === undefined) return null;
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/** Subtitle for an auto chart that shows only some dates, e.g. "Jan 13, 2026 onward"; none for all dates. */
export function chartDatesSubtitle({ start, end }: DateWindow): string | undefined {
  if (start !== null && end !== null) return `${formatDate(start)} – ${formatDate(end)}`;
  if (start !== null) return `${formatDate(start)} onward`;
  if (end !== null) return `Through ${formatDate(end)}`;
  return undefined;
}
