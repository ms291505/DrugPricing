import { createTheme } from '@mui/material/styles';

/*
 * The app's theme, and the only file that names a color: ESLint rejects color literals anywhere
 * else in `src/` (`eslint.config.js`). Components read roles from the theme (`"text.secondary"`
 * in `sx`, `theme.palette.divider` in code), never a hex value. To change the look:
 *
 * 1. Edit `COLORS`. Roles follow, since each is set from a named color below.
 * 2. If a color's job changes (a new accent, say), remap the role in `theme.palette`.
 * 3. For new chart series colors, keep the old list in `RETIRED_CHART_SERIES_COLORS`.
 * 4. `npm test`: `chartPalette.test.ts` checks chart contrast against the cards.
 */

/** Chart colors: one per series slot, plus the outline of a price change callout. */
type ChartPalette = { series: string[], rise: string, drop: string };

/**
 * A light surface with dark text on the dark theme: `main` for the tab button, `light` and
 * `border` for explanation tooltips (`HtmlTooltip`).
 */
type InversePalette = { main: string, light: string, border: string, contrastText: string };

declare module '@mui/material/styles' {
  interface Palette {
    chart: ChartPalette;
    inverse: InversePalette;
  }
  interface PaletteOptions {
    chart?: ChartPalette;
    inverse?: InversePalette;
  }
}

/**
 * Corner radius in px for cards, dialogs, buttons and inputs (`shape.borderRadius`). `sx`
 * `borderRadius: 1` is one of these; components read `theme.shape.borderRadius`, not this.
 */
const BORDER_RADIUS = 4;

/** Every color in the app, named for how it looks. Only `theme` below reads these. */
const COLORS = {
  cyan: "#3cbcd7",
  indigo: "#5568ca",
  green: "#61d19c",
  yellow: "#f2f53d",
  orange: "#e6a04c",
  blue: "#52a0e0",
  black: "#000000",
  white: "#ffffff",
  charcoal: "#1e2628",
  slate: "#242d2e",
  slateLine: "#3b4649",
  mist: "#e9eced",
  fog: "#a2afb2",
  silver: "#cdcdcd",
  paleLilac: "#f5f5f9",
  lilacGrey: "#dadde9",
  inkOnLight: "rgba(0, 0, 0, 0.87)",
};

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

/**
 * Earlier `CHART_SERIES_COLORS` lists, newest first. Pinned charts store their colors, so a pin
 * made before a palette change draws each stored color in the same slot of today's palette
 * (`seriesColorInPalette`). Add the outgoing list here whenever the series colors change.
 */
export const RETIRED_CHART_SERIES_COLORS: string[][] = [];

export const theme = createTheme({
  "palette": {
    "mode": "dark",
    "primary": {
      "main": COLORS.cyan,
      "contrastText": COLORS.black
    },
    "secondary": {
      "main": COLORS.indigo,
      "contrastText": COLORS.white
    },
    "success": {
      "main": COLORS.green,
      "contrastText": COLORS.black
    },
    "warning": {
      "main": COLORS.yellow,
      "contrastText": COLORS.black
    },
    "error": {
      "main": COLORS.orange,
      "contrastText": COLORS.black
    },
    "info": {
      "main": COLORS.blue,
      "contrastText": COLORS.black
    },
    "common": {
      "black": COLORS.black,
      "white": COLORS.white
    },
    "background": {
      "default": COLORS.charcoal,
      "paper": COLORS.slate
    },
    "text": {
      "primary": COLORS.mist,
      "secondary": COLORS.fog
    },
    "divider": COLORS.slateLine,
    "inverse": {
      "main": COLORS.silver,
      "light": COLORS.paleLilac,
      "border": COLORS.lilacGrey,
      "contrastText": COLORS.inkOnLight
    },
    "chart": { "series": CHART_SERIES_COLORS, "rise": COLORS.orange, "drop": COLORS.green },
  },
  "spacing": 8,
  "shape": {
    "borderRadius": BORDER_RADIUS
  },
  "typography": {
    "fontFamily": "\"DM Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
  },
});
