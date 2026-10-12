import { Box, ButtonBase, Tooltip, Typography } from "@mui/material";

export type LegendSeries = {
  ndc: string,
  color: string,
  description: string,
  shown: boolean,
  /** False for the last shown series: a chart is never empty. */
  canHide: boolean,
};

type Props = {
  series: LegendSeries[],
  onToggle: (ndc: string) => void,
  /** The series under the mouse or keyboard focus, or null. Hidden series are ignored by the chart. */
  onHighlight: (ndc: string | null) => void,
}

/**
 * A line chart's legend below the plot: one toggle button per series, with its description in a
 * tooltip. Hovering or focusing a button highlights its series.
 */
export default function SeriesLegend({ series, onToggle, onHighlight }: Props) {
  return (
    <Box
      component="ul"
      aria-label="Series"
      // About three rows, then it scrolls rather than growing the card.
      sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, m: 0, p: 0.25, listStyle: "none", maxHeight: 96, overflowY: "auto" }}
    >
      {series.map(({ ndc, color, description, shown, canHide }) => {
        const locked = shown && !canHide;
        return (
          <li key={ndc}>
            <Tooltip describeChild title={locked ? `${description} · The only series shown can't be hidden` : description}>
              <ButtonBase
                aria-pressed={shown}
                aria-disabled={locked || undefined}
                onClick={() => { if (!locked) onToggle(ndc); }}
                // Mouse and keyboard only: a tap would leave the highlight on until the next tap elsewhere.
                onPointerEnter={(event) => { if (event.pointerType === "mouse") onHighlight(ndc); }}
                onPointerLeave={() => onHighlight(null)}
                onFocusVisible={() => onHighlight(ndc)}
                onBlur={() => onHighlight(null)}
                sx={{
                  gap: 0.75, px: 0.75, py: 0.25, borderRadius: 1,
                  "&:hover": { bgcolor: "action.hover" },
                  "&.Mui-focusVisible": { outline: 2, outlineColor: "primary.main", outlineOffset: 1 },
                }}
              >
                <Box
                  sx={{
                    width: 10, height: 10, borderRadius: "50%", flexShrink: 0, border: 2, borderColor: color,
                    bgcolor: shown ? color : "transparent",
                  }}
                />
                <Typography
                  variant="caption"
                  color={shown ? "text.primary" : "text.secondary"}
                  sx={{ textDecoration: shown ? "none" : "line-through" }}
                >
                  {ndc}
                </Typography>
              </ButtonBase>
            </Tooltip>
          </li>
        );
      })}
    </Box>
  );
}
