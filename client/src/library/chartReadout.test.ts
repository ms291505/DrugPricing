import { describe, expect, it } from "vitest";
import { barAnnouncement, barReadoutHeight, lineAnnouncement, lineReadoutHeight, READOUT_MAX_HEIGHT, rowAtIndex, tooltipRows } from "./chartReadout";
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

describe("lineReadoutHeight", () => {
  it("grows with the series, rows taller on wide screens", () => {
    expect(lineReadoutHeight(2, false)).toBeGreaterThan(lineReadoutHeight(2, true));
    expect(lineReadoutHeight(3, false)).toBeGreaterThan(lineReadoutHeight(2, false));
  });

  it("stops at the readout's height limit, past which it scrolls", () => {
    expect(lineReadoutHeight(40, false)).toBe(READOUT_MAX_HEIGHT.wide);
    expect(lineReadoutHeight(40, true)).toBe(READOUT_MAX_HEIGHT.compact);
  });

  it("counts the frame, the gaps and each range line (2 series drew 126 px at 1440)", () => {
    expect(lineReadoutHeight(2, false)).toBe(126);
    expect(lineReadoutHeight(2, false, 1)).toBe(146);
    expect(lineReadoutHeight(2, true, 1)).toBe(lineReadoutHeight(2, true));
  });

  it("reserves a row even with no series", () => {
    expect(lineReadoutHeight(0, true)).toBe(lineReadoutHeight(1, true));
  });
});

describe("rowAtIndex", () => {
  const rows = ["a", "b", "c"];

  it("reads recharts' index as a number or a numeric string", () => {
    expect(rowAtIndex(rows, 1)).toBe("b");
    expect(rowAtIndex(rows, "2")).toBe("c");
  });

  it("finds nothing for a missing, empty, fractional or out-of-range index", () => {
    expect([undefined, null, "", "1.5", 1.5, 3, "x"].map(index => rowAtIndex(rows, index))).toEqual(Array(7).fill(undefined));
  });
});

describe("barReadoutHeight", () => {
  it("fits one row in full (an NDC row draws 86 px at 1440), and the packages line for a product", () => {
    expect(barReadoutHeight(false, false)).toBe(86);
    expect(barReadoutHeight(false, true) - barReadoutHeight(false, false)).toBe(24);
  });

  it("holds the value and range lines on a phone, without the packages line", () => {
    expect(barReadoutHeight(true, true)).toBe(barReadoutHeight(true, false));
    expect(barReadoutHeight(true, false)).toBe(86);
  });
});
