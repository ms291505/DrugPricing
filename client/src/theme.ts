import { createTheme } from '@mui/material/styles';

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
    "divider": "#3b4649"
  },
  "spacing": 8,
  "shape": {
    "borderRadius": 2
  },
  "typography": {
    "fontFamily": "\"DM Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
  },
});
