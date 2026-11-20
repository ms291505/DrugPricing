import type { ChartPrice } from "./types";
import type { ChartChangeSpan, SeriesKind } from "./explorerItems";
import { derivePriceEvents, type PriceEvent } from "./priceActivity";
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
export function lineChangeCallouts(prices: ChartPrice[], kind: SeriesKind): LineChangeCallout[] {
  const events = derivePriceEvents(prices, kind);
  const dates = new Map<number, PriceEvent[]>();
  for (const event of events) {
    const date = event.change.endDate.getTime();
    const group = dates.get(date);
    if (group) group.push(event); else dates.set(date, [event]);
  }
  const bySeries = seriesByDate(prices);
  return [...dates].sort(([a], [b]) => a - b).map(([date, events]) => {
    const spans: ChartChangeSpan[] = kind === "product" ? [] : events.map(({ change }) => ({
      start: change.startDate.getTime(), end: date, from: change.oldPrice, to: change.newPrice,
      label: "", direction: change.percentage < 0 ? "drop" : "rise",
    }));
    const samePrices = spans.length && spans.every(s => s.from === spans[0].from && s.to === spans[0].to);
    const products = [...new Set(events.map(e => e.seriesNdc))];
    const packages = new Set(prices.filter(p => products.length !== 1 || p.ndc === products[0]).map(p => p.packageNdc).filter(Boolean)).size;
    let label = kind === "product"
      ? products.length === 1 ? `${new Set(events.map(e => e.packageNdc)).size} of ${packages} packages changed` : `${events.length} package changes`
      : samePrices ? `${formatPriceLabel(spans[0].from!)} → ${formatPriceLabel(spans[0].to!)}` : `${events.length} changes`;
    const first = Math.min(...events.map(e => e.change.startDate.getTime()));
    if (date - first > 7 * 86400000) label += ` · ${formatDate(first)}–${formatDate(date)}`;
    return {
      date, label, events, spans,
      markers: kind === "product" ? products.flatMap(ndc => {
        const point = bySeries.get(ndc)?.find(point => point.asOfDate === date);
        return point ? [{ ndc, price: point.average }] : [];
      }) : [],
    };
  });
}
