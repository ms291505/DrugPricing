import { useMemo } from "react";
import { useTheme } from "@mui/material/styles";

/**
 * Shared chart styling from the MUI theme, so `LineViz` and `BarViz` don't hardcode colors or
 * sizes: 12px ticks in `text.secondary` (about 7:1 on the card) and axis lines in `divider`.
 */
export default function useChartTheme() {
  const theme = useTheme();
  return useMemo(() => {
    const fontSize = 12;
    const tick = { fill: theme.palette.text.secondary, fontSize };
    const axisLine = { stroke: theme.palette.divider };
    return {
      palette: theme.palette.chart.series,
      fontSize,
      tick,
      axisLine,
      textPrimary: theme.palette.text.primary,
      paper: theme.palette.background.paper,
      textSecondary: theme.palette.text.secondary,
      rise: theme.palette.chart.rise,
      drop: theme.palette.chart.drop,
      margin: { top: 8, right: 16, bottom: 0, left: 0 },
      radius: theme.shape.borderRadius,
    };
  }, [theme]);
}
