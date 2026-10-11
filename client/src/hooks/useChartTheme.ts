import { useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import type { CSSProperties } from "react";

/**
 * Shared chart styling from the MUI theme, so `LineViz` and `BarViz` don't hardcode colors or
 * sizes: 12px ticks in `text.secondary` (about 7:1 on the card), axis lines in `divider`, and a
 * tooltip that matches the cards.
 */
export default function useChartTheme() {
  const theme = useTheme();
  return useMemo(() => {
    const fontSize = 12;
    const tick = { fill: theme.palette.text.secondary, fontSize };
    const axisLine = { stroke: theme.palette.divider };
    const tooltip: { contentStyle: CSSProperties, labelStyle: CSSProperties, itemStyle: CSSProperties } = {
      contentStyle: {
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        fontSize: 13,
        maxWidth: 360,
        whiteSpace: "normal",
      },
      labelStyle: { color: theme.palette.text.primary, fontWeight: 600 },
      itemStyle: { padding: 0 },
    };
    return {
      palette: theme.palette.chart.series,
      fontSize,
      tick,
      axisLine,
      tooltip,
      legendStyle: { fontSize, color: theme.palette.text.secondary } as CSSProperties,
      textPrimary: theme.palette.text.primary,
      textSecondary: theme.palette.text.secondary,
      rise: theme.palette.error.main,
      drop: theme.palette.success.main,
      margin: { top: 8, right: 16, bottom: 0, left: 0 },
    };
  }, [theme]);
}
