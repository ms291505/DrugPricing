import type { ChartPrice } from "./types";
import type { ChartChangeSpan, SeriesKind } from "./explorerItems";
import { derivePriceEvents, WEEK, type PriceEvent } from "./priceActivity";
import { seriesByDate } from "./prices";
import { formatDate } from "./dates";
import { formatPriceLabel } from "./chartScale";

export type LineChangeCallout = {
  date: number,
  label: string,
  events: PriceEvent[],
  spans: ChartChangeSpan[],
  markers: Array<{ ndc: string, price: number }>,
};

/** One label per date; product markers come only from real package events, never the average. */
export function lineChangeCallouts(prices: ChartPrice[], kind: SeriesKind, events = derivePriceEvents(prices, kind)): LineChangeCallout[] {
  const dates = new Map<number, PriceEvent[]>();
  for (const event of events) {
    const date = event.change.endDate.getTime();
    const group = dates.get(date);
    if (group) group.push(event); else dates.set(date, [event]);
  }
  const bySeries = kind === "product" ? seriesByDate(prices) : null;
  return [...dates].sort(([a], [b]) => a - b).map(([date, events]) => {
    const spans: ChartChangeSpan[] = kind === "product" ? [] : events.map(({ change }) => ({
      start: change.startDate.getTime(), end: date, from: change.oldPrice, to: change.newPrice,
      label: "", direction: change.percentage < 0 ? "drop" : "rise",
    }));
    const products = kind === "product" ? [...new Set(events.map(event => event.seriesNdc))] : [];
    let label = `${events.length} changes`;
    if (kind === "product") {
      label = `${events.length} package changes`;
      if (products.length === 1) {
        const packages = new Set(prices.filter(price => price.ndc === products[0]).map(price => price.packageNdc).filter(Boolean));
        const changedPackages = new Set(events.map(event => event.packageNdc));
        label = `${changedPackages.size} of ${packages.size} packages changed`;
      }
    } else {
      const [firstSpan] = spans;
      const samePrices = spans.length > 0 && spans.every(span => span.from === firstSpan.from && span.to === firstSpan.to);
      if (samePrices) label = `${formatPriceLabel(firstSpan.from!)} → ${formatPriceLabel(firstSpan.to!)}`;
    }
    const first = Math.min(...events.map(e => e.change.startDate.getTime()));
    if (date - first > WEEK) label += ` · ${formatDate(first)}–${formatDate(date)}`;
    return {
      date, label, events, spans,
      markers: kind === "product" ? products.flatMap(ndc => {
        const point = bySeries?.get(ndc)?.find(point => point.asOfDate === date);
        return point ? [{ ndc, price: point.average }] : [];
      }) : [],
    };
  });
}
