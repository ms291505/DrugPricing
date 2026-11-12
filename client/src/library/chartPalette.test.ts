import { describe, expect, it } from "vitest";
import { CHART_SERIES_COLORS, LIGHT_CHART_SERIES_COLORS, THEMES, themedSeriesColor } from "../theme";

// Accepts MUI's short form too (`#fff`).
const luminance = (color: string) => {
  const hex = color.length === 4 ? "#" + [...color.slice(1)].map(c => c + c).join("") : color;
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe.each(Object.entries(THEMES))("%s chart palette", (_mode, theme) => {
  it("has 10 distinct colors, each at least 3:1 against the card background", () => {
    const { series } = theme.palette.chart;
    expect(new Set(series).size).toBe(10);
    for (const color of series) {
      expect(contrast(color, theme.palette.background.paper), color).toBeGreaterThanOrEqual(3);
    }
  });

  it("has distinct price change colors, each at least 3:1 against the card for the callout outline", () => {
    const { rise, drop } = theme.palette.chart;
    expect(rise).not.toBe(drop);
    for (const color of [rise, drop]) {
      expect(contrast(color, theme.palette.background.paper), color).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("themedSeriesColor", () => {
  it("draws a pinned color in the same slot of the current palette, whichever mode it came from", () => {
    expect(themedSeriesColor(CHART_SERIES_COLORS[3], LIGHT_CHART_SERIES_COLORS)).toBe(LIGHT_CHART_SERIES_COLORS[3]);
    expect(themedSeriesColor(LIGHT_CHART_SERIES_COLORS[7], CHART_SERIES_COLORS)).toBe(CHART_SERIES_COLORS[7]);
    expect(themedSeriesColor(CHART_SERIES_COLORS[2], CHART_SERIES_COLORS)).toBe(CHART_SERIES_COLORS[2]);
  });

  it("keeps a color from neither palette", () => {
    expect(themedSeriesColor("#123456", LIGHT_CHART_SERIES_COLORS)).toBe("#123456");
  });
});
