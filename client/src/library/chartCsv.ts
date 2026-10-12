import { createLineVizData, rangeKey } from "./createLineVizData";
import { splitByPricingUnit } from "./chartSeries";
import { clipToWindow, toDateInput, type DateWindow } from "./dates";
import { summarizeSeries, type BarValue, type SeriesSummary } from "./seriesSummary";
import type { ChartPrice } from "./types";

/*
 * The numbers behind a chart, for its View data table and CSV download. Rows are the values the
 * chart draws: a product's price is its per-date average of packages, with their range.
 */

export type LineDataRow = {
  date: number,
  ndc: string,
  description: string,
  unit: string,
  price: number,
  /** Lowest and highest package price, on dates a product averages several. */
  range?: [number, number],
};

export type BarDataRow = SeriesSummary & { unit: string };

const descriptions = (prices: ChartPrice[]) => new Map(prices.map(price => [price.ndc, price.ndcDescription]));

/** Every priced date of every series in the window, newest first, then by NDC. */
export function lineDataRows(prices: ChartPrice[], dateWindow: DateWindow): LineDataRow[] {
  const clipped = clipToWindow(prices, dateWindow);
  const labels = descriptions(clipped);
  const rows = splitByPricingUnit(clipped).flatMap(({ pricingUnit, nadacPrices }) => {
    const ndcs = [...new Set(nadacPrices.map(price => price.ndc))];
    return createLineVizData(nadacPrices).rows.flatMap(row => ndcs.flatMap(ndc => {
      const price = row[ndc];
      if (typeof price !== "number") return [];
      const range = row[rangeKey(ndc)] as [number, number] | undefined;
      return [{ date: row.asOfDate, ndc, description: labels.get(ndc) ?? "", unit: pricingUnit, price, ...(range && { range }) }];
    }));
  });
  return rows.sort((a, b) => b.date - a.date || a.ndc.localeCompare(b.ndc) || a.unit.localeCompare(b.unit));
}

/** The bar chart's rows over the window, per unit, sorted like the chart. */
export function barDataRows(prices: ChartPrice[], dateWindow: DateWindow, barValue: BarValue): BarDataRow[] {
  return splitByPricingUnit(clipToWindow(prices, dateWindow)).flatMap(({ pricingUnit, nadacPrices }) =>
    summarizeSeries(nadacPrices)
      .sort((a, b) => b[barValue] - a[barValue])
      .map(summary => ({ ...summary, unit: pricingUnit })));
}

const FORMULA_START = /^[=+\-@\t\r]/;

/** A quoted text field. A leading formula character is escaped so spreadsheets show it as text. */
export function csvText(value: string): string {
  const safe = FORMULA_START.test(value) ? "'" + value : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** A plain number, rounded so an average of packages doesn't print a long float. */
export const csvNumber = (value: number | undefined) => value === undefined ? "" : String(Number(value.toFixed(5)));

/** UTF-8 BOM so Excel reads the file as UTF-8, and CRLF line endings. */
const toCsv = (lines: string[][]) => "﻿" + lines.map(line => line.join(",")).join("\r\n") + "\r\n";

export function lineCsv(rows: LineDataRow[]): string {
  const hasRange = rows.some(row => row.range);
  const header = ["Date", "NDC", "Description", "Unit", "Price", ...(hasRange ? ["Lowest package", "Highest package"] : [])];
  return toCsv([
    header.map(csvText),
    ...rows.map(row => [
      toDateInput(row.date), csvText(row.ndc), csvText(row.description), csvText(row.unit), csvNumber(row.price),
      ...(hasRange ? [csvNumber(row.range?.[0]), csvNumber(row.range?.[1])] : []),
    ]),
  ]);
}

export function barCsv(rows: BarDataRow[]): string {
  const header = ["NDC", "Description", "Unit", "Latest", "Latest date", "Average", "Lowest", "Highest"];
  return toCsv([
    header.map(csvText),
    ...rows.map(row => [
      csvText(row.ndc), csvText(row.label), csvText(row.unit), csvNumber(row.latest), toDateInput(row.latestDate),
      csvNumber(row.average), csvNumber(row.min), csvNumber(row.max),
    ]),
  ]);
}

/** "humira-7-products-over-time_2022-01-05_2026-10-07.csv" */
export function csvFileName(title: string, first: number, last: number): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "chart";
  return `${slug}_${toDateInput(first)}_${toDateInput(last)}.csv`;
}

/** Saves text as a file through a temporary link. */
export function downloadCsv(fileName: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on the next tick: some browsers start the download after click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
