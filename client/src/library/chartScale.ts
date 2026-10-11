import { MAX_AXIS_EXAGGERATION } from "./constants";

/*
 * Axis scales and tick labels for the charts. Kept out of the components so the rules are
 * testable and both chart types share them.
 */

export type Axis = { domain: [number, number], ticks: number[] };

/** A round step (1, 2, 2.5 or 5 × 10^n) close to `roughStep`, for even tick spacing. */
export function niceStep(roughStep: number): number {
  if (roughStep <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const fraction = roughStep / magnitude;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * magnitude;
}

/** Ticks at every multiple of `step` from `lo` to `hi`, both of which are multiples of it. */
function ticksBetween(lo: number, hi: number, step: number): number[] {
  const ticks: number[] = [];
  // Index-based, so float steps (0.05) don't accumulate error.
  for (let i = 0, n = Math.round((hi - lo) / step); i <= n; i++) ticks.push(Number((lo + i * step).toPrecision(12)));
  return ticks;
}

/** An axis from 0 to just above `max`, on round ticks. Bar lengths must start at 0. */
export function zeroBasedAxis(max: number, targetTicks = 5): Axis {
  if (max <= 0) return { domain: [0, 1], ticks: [0, 1] };
  const step = niceStep(max / (targetTicks - 1));
  const hi = Math.max(step, Math.ceil(max / step) * step);
  return { domain: [0, hi], ticks: ticksBetween(0, hi, step) };
}

/**
 * A price axis fitted to the data, but never so tight that it exaggerates a change more than
 * `maxExaggeration` times.
 *
 * Exaggeration is the share of the axis a change fills divided by the change's relative size. A
 * $0-based axis is about 1: a 10% change fills about 10% of the chart. The visible span must
 * be at least `max / maxExaggeration`, which bounds every change at or below `max`: with the
 * default of 4, a 10% change fills at most 40% of the chart. Wider data keeps its own range.
 * The span is centered on the data, never goes below $0 (an axis that would reach it simply
 * starts there), and ends on round ticks, which only widens it.
 *
 * @param min - lowest price shown
 * @param max - highest price shown
 */
export function fittedPriceAxis(min: number, max: number, maxExaggeration = MAX_AXIS_EXAGGERATION, targetTicks = 5): Axis {
  if (max <= 0) return zeroBasedAxis(0, targetTicks);

  const minSpan = max / maxExaggeration;
  let lo = min;
  let hi = max;
  if (hi - lo < minSpan) {
    const center = (lo + hi) / 2;
    lo = center - minSpan / 2;
    hi = center + minSpan / 2;
  }
  if (lo <= 0) return zeroBasedAxis(Math.max(hi, minSpan), targetTicks);

  const step = niceStep((hi - lo) / (targetTicks - 1));
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  return { domain: [lo, hi], ticks: ticksBetween(lo, hi, step) };
}

/** Decimals needed to write `step` exactly: 0.25 → 2, 0.5 → 1, 5 → 0. */
function decimalsFor(step: number): number {
  for (let decimals = 0; decimals < 6; decimals++) {
    const scaled = step * 10 ** decimals;
    if (Math.abs(scaled - Math.round(scaled)) < 1e-6) return decimals;
  }
  return 6;
}

/**
 * Formats axis ticks with just the precision their spacing needs: "$3.25K" on a $250 step,
 * "$9.50" on a $0.50 step, "$7.50" on a $2.50 step, "$0.135" on a $0.005 step, "$5" on whole dollars.
 */
export function priceTickFormatter(ticks: number[]): (value: number) => string {
  const step = ticks.length > 1 ? ticks[1] - ticks[0] : Math.abs(ticks[0] ?? 1) || 1;
  const top = Math.max(...ticks.map(Math.abs), 0);
  if (top >= 1000 && step >= 100) {
    const decimals = decimalsFor(step / 1000);
    return (value) => value === 0 ? "$0" : `$${(value / 1000).toFixed(decimals)}K`;
  }
  // Whole-dollar steps need no cents; any other step (0.5, 2.5) shows cents so no tick rounds.
  const decimals = decimalsFor(step) === 0 ? 0 : Math.max(2, decimalsFor(step));
  return (value) => `$${value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

/** A price in full: "$3,412.18", or up to 4 decimals under $1 so "$0.0123" doesn't read "$0.01". */
export const formatPrice = (value: number) =>
  value.toLocaleString("en-US", {
    style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: Math.abs(value) < 1 ? 4 : 2,
  });

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MONTH_STRIDES = [1, 2, 3, 6, 12, 24];
const WEEK_STRIDES = [1, 2];

export type DateTicks = { ticks: number[], format: (time: number) => string };

const utc = (options: Intl.DateTimeFormatOptions) => (time: number) =>
  new Date(time).toLocaleDateString("en-US", { timeZone: "UTC", ...options });

/**
 * Date-axis ticks on calendar boundaries: month starts for spans over about ten weeks (labeled
 * "Jan '24", or just "2024" once ticks are a year apart), weeks otherwise ("Jan 13"). At most
 * `maxTicks`.
 */
export function dateTicks(start: number, end: number, maxTicks: number): DateTicks {
  const spanDays = (end - start) / MS_PER_DAY;
  if (spanDays <= 70) {
    const stride = WEEK_STRIDES.find(weeks => spanDays / (7 * weeks) <= maxTicks) ?? 4;
    const ticks: number[] = [];
    for (let t = start; t <= end; t += stride * 7 * MS_PER_DAY) ticks.push(t);
    return { ticks, format: utc({ month: "short", day: "numeric" }) };
  }

  const spanMonths = spanDays / 30.44;
  const stride = MONTH_STRIDES.find(months => spanMonths / months <= maxTicks) ?? 24;
  // Months counted from year 0, so a stride lines up with the calendar (quarters, years).
  const first = new Date(start);
  const startMonth = first.getUTCFullYear() * 12 + first.getUTCMonth();
  const isMonthStart = start === Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1);
  const ticks: number[] = [];
  for (let m = Math.ceil((isMonthStart ? startMonth : startMonth + 1) / stride) * stride; ; m += stride) {
    const tick = Date.UTC(Math.floor(m / 12), m % 12, 1);
    if (tick > end) break;
    ticks.push(tick);
  }
  const format = stride >= 12
    ? utc({ year: "numeric" })
    : (time: number) => utc({ month: "short" })(time) + " '" + utc({ year: "2-digit" })(time);
  return { ticks, format };
}
