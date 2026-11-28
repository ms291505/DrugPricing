import { describe, expect, it } from "vitest";
import {
  addedChartMessage, barValueLabel, chartCardName, chartDates, chartKindLabel, chartTitle, unitTitleEnd, eventChartTitle, hiddenSeriesNote, scanReportMessage, seriesLabels, titleNamesUnit,
  unitChartLabel,
} from "./chartTitles";
import { FULL_WINDOW } from "./dates";
import type { ChartPrice } from "./types";

const price = (ndc: string, iso: string): ChartPrice =>
  ({ ndc, ndcDescription: `HUMIRA ${ndc}`, pricingUnit: "each", nadacPerUnit: 1, asOfDate: new Date(iso) });

describe("chart titles", () => {
  it("names the search and the currency and pricing unit", () => {
    expect(chartTitle("humira", ["a", "b"], "each")).toBe("Humira · USD per each");
    expect(chartTitle("NDC 3089321", ["a", "b", "c"], "milliliter")).toBe("NDC 3089321 · USD per mL");
  });

  it("gives each pricing unit's card of one search its own title", () => {
    const units = ["each", "milliliter", "gram"];
    expect(new Set(units.map(unit => chartTitle("humira", ["a", "b"], unit))).size).toBe(units.length);
  });

  it("names a single series by its own label", () => {
    expect(chartTitle("humira", ["HUMIRA KIT 40 mg"], "each")).toBe("HUMIRA KIT 40 mg · USD per each");
  });

  it("leaves the unit out when none is given", () => {
    expect(chartTitle("humira", ["a", "b"])).toBe("Humira");
  });

  it("names the unit of a price change's chart", () => {
    expect(eventChartTitle(Date.parse("2026-10-21"), "3089321", "milliliter")).toBe("Price change · Oct 21, 2026 · 3089321 · USD per mL");
  });

  it("gives the dates shown for the header, open ends from the data", () => {
    const prices = [price("A", "2022-01-05"), price("B", "2026-10-07")];
    expect(seriesLabels(prices)).toEqual(["HUMIRA A", "HUMIRA B"]);
    expect(chartDates(FULL_WINDOW, prices)).toBe("Jan 5, 2022 – Oct 7, 2026");
    expect(chartDates({ start: Date.parse("2026-01-01"), end: null }, prices)).toBe("Jan 1, 2026 – Oct 7, 2026");
  });

  it("names a bar chart's value for the header", () => {
    expect(barValueLabel("latest")).toBe("Latest price");
    expect(barValueLabel("average")).toBe("Average price");
  });

  it("tells a line and a bar chart of the same rows apart in their names", () => {
    expect(chartKindLabel("line")).toBe("line chart");
    expect(chartKindLabel("bar", "latest")).toBe("bar chart of latest price");
    expect(chartKindLabel("bar", "average")).toBe("bar chart of average price");
    expect(chartKindLabel("bar")).toBe("bar chart");
    expect(chartCardName("Humira · USD per mL", "bar", "latest")).toBe("Humira · USD per mL, bar chart of latest price");
    expect(chartCardName("Humira · USD per mL", "line")).not.toBe(chartCardName("Humira · USD per mL", "bar", "latest"));
  });

  it("keeps the bar value and dates out of the title, which a pin stores", () => {
    expect(chartTitle("humira", ["a", "b"], "each")).not.toMatch(/Latest|Average|\d{4}/);
  });
});

describe("unitTitleEnd", () => {
  it("finds the unit at the end of a generated title, for the header to keep in view", () => {
    expect(unitTitleEnd("HUMIRA KIT 40 mg · USD per each", "each")).toBe("USD per each");
    expect(unitTitleEnd("HUMIRA KIT 40 mg · USD per each", "milliliter")).toBe("");
    expect(unitTitleEnd("My insulin chart", "milliliter")).toBe("");
    expect(unitTitleEnd("Humira · USD per mL", undefined)).toBe("");
  });
});

describe("unit chart labels", () => {
  it("knows a title that gives the currency and unit", () => {
    expect(titleNamesUnit("Humira · USD per mL", "milliliter")).toBe(true);
    expect(titleNamesUnit("Humira · USD per mL", "each")).toBe(false);
    // Older pins' titles and the user's own.
    expect(titleNamesUnit("Humira: 2 products over time · per mL", "milliliter")).toBe(false);
    expect(titleNamesUnit("My insulin chart", "milliliter")).toBe(false);
  });

  it("adds the currency and unit to a chart's accessible name only when its title lacks them", () => {
    expect(unitChartLabel("Humira · USD per mL", "milliliter")).toBe("Humira · USD per mL");
    expect(unitChartLabel("My insulin chart", "milliliter")).toBe("My insulin chart, USD per mL");
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
