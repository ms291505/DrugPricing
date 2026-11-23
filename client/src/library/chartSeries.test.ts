import { describe, expect, it } from "vitest";
import {
  chartControlLabel, countSeries, manySeries, manySeriesWarning, overSeriesLimit, selectedChartPrices, seriesLimitNotice,
} from "./chartSeries";
import type { ChartPrice } from "./types";

const price = (ndc: string, iso: string, packageNdc?: string): ChartPrice =>
  ({ ndc, ndcDescription: `DRUG ${ndc}`, pricingUnit: "EA", nadacPerUnit: 1, asOfDate: new Date(iso), packageNdc });

describe("selectedChartPrices", () => {
  const shown = [price("1", "2026-01-07"), price("1", "2026-02-04"), price("2", "2026-01-07"), price("3", "2026-01-07")];

  it("keeps the shown prices of the selected rows", () => {
    const chosen = selectedChartPrices(shown, new Set(["1", "3"]));
    expect(chosen.map(p => p.ndc)).toEqual(["1", "1", "3"]);
    expect(countSeries(chosen)).toBe(2);
  });

  it("drops a selected row that a filter hides, and keeps it once shown again", () => {
    const selection = new Set(["2", "4"]);
    // "4" is selected but hidden: it isn't in the shown prices.
    expect(countSeries(selectedChartPrices(shown, selection))).toBe(1);
    expect(countSeries(selectedChartPrices([...shown, price("4", "2026-01-07")], selection))).toBe(2);
  });

  it("matches numeric row ids", () => {
    expect(selectedChartPrices(shown, new Set([2]))).toHaveLength(1);
  });

  it("charts an FDA product as one series of all its packages", () => {
    const productPrices = [price("50090-1", "2026-01-07", "5009000101"), price("50090-1", "2026-01-07", "5009000102"), price("50090-2", "2026-01-07", "5009000201")];
    const chosen = selectedChartPrices(productPrices, new Set(["50090-1"]));
    expect(chosen.map(p => p.packageNdc)).toEqual(["5009000101", "5009000102"]);
    expect(countSeries(chosen)).toBe(1);
  });

  it("charts nothing with no selection", () => {
    expect(selectedChartPrices(shown, new Set())).toEqual([]);
  });
});

describe("series thresholds", () => {
  it("warns past 8 series and stops past 30", () => {
    expect([manySeries(8), manySeries(9)]).toEqual([false, true]);
    expect([overSeriesLimit(30), overSeriesLimit(31)]).toEqual([false, true]);
    expect(manySeriesWarning(12)).toBe("Charting 12 series. Charts with more than 8 can be slow and hard to read.");
    expect(seriesLimitNotice(31)).toBe("Charts show up to 30 series, and 31 are selected. Select fewer rows, then turn Line or Bar back on.");
  });

  it("labels the control by the selection", () => {
    expect(chartControlLabel(0, 0)).toBe("Select rows to chart");
    expect(chartControlLabel(3, 2)).toBe("Chart 3 selected");
    expect(chartControlLabel(30, 30)).toBe("Chart 30 selected");
    expect(chartControlLabel(31, 31)).toBe("31 selected · chart up to 30");
  });
});
