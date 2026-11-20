import { formatDate } from "./dates";
import { fittedPriceAxis, formatPrice } from "./chartScale";
import { flagPriceChanges, type PackagePrices } from "./flagNadacPriceChange";
import { pricingUnitLabel, seriesByDate, splitByPricingUnit } from "./prices";
import { NOTABLE_PRICE_CHANGE_PERCENT, PRICE_CHANGE_SCAN_MIN_PERCENT } from "./constants";
import type { ChartPrice, NadacPriceChange } from "./types";
import type { SeriesKind } from "./explorerItems";

export const PRICE_ACTIVITY_BAND = 0.05;
export const PRICE_CHANGE_GROUP_LIMIT = 5;
/** Package rows a group's listing shows before Show all: one product can have dozens of packages. */
export const PRICE_CHANGE_PACKAGE_LIMIT = 8;
const WEEK = 7 * 24 * 60 * 60 * 1000;
const percent = (value: number) => `${Number((Math.abs(value) * 100).toFixed(1))}%`;
const inBand = (value: number) => Math.round(Math.abs(value) * 1000) / 1000 < PRICE_ACTIVITY_BAND;

export type PriceEvent = {
  seriesNdc: string,
  packageNdc: string,
  pricingUnit: string,
  change: NadacPriceChange,
};
export type PriceEventGroup = {
  key: string,
  date: number,
  pricingUnit: string,
  direction: "rise" | "drop",
  events: PriceEvent[],
};

/**
 * Package changes of at least `thresholdPercent`. Compare packages, never product averages.
 * Legacy product pins lack package identity.
 */
export function derivePriceEvents(prices: ChartPrice[], kind: SeriesKind, thresholdPercent = NOTABLE_PRICE_CHANGE_PERCENT): PriceEvent[] {
  const packages = new Map<string, { seriesNdc: string, packageNdc: string, prices: ChartPrice[] }>();
  for (const price of prices) {
    if (kind === "product" && !price.packageNdc) continue;
    const packageNdc = price.packageNdc ?? price.ndc;
    const key = JSON.stringify([price.ndc, packageNdc, price.pricingUnit]);
    let pkg = packages.get(key);
    if (!pkg) {
      pkg = { seriesNdc: price.ndc, packageNdc, prices: [] };
      packages.set(key, pkg);
    }
    pkg.prices.push({ ...price, ndc: packageNdc });
  }
  return [...packages.values()].flatMap(pkg => flagPriceChanges([pkg], thresholdPercent).map(({ priceChange }) => ({
    seriesNdc: pkg.seriesNdc, packageNdc: pkg.packageNdc,
    pricingUnit: pkg.prices[0].pricingUnit, change: priceChange,
  })));
}

/** Same publication date, unit and direction; exact package values stay available inside each group. */
export function groupPriceEvents(events: PriceEvent[]): PriceEventGroup[] {
  const groups = new Map<string, PriceEventGroup>();
  for (const event of events) {
    const date = event.change.endDate.getTime();
    const direction = event.change.percentage < 0 ? "drop" : "rise";
    const key = JSON.stringify([date, event.pricingUnit, direction]);
    const group = groups.get(key);
    if (group) group.events.push(event);
    else groups.set(key, { key, date, pricingUnit: event.pricingUnit, direction, events: [event] });
  }
  return [...groups.values()].sort((a, b) => b.date - a.date || a.key.localeCompare(b.key));
}

export function eventDates(change: NadacPriceChange): string {
  return change.endDate.getTime() - change.startDate.getTime() > WEEK
    ? `between ${formatDate(change.startDate.getTime())} and ${formatDate(change.endDate.getTime())}`
    : `on ${formatDate(change.endDate.getTime())}`;
}

/** A change from $0, which has no percent: it is always a rise and meets every threshold. */
const fromZero = (change: NadacPriceChange) => change.oldPrice === 0;

