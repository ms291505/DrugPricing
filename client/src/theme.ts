import { createTheme, type ThemeOptions } from '@mui/material/styles';
import { grey } from '@mui/material/colors';
import type { ColorMode } from './library/settings';

/*
 * The app's theme, and the only file that names a color: ESLint rejects color literals anywhere
 * else in `src/` (`eslint.config.js`). Components read roles from the theme (`"text.secondary"`
 * in `sx`, `theme.palette.divider` in code), never a hex value. To change the look:
 *
 * 1. Edit `COLORS`. Roles follow, since each is set from a named color below.
 * 2. If a color's job changes (a new accent, say), remap the role in `theme.palette`.
 * 3. `npm test`: `chartPalette.test.ts` checks chart contrast against the cards, in both modes.
 *
 * There are two themes, picked in Settings (`colorMode`): the app's own dark theme, and MUI's
 * default light theme with grey surfaces, a teal primary, flat bordered cards, and the custom
 * roles (`chart`, `inverse`).
 *
 * Pinned charts store their series colors. A stored color from either palette is drawn in the
 * same slot of the current one (`themedSeriesColor`), so a pin follows the mode; a color from an
 * older palette is drawn as stored. Changing a palette's colors therefore orphans old pins' colors:
 * if that matters, remap them once on load, in `persist.ts`'s per-field validation.
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

/**
 * Every color in the app but the chart series (`CHART_SERIES_COLORS`), named for how it looks.
 * Only `theme` below reads these.
 */
const COLORS = {
  cyan: "#3cbcd7",
  indigo: "#5568ca",
  green: "#61d19c",
  yellow: "#f2f53d",
  orange: "#e6a04c",
  blue: "#52a0e0",
  teal: "#17687a",
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
 * Dark mode chart series colors: Okabe-Ito (color-blind safe), lightened where needed and
 * extended to 10. Each is at least 3:1 against `background.paper`; `chartPalette.test.ts` checks it.
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
 * Light mode chart series colors: the same hues slot for slot, darkened to at least 3:1 against
 * `background.paper`.
 */
export const LIGHT_CHART_SERIES_COLORS = [
  "#0072B2", // blue
  "#B86E00", // orange
  "#00866B", // bluish green
  "#B5508F", // reddish purple
  "#8C7E00", // olive
  "#C24E00", // vermillion
  "#7B5EC0", // purple
  "#4E8A1F", // green
  "#91693B", // brown
  "#2F5FB8", // blue
];

/** Shared by both modes: everything but the palette. */
const SHARED_OPTIONS: ThemeOptions = {
  "spacing": 8,
  "shape": {
    "borderRadius": BORDER_RADIUS
  },
  "typography": {
    "fontFamily": "\"DM Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
  },
};

export const darkTheme = createTheme({
  ...SHARED_OPTIONS,
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
});

/** The highest elevation that in-page surfaces use (the app bar's); above it are overlays. */
const MAX_FLAT_ELEVATION = 4;

/** MUI's default light palette, for now, on grey surfaces. Its error and success colors mark price changes. */
const lightBase = createTheme({ "palette": { "mode": "light" } }).palette;

export const lightTheme = createTheme({
  ...SHARED_OPTIONS,
  "palette": {
    "mode": "light",
    // The dark theme's cyan, deepened to read on a light page (6:1 as text on the cards).
    "primary": {
      "main": COLORS.teal,
      "contrastText": COLORS.white
    },
    // Off-white cards on a grey page: softer than pure white, and the surfaces stand apart.
    "background": {
      "default": grey[200],
      "paper": grey[50]
    },
    // On a light page the "inverse" surfaces are dark.
    "inverse": {
      "main": grey[800],
      "light": grey[800],
      "border": grey[600],
      "contrastText": lightBase.common.white
    },
    "chart": { "series": LIGHT_CHART_SERIES_COLORS, "rise": lightBase.error.main, "drop": lightBase.success.main },
  },
  // Flat surfaces: cards and the app bar get a thin border in place of a drop shadow. Menus,
  // popovers and dialogs (elevation 8 and up) keep their shadow, since they float over the page.
  "components": {
    "MuiPaper": {
      "styleOverrides": {
        "root": ({ ownerState, theme }) =>
          ownerState.variant !== "outlined" && ownerState.elevation !== undefined
            && ownerState.elevation > 0 && ownerState.elevation <= MAX_FLAT_ELEVATION
            ? { boxShadow: "none", border: `1px solid ${theme.palette.divider}` }
            : {},
      },
    },
    "MuiButton": { "defaultProps": { "disableElevation": true } },
    "MuiAppBar": {
      "styleOverrides": {
        "root": { borderWidth: "0 0 1px" },
      },
    },
  },
});

export const THEMES: Record<ColorMode, typeof darkTheme> = { dark: darkTheme, light: lightTheme };

const SERIES_PALETTES = [CHART_SERIES_COLORS, LIGHT_CHART_SERIES_COLORS];

/**
 * A stored series color as drawn in the current palette: a color from either mode's palette maps
 * to the same slot of `palette`; any other color is kept.
 */
export function themedSeriesColor(color: string, palette: string[]): string {
  for (const source of SERIES_PALETTES) {
    const slot = source.indexOf(color);
    if (slot >= 0) return palette[slot] ?? color;
  }
  return color;
}
