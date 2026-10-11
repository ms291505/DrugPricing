import { describe, expect, it } from "vitest";
import { niceCeiling } from "./chartSeries";

describe("niceCeiling", () => {
  it("rounds up to a half step of the value's magnitude", () => {
    expect(niceCeiling(6745)).toBe(7000);
    expect(niceCeiling(9.69)).toBe(10);
    expect(niceCeiling(0.42)).toBe(0.45);
    expect(niceCeiling(500)).toBe(500);
  });

  it("keeps zero for an empty or zero range", () => {
    expect(niceCeiling(0)).toBe(0);
  });
});
