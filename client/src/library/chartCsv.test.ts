import { describe, expect, it } from "vitest";
import { barCsv, barDataRows, csvFileName, csvNumber, csvText, lineCsv, lineDataRows } from "./chartCsv";
import type { ChartPrice } from "./types";

const price = (ndc: string, iso: string, nadacPerUnit: number, pricingUnit = "each", ndcDescription = `Drug ${ndc}`): ChartPrice =>
  ({ ndc, ndcDescription, pricingUnit, nadacPerUnit, asOfDate: new Date(iso) });

const lines = (csv: string) => csv.slice(1).split("\r\n");

describe("csv fields", () => {
  it("quotes text and doubles embedded quotes, keeping commas and newlines", () => {
    expect(csvText('KIT, 40 mg "pen"\nx')).toBe('"KIT, 40 mg ""pen""\nx"');
  });

  it("guards text that a spreadsheet would read as a formula", () => {
    for (const start of ["=", "+", "-", "@", "\t", "\r"]) expect(csvText(`${start}1`)).toBe(`"'${start}1"`);
    expect(csvText("0003-0893")).toBe('"0003-0893"');
  });

  it("leaves numbers unguarded and rounds them to 5 decimals", () => {
    expect(csvNumber(-1.5)).toBe("-1.5");
    expect(csvNumber(1 / 3)).toBe("0.33333");
    expect(csvNumber(6745)).toBe("6745");
    expect(csvNumber(undefined)).toBe("");
  });
});

describe("lineDataRows / lineCsv", () => {
  const prices = [
    price("P", "2025-01-01", 10), price("P", "2025-01-01", 20),
    price("P", "2025-02-01", 12),
    price("A", "2025-02-01", 1),
    price("A", "2025-03-01", 2),
  ];

  it("gives the drawn values newest first, with a product's package range, inside the window", () => {
    const rows = lineDataRows(prices, { start: null, end: Date.parse("2025-02-01") });
    expect(rows.map(row => [row.date, row.ndc, row.price, row.range])).toEqual([
      [Date.parse("2025-02-01"), "A", 1, undefined],
      [Date.parse("2025-02-01"), "P", 12, undefined],
      [Date.parse("2025-01-01"), "P", 15, [10, 20]],
    ]);
  });

  it("writes a BOM, CRLF lines, ISO UTC dates and the range columns", () => {
    const csv = lineCsv(lineDataRows(prices, { start: null, end: null }));
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(lines(csv).slice(0, 2)).toEqual([
      '"Date","NDC","Description","Unit","Price","Lowest package","Highest package"',
      '2025-03-01,"A","Drug A","each",2,,',
    ]);
    expect(lines(csv)).toContain('2025-01-01,"P","Drug P","each",15,10,20');
  });

  it("leaves out range columns when nothing is averaged", () => {
    expect(lines(lineCsv(lineDataRows([price("A", "2025-01-01", 1)], { start: null, end: null })))[0])
      .toBe('"Date","NDC","Description","Unit","Price"');
  });
});

describe("barDataRows / barCsv", () => {
  it("summarizes each series per unit, sorted like the chart", () => {
    const prices = [
      price("A", "2025-01-01", 1), price("A", "2025-02-01", 3),
      price("B", "2025-01-01", 5), price("B", "2025-02-01", 2),
      price("C", "2025-01-01", 9, "milliliter"),
    ];
    const rows = barDataRows(prices, { start: null, end: null }, "latest");
    expect(rows.map(row => [row.ndc, row.unit, row.latest])).toEqual([["A", "each", 3], ["B", "each", 2], ["C", "milliliter", 9]]);
    expect(barDataRows(prices, { start: null, end: null }, "average").map(row => row.ndc)).toEqual(["B", "A", "C"]);
    expect(lines(barCsv(rows))[1]).toBe('"A","Drug A","each",3,2025-02-01,2,1,3');
  });
});

describe("csvFileName", () => {
  it("slugs the title and adds the dates", () => {
    expect(csvFileName("-43.0% on Jan 14, 2026 · 0003-0893-21", Date.parse("2025-10-08"), Date.parse("2026-04-08")))
      .toBe("43-0-on-jan-14-2026-0003-0893-21_2025-10-08_2026-04-08.csv");
    expect(csvFileName("···", 0, 0)).toBe("chart_1970-01-01_1970-01-01.csv");
  });
});
