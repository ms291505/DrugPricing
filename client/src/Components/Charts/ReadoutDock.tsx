import { Box, Button, Typography } from "@mui/material";
import type { ReactNode, Ref } from "react";
import { READOUT_MAX_HEIGHT } from "../../library/chartReadout";
import useMobile from "../../hooks/useMobile";

type DockProps = {
  /** Where recharts' `Tooltip` renders (its `portal`). */
  portalRef: Ref<HTMLDivElement>,
  /** Space reserved so the chart below doesn't move as the readout changes. */
  minHeight: number,
};

/**
 * The fixed box above a chart that shows the values at the active point, in place of a floating
 * tooltip: it never covers the plot or sits under a finger. Its content is the chart's recharts
 * `Tooltip`, rendered here through `portal`, so hovering re-renders only the readout. Past its
 * height limit it scrolls.
 */
export function ReadoutDock({ portalRef, minHeight }: DockProps) {
  const isMobile = useMobile();
  return (
    <Box
      ref={portalRef}
      sx={{
        minHeight,
        maxHeight: isMobile ? READOUT_MAX_HEIGHT.compact : READOUT_MAX_HEIGHT.wide,
        // The rows scroll inside the readout (`ReadoutContent`), under a header that stays put.
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        px: 1,
        py: 0.75,
      }}
    />
  );
}

/**
 * Recharts' `Tooltip` props that put it in a `ReadoutDock` and keep it showing between points. Its
 * wrapper passes the dock's height on to the content.
 */
export const DOCKED_TOOLTIP = {
  wrapperStyle: { visibility: "visible", flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column" },
  isAnimationActive: false,
} as const;

export type ReadoutStatus = "hover" | "locked" | "default";

const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();

/**
 * The readout's root. React events bubble out of a portal to its React parents, so without this a
 * click in the readout (Unlock, or scrolling it) would reach the chart and lock or unlock it.
 */
export function ReadoutContent({ header, children }: { header: ReactNode, children?: ReactNode }) {
  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", gap: 0.5, flex: "1 1 auto", minHeight: 0 }}
      onClick={stop}
      onMouseDown={stop}
      onMouseMove={stop}
      onPointerMove={stop}
      onTouchStart={stop}
      onTouchMove={stop}
      onKeyDown={stop}
    >
      {header}
      {children
        ? <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, overflowY: "auto", minHeight: 0 }}>{children}</Box>
        : null}
    </Box>
  );
}

type HeaderProps = {
  children: ReactNode,
  status: ReadoutStatus,
  onUnlock: () => void,
};

/** The readout's first line: what it shows, then Unlock while locked or a hint on how to lock. */
export function ReadoutHeader({ children, status, onUnlock }: HeaderProps) {
  const isMobile = useMobile();
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minHeight: 24, flexShrink: 0 }}>
      <Typography variant="body2" sx={{ flexGrow: 1, minWidth: 0 }}>{children}</Typography>
      {status === "locked"
        ? <Button size="small" sx={{ py: 0, minWidth: 0 }} onClick={onUnlock}>Unlock</Button>
        : <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
          {isMobile ? "Tap to lock" : "Click to lock"}
        </Typography>}
    </Box>
  );
}
