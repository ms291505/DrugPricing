import { describe, expect, it } from "vitest";
import { compareStrength, formatStrength, STRENGTH_NOT_LISTED, strengthLabel } from "./strength";

describe("formatStrength", () => {
  it.each([
    { strengthNumber: ["10", "20"], strengthUnit: ["mg"], expected: "10 mg, 20" },
    { strengthNumber: [], strengthUnit: [], expected: "" },
    { strengthNumber: ["2.5"], strengthUnit: ["mg/1"], expected: "2.5 mg/1" },
    { strengthNumber: ["10", "20"], strengthUnit: ["mg/1", "mg/5mL"], expected: "10 mg/1, 20 mg/5mL" },
  ])("formats $expected for both FDA table levels", ({ strengthNumber, strengthUnit, expected }) => {
    expect(formatStrength({ strengthNumber, strengthUnit })).toBe(expected);
  });
});

describe("strengthLabel", () => {
  it("names a product without a strength so it can be excluded", () => {
    expect(strengthLabel({ strengthNumber: [], strengthUnit: [] })).toBe(STRENGTH_NOT_LISTED);
    expect(strengthLabel({ strengthNumber: ["500"], strengthUnit: ["mg/1"] })).toBe("500 mg/1");
  });
});

describe("compareStrength", () => {
  const sorted = (labels: string[]) => [...labels].sort(compareStrength);

  it("orders by the first number as a number, not as text", () => {
    expect(sorted(["1000 mg/1", "500 mg/1", "850 mg/1", "750 mg/1"]))
      .toEqual(["500 mg/1", "750 mg/1", "850 mg/1", "1000 mg/1"]);
  });
  it("then by unit", () => {
    expect(sorted(["500 mg/5mL", "625 mg/1", "500 mg/1"])).toEqual(["500 mg/1", "500 mg/5mL", "625 mg/1"]);
  });
  it("then by the other ingredients, also by number", () => {
    expect(sorted(["5 mg/1, 1000 mg/1", "5 mg/1, 500 mg/1", "5 mg/1"]))
      .toEqual(["5 mg/1", "5 mg/1, 500 mg/1", "5 mg/1, 1000 mg/1"]);
    expect(sorted(["2.5 mg/1, 1000 mg/1", "2.5 mg/1, 250 mg/1, 5 mg/1", "2.5 mg/1, 250 mg/1"]))
      .toEqual(["2.5 mg/1, 250 mg/1", "2.5 mg/1, 250 mg/1, 5 mg/1", "2.5 mg/1, 1000 mg/1"]);
    expect(sorted(["10 mg/1", "5 mg/1, 1000 mg/1"])).toEqual(["5 mg/1, 1000 mg/1", "10 mg/1"]);
  });
  it("reads a number written without its leading zero", () => {
    expect(sorted(["1 mg/1", ".5 mg/1", "0.25 mg/1"])).toEqual(["0.25 mg/1", ".5 mg/1", "1 mg/1"]);
    expect(compareStrength(".5 mg/1", "0.5 mg/1")).toBe(-compareStrength("0.5 mg/1", ".5 mg/1"));
    expect(compareStrength(".5 mg/1", "0.5 mg/1")).not.toBe(0);
  });
  it("puts labels without a number after numbers, and Not listed last", () => {
    expect(sorted([STRENGTH_NOT_LISTED, "N/A", "2 mg/1"])).toEqual(["2 mg/1", "N/A", STRENGTH_NOT_LISTED]);
  });
});
