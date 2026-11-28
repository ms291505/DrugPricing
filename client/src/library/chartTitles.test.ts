import { describe, expect, it } from "vitest";
import { addedChartMessage, chartSubtitle, chartTitle, hiddenSeriesNote, scanReportMessage, seriesLabels } from "./chartTitles";
import { FULL_WINDOW } from "./dates";
import type { ChartPrice } from "./types";

const price = (ndc: string, iso: string): ChartPrice =>
  ({ ndc, ndcDescription: `HUMIRA ${ndc}`, pricingUnit: "each", nadacPerUnit: 1, asOfDate: new Date(iso) });

describe("chart titles", () => {
  it("names the search and how many series", () => {
    expect(chartTitle("humira", ["a", "b"])).toBe("Humira");
    expect(chartTitle("NDC 3089321", ["a", "b", "c"])).toBe("NDC 3089321");
  });

  it("names a single series by its own label", () => {
    expect(chartTitle("humira", ["HUMIRA KIT 40 mg"])).toBe("HUMIRA KIT 40 mg");
  });

  it("subtitles with the count and the dates shown", () => {
    const prices = [price("A", "2022-01-05"), price("B", "2026-10-07")];
    expect(seriesLabels(prices)).toEqual(["HUMIRA A", "HUMIRA B"]);
    expect(chartSubtitle(2, "product", FULL_WINDOW, prices)).toBe("2 products · Jan 5, 2022 – Oct 7, 2026");
    expect(chartSubtitle(2, "product", { start: Date.parse("2026-01-01"), end: null }, prices))
      .toBe("2 products · Jan 1, 2026 – Oct 7, 2026");
  });
});

describe("addedChartMessage", () => {
  it("says what Line or Bar added", () => {
    expect(addedChartMessage("line", 3, "package", 1)).toBe("Added a line chart of 3 packages.");
    expect(addedChartMessage("bar", 1, "product", 1)).toBe("Added a bar chart of 1 product.");
  });

  it("says when pricing units split the chart into cards", () => {
    expect(addedChartMessage("line", 4, "product", 2)).toBe("Added a line chart of 4 products, one card for each of its 2 pricing units.");
  });
});

describe("hiddenSeriesNote", () => {
  it("counts an added chart's hidden rows, or says nothing", () => {
    expect(hiddenSeriesNote(2)).toBe("2 hidden");
    expect(hiddenSeriesNote(0)).toBe("");
  });
});

describe("scanReportMessage", () => {
  it("counts the package changes a scan found", () => {
    expect(scanReportMessage(3, 25)).toBe("Found 3 package changes of 25% or more in these dates and filters.");
    expect(scanReportMessage(1, 12.5)).toBe("Found 1 package change of 12.5% or more in these dates and filters.");
  });

  it("says when a scan found nothing", () => {
    expect(scanReportMessage(0, 20)).toBe("No package changes of 20% or more in these dates and filters.");
  });
});