export function priceEventGroupLabel(group: PriceEventGroup): string {
  const count = new Set(group.events.map(e => e.packageNdc)).size;
  // Changes from $0 have no percent, so they stay out of the range.
  const percentages = group.events.filter(e => !fromZero(e.change)).map(e => Math.abs(e.change.percentage) * 100);
  const min = Math.min(...percentages), max = Math.max(...percentages);
  const percentText = !percentages.length ? "from $0"
    : Math.round(min) === Math.round(max) ? `about ${Math.round(max)}%` : `${min.toFixed(1)}–${max.toFixed(1)}%`;
  const start = Math.min(...group.events.map(e => e.change.startDate.getTime()));
  const dates = group.date - start > WEEK
    ? `between ${formatDate(start)} and ${formatDate(group.date)}` : `on ${formatDate(group.date)}`;
  return `${count} ${count === 1 ? "package" : "packages"} ${group.direction === "drop" ? "dropped" : "rose"} ${percentText} ${dates} · per ${pricingUnitLabel(group.pricingUnit)}`;
}

export function eventLabel(change: NadacPriceChange): string {
  if (fromZero(change)) return `Rose from $0 to ${formatPrice(change.newPrice)} ${eventDates(change)}`;
  const delta = Math.abs(change.newPrice - change.oldPrice);
  return `${change.percentage < 0 ? "Dropped" : "Rose"} ${percent(change.percentage)} (${formatPrice(delta)}) ${eventDates(change)}`;
}

/** A package's change as signed figures for a group's package listing: "−43%", "−$4.17". */
export function signedChange(change: NadacPriceChange): { percent: string, amount: string } {
  if (fromZero(change)) return { percent: "from $0", amount: "+" + formatPrice(change.newPrice) };
  const sign = change.percentage < 0 ? "−" : "+";
  return { percent: sign + percent(change.percentage), amount: sign + formatPrice(Math.abs(change.newPrice - change.oldPrice)) };
}

/**
 * When a package's previous observation was more than a week before the change and the group's
 * label can't say so for every package (their previous observations differ): that date.
 */
export function previousObservationNote(event: PriceEvent, group: PriceEventGroup): string | null {
  const start = event.change.startDate.getTime();
  if (event.change.endDate.getTime() - start <= WEEK) return null;
  if (group.events.every(e => e.change.startDate.getTime() === start)) return null;
  return `Previous price ${formatDate(start)}`;
}

export const SCAN_THRESHOLD_ERROR = `Enter a percent of ${PRICE_CHANGE_SCAN_MIN_PERCENT} or more, with at most one decimal.`;

/** A scan's percent as typed: at least the minimum, at most one decimal place, no upper cap. */
export function parseScanThreshold(text: string): { percent: number } | { error: string } {
  const trimmed = text.trim();
  if (!/^\d+(\.\d)?$/.test(trimmed)) return { error: SCAN_THRESHOLD_ERROR };
  const percent = Number(trimmed);
  // 309 or more digits pass the pattern but are Infinity.
  return Number.isFinite(percent) && percent >= PRICE_CHANGE_SCAN_MIN_PERCENT ? { percent } : { error: SCAN_THRESHOLD_ERROR };
}

export type PriceActivity = {
  state: "significant" | "changed" | "stable" | "insufficient" | "mixed",
  label: string,
  magnitude: number,
  points: Array<{ asOfDate: number, price: number }>,
  events: PriceEvent[],
};

