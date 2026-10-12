import { describe, expect, it } from "vitest";
import { barAnnouncement, lineAnnouncement, tooltipRows } from "./chartReadout";
import { rangeKey, type LineVizRow } from "./createLineVizData";

const JAN_13 = Date.parse("2026-01-13");

describe("tooltipRows", () => {
  const row: LineVizRow = {
    asOfDate: JAN_13,
    A: 5.52, B: 6741.08, [rangeKey("B")]: [6736.72, 6745.43], C: 5.53, [rangeKey("C")]: [5.5301, 5.5302],
  };

  it("sorts the shown series by price, highest first, skipping hidden and unpriced ones", () => {
    expect(tooltipRows(row, ["A", "C", "D"]).map(r => r.ndc)).toEqual(["C", "A"]);
    expect(tooltipRows(row, ["A", "B", "C"]).map(r => r.ndc)).toEqual(["B", "C", "A"]);
  });

  it("keeps a package range only when its ends print differently", () => {
    const [b, c, a] = tooltipRows(row, ["A", "B", "C"]);
    expect(b.range).toEqual([6736.72, 6745.43]);
    expect(c.range).toBeNull();
    expect(a.range).toBeNull();
  });
});

describe("announcements", () => {
  it("reads a date's prices, with UTC dates", () => {
    // TZ is America/Chicago in tests, where local formatting would say Jan 12.
    const rows = [{ ndc: "B", price: 6741.08, range: [6736.72, 6745.43] as [number, number] }, { ndc: "A", price: 5.52, range: null }];
    expect(lineAnnouncement(JAN_13, "each", rows))
      .toBe("Jan 13, 2026, per each: B $6,741.08, packages $6,736.72 to $6,745.43; A $5.52.");
  });

  it("reads a bar row by its value", () => {
    const row = { ndc: "A", label: "Drug A", latest: 9.7, latestDate: JAN_13, average: 8.5, min: 5.5, max: 9.7, packages: 1 };
    expect(barAnnouncement(row, "latest", "mL")).toBe("A: latest $9.70 on Jan 13, 2026, range $5.50 to $9.70, per mL.");
    expect(barAnnouncement(row, "average", "mL")).toBe("A: average $8.50, range $5.50 to $9.70, per mL.");
  });
});
