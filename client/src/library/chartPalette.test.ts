import { describe, expect, it } from "vitest";
import { CHART_SERIES_COLORS, theme } from "../theme";

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe("chart palette", () => {
  it("has 10 distinct colors, each at least 3:1 against the card background", () => {
    expect(new Set(CHART_SERIES_COLORS).size).toBe(10);
    for (const color of CHART_SERIES_COLORS) {
      expect(contrast(color, theme.palette.background.paper), color).toBeGreaterThanOrEqual(3);
    }
  });
});