export function packageActivity(prices: ChartPrice[]): PriceActivity {
  if (splitByPricingUnit(prices).length > 1) return { state: "mixed", label: "Mixed units", magnitude: 0, points: [], events: [] };
  const points = ([...seriesByDate(prices).values()][0] ?? []).map(p => ({ asOfDate: p.asOfDate, price: p.average }));
  const base = { magnitude: 0, points, events: [] as PriceEvent[] };
  if (points.length < 2) return { ...base, state: "insufficient", label: points.length
    ? `1 observation · ${formatDate(points[0].asOfDate)}` : "No price history" };
  const values = points.map(p => p.price);
  const min = Math.min(...values), max = Math.max(...values);
  const range = min === 0 ? (max === 0 ? 0 : Infinity) : (max - min) / min;
  if (inBand(range)) return { ...base, state: "stable", magnitude: range,
    label: range === 0 ? "Stable · no change" : `Stable · within ${Math.ceil(range * 100)}%` };
  const events = derivePriceEvents(prices, "package").sort((a, b) =>
    Math.abs(b.change.newPrice - b.change.oldPrice) - Math.abs(a.change.newPrice - a.change.oldPrice)
    || a.change.endDate.getTime() - b.change.endDate.getTime());
  if (events.length) return { ...base, state: "significant", events,
    magnitude: Math.abs(events[0].change.newPrice - events[0].change.oldPrice),
    label: eventLabel(events[0].change) + (events.length > 1 ? ` · ${events.length - 1} more` : "") };
  const first = points[0], last = points.at(-1)!;
  const net = first.price === 0 ? Infinity : (last.price - first.price) / first.price;
  if (!inBand(net)) return { ...base, state: "changed", magnitude: range,
    label: `${net < 0 ? "Down" : "Up"} ${percent(net)} (${formatPrice(Math.abs(last.price - first.price))}) over ${Math.max(1, Math.round((last.asOfDate - first.asOfDate) / WEEK))} weeks` };
  const dip = first.price - min, spike = max - first.price;
  const dipped = dip >= spike;
  const extreme = points.find(p => p.price === (dipped ? min : max))!;
  const month = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(extreme.asOfDate);
  return { ...base, state: "changed", magnitude: range,
    label: `${dipped ? "Dipped" : "Spiked"} ${percent((dipped ? dip : spike) / first.price)} (${formatPrice(dipped ? dip : spike)}) in ${month}` };
}

/** Product state comes from its packages; one package's sparkline would misrepresent the product. */
export function productActivity(packages: PackagePrices[]): PriceActivity {
  const priced = packages.filter(pkg => pkg.prices.length);
  if (new Set(priced.flatMap(pkg => pkg.prices.map(p => p.pricingUnit))).size > 1)
    return { state: "mixed", label: "Mixed units", magnitude: 0, points: [], events: [] };
  const activities = priced.map(pkg => packageActivity(pkg.prices));
  const ranked = [...activities].sort(comparePriceActivity);
  const representative = ranked[0] ?? packageActivity([]);
  const events = activities.flatMap(a => a.events);
  const affected = activities.filter(a => a.state === "significant" || a.state === "changed").length;
  const noun = priced.length === 1 ? "package" : "packages";
  let label = representative.label;
  if (representative.state === "significant") label = `${affected} of ${priced.length} ${noun} changed · Largest: ${label}`;
  else if (representative.state === "changed") label = `${affected} of ${priced.length} ${noun} changed · ${label}`;
  else if (representative.state === "stable") label = `${activities.filter(a => a.state === "stable").length} of ${priced.length} ${noun} stable`;
  else if (priced.length) label = `${priced.length} ${noun} · insufficient history`;
  return { ...representative, label, points: [], events };
}

const ACTIVITY_ORDER = { significant: 0, changed: 1, stable: 2, insufficient: 3, mixed: 4 };
/** Ascending displays significant events first, largest magnitude within each state. */
export function comparePriceActivity(a: PriceActivity, b: PriceActivity): number {
  return ACTIVITY_ORDER[a.state] - ACTIVITY_ORDER[b.state] || b.magnitude - a.magnitude;
}

export function activityCounts(activities: PriceActivity[]): string {
  const count = (state: PriceActivity["state"]) => activities.filter(a => a.state === state).length;
  return [
    `${count("significant")} with significant changes`, `${count("changed")} other changed`,
    `${count("stable")} stable`, `${count("insufficient")} insufficient history`,
    ...(count("mixed") ? [`${count("mixed")} mixed units`] : []),
  ].join(", ");
}

/** A 56×24 step path, with proportional dates and the same bounded scale as full charts. */
export function activitySparklinePath(points: PriceActivity["points"]): string {
  if (points.length < 2) return "";
  const values = points.map(p => p.price);
  const [lo, hi] = fittedPriceAxis(Math.min(...values), Math.max(...values)).domain;
  const first = points[0].asOfDate, span = points.at(-1)!.asOfDate - first || 1;
  return points.map((p, i) => {
    const x = 2 + (p.asOfDate - first) / span * 52;
    const y = 22 - (p.price - lo) / (hi - lo || 1) * 20;
    return i ? `H${x} V${y}` : `M${x} ${y}`;
  }).join(" ");
}
