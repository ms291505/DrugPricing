import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    chart: { series: string[] };
  }
  interface PaletteOptions {
    chart?: { series: string[] };
  }
}

/**
 * Chart series colors: Okabe-Ito (color-blind safe), lightened where needed and extended to 10.
 * Each is at least 3:1 against `background.paper`; `chartPalette.test.ts` checks it.
 */
export const CHART_SERIES_COLORS = [
  "#56B4E9", // sky blue
  "#E69F00", // orange
  "#2BB58F", // bluish green
  "#CC79A7", // reddish purple
  "#F0E442", // yellow
  "#D55E00", // vermillion
  "#B39DDB", // lavender
  "#A6D854", // light green
  "#E5C494", // tan
  "#4F9BE0", // blue
];

export const theme = createTheme({
  "palette": {
    "primary": {
      "main": "#3cbcd7",
      "contrastText": "#000000"
    },
    "secondary": {
      "main": "#5568ca",
      "contrastText": "#ffffff"
    },
    "mode": "dark",
    "success": {
      "main": "#61d19c",
      "contrastText": "#000000"
    },
    "warning": {
      "main": "#f2f53d",
      "contrastText": "#000000"
    },
    "error": {
      "main": "#e6a04c",
      "contrastText": "#000000"
    },
    "info": {
      "main": "#52a0e0",
      "contrastText": "#000000"
    },
    "background": {
      "default": "#1e2628",
      "paper": "#242d2e"
    },
    "text": {
      "primary": "#e9eced",
      "secondary": "#a2afb2"
    },
    "divider": "#3b4649",
    "chart": { "series": CHART_SERIES_COLORS },
  },
  "spacing": 8,
  "shape": {
    "borderRadius": 2
  },
  "typography": {
    "fontFamily": "\"DM Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
  },
});
