import { useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { visuallyHidden } from "@mui/utils";
import { Box, Paper, Typography, Collapse, IconButton, Divider, Tooltip, useMediaQuery } from "@mui/material";
import { keyframes, useTheme, type SxProps, type Theme } from "@mui/material/styles";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

type Props = {
  title: string,
  /**
   * The end of `title`, after its " · ", to keep in view when the rest is cut short: a chart's
   * currency and unit (`unitTitleEnd`), which sets a card apart from its search's other unit cards.
   */
  titleEnd?: string,
  /**
   * Read after the title, not shown: a chart's kind and bar value (`chartKindLabel`), in the
   * heading (visually hidden) and the collapse button's name, since a line and a bar chart of the
   * same rows share a title.
   */
  nameSuffix?: string,
  /**
   * The rest of the header, on its own line under the title: what a chart draws and over which
   * dates (its bar value, its dates or a pin's Dates control), read live rather than stored in
   * the title. Its own line, so a title that takes two lines doesn't push it out of view.
   */
  details?: ReactNode,
  subtitle?: ReactNode,
  /** Small chips shown under the title, e.g. provenance. */
  badges?: ReactNode,
  /** Buttons or a menu at the right of the header. */
  actions?: ReactNode,
  children: ReactNode,
  /** Pass with `onCollapsedChange` to control collapse from outside (pinned items). */
  collapsed?: boolean,
  onCollapsedChange?: (collapsed: boolean) => void,
  defaultCollapsed?: boolean,
  headingLevel?: 2 | 3 | 4,
  /** Briefly outline the card, e.g. right after it was added. */
  highlighted?: boolean,
}

/**
 * Card shell for everything in the explorer grid: the results table, added charts, and pinned
 * items. A labelled `<section>` with a real heading, a collapse toggle wired for assistive tech,
 * and slots for the header's details, a subtitle, badges, and actions.
 */
export default function ExplorerGridItem({
  children,
  title,
  titleEnd = "",
  nameSuffix = "",
  details,
  subtitle,
  badges,
  actions,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  defaultCollapsed = false,
  headingLevel = 2,
  highlighted = false,
}: Props) {
  const [uncontrolledCollapsed, setUncontrolledCollapsed] = useState(defaultCollapsed);
  const collapsed = controlledCollapsed ?? uncontrolledCollapsed;
  const handleCollapse = () => {
    if (onCollapsedChange) onCollapsedChange(!collapsed);
    else setUncontrolledCollapsed(!collapsed);
  };

  const theme = useTheme();
  const highlightColor = theme.palette.primary.main;
  const pulse = useMemo(() => keyframes`
    from { outline-color: ${highlightColor}; }
    to { outline-color: transparent; }
  `, [highlightColor]);

  const baseId = useId();
  const titleId = `${baseId}-title`;
  const contentId = `${baseId}-content`;

  // On a phone (below `sm` by window width, as for the dialogs) the header is compact: the toggle
  // and actions on the first row, then a one-line title across the card, then one smaller row
  // with the details and subtitle. The window decides, not the card: half-width cards on a desktop
  // keep the two-line title and details line. Only placement and styling change between the two,
  // never which elements render where, so crossing `sm` (a rotation, say) remounts nothing: a
  // pinned chart's Dates popover keeps its anchor, and focus stays where it was.
  const compact = useMediaQuery(theme.breakpoints.down("sm"));
  // The title without its end and the " · " before it.
  const titleStart = titleEnd ? title.slice(0, -titleEnd.length).replace(/\s*·\s*$/, "") : title;

  // On a desktop the title takes at most two lines and a chart's unit end always shows. A hidden
  // copy of the title, as wide as the heading and never clamped, says whether the name and the end
  // fit two lines together; if not, the name takes one cut line and the end the second. The copy
  // doesn't change with the layout it decides, so measuring it can't loop, and a ResizeObserver
  // reports before paint, as `useWidthTier` relies on, so no frame shows the wrong layout.
  const measureRef = useRef<HTMLDivElement>(null);
  const [splitTitle, setSplitTitle] = useState(false);
  const measure = !compact && titleEnd !== "";
  useLayoutEffect(() => {
    const element = measureRef.current;
    if (!measure || !element) return;
    const observer = new ResizeObserver(() => {
      const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
      flushSync(() => setSplitTitle(element.offsetHeight > 2 * lineHeight + 1));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [measure]);
  const split = measure && splitTitle;

  // Titles wrap to two lines (one in a compact header), then truncate; the tooltip shows the full
  // title only when cut off.
  const titleTextRef = useRef<HTMLSpanElement>(null);
  const [titleTruncated, setTitleTruncated] = useState(false);
  const checkTruncated = () => {
    const el = titleTextRef.current;
    setTitleTruncated(el ? el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1 : false);
  };

  const headingSx = { fontWeight: 600, lineHeight: 1.3, overflowWrap: "anywhere" } as const;
  // The name: one cut line when compact or split, else the whole title's two lines.
  const nameSx: SxProps<Theme> = compact
    ? { flex: "0 1 auto", minWidth: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }
    : split
      ? { display: "block", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }
      : titleEnd
        ? {}
        : { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" };

  return (
    <Paper
      component="section"
      aria-labelledby={titleId}
      sx={{
        p: { xs: 1, md: 2 },
        display: "flex",
        flexDirection: "column",
        gap: 1,
        outline: "2px solid transparent",
        outlineOffset: 2,
        ...(highlighted && {
          animation: `${pulse} 2s ease-out`,
          "@media (prefers-reduced-motion: reduce)": { animation: "none", outlineColor: highlightColor },
        }),
      }}>
      {/* A grid, so the subtitle and badges run under the actions to the card's edge instead of
          wrapping in the title's column. One DOM order in both layouts: toggle, actions, title,
          then the details and subtitle. A compact header shows them in that order (the toggle and
          actions on a row of their own, the title across the card under them), so reading and tab
          order match what's seen; a desktop header places the title between the toggle and the
          actions. The heading isn't in the tab order, so Tab still goes toggle, then actions. */}
      <Box sx={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr) auto", alignItems: "start", columnGap: 1 }}>
        <IconButton
          onClick={handleCollapse}
          data-collapse-toggle
          size="small"
          // The name stays fixed and aria-expanded carries the state (the accordion pattern).
          // The content unmounts while collapsed, so only point at it when it exists.
          aria-expanded={!collapsed}
          aria-controls={collapsed ? undefined : contentId}
          aria-label={nameSuffix ? `${title}, ${nameSuffix}` : title}
          sx={{ gridColumn: 1, gridRow: 1, ...compact && { width: 44, height: 44 } }}
        >
          <KeyboardArrowDownIcon
            fontSize="small"
            sx={{
              transform: !collapsed ? "rotate(180deg)" : "rotate(0deg)",
              transition: (theme) =>
                theme.transitions.create("transform", {
                  duration: theme.transitions.duration.shortest,
                }),
            }}
          />
        </IconButton>
        {actions
          ? (
            // Touch-sized on a phone (AGENTS.md: 44px on narrow layouts); the row has room for them.
            <Box sx={{
              gridColumn: 3, gridRow: 1, display: "flex", alignItems: "center", gap: 0.5,
              ...compact && { "& .MuiIconButton-root": { width: 44, height: 44 } },
            }}>
              {actions}
            </Box>
          )
          : null}
        <Box sx={{ minWidth: 0, position: "relative", ...compact ? { gridColumn: "1 / -1", gridRow: 2 } : { gridColumn: 2, gridRow: 1, pt: 0.5 } }}>
          {/* describeChild: without it, MUI names the heading by the tooltip's title whenever the
              title is cut off, dropping the hidden chart kind, so a line and a bar chart of the
              same rows would share a name again. The full title only describes it while open. */}
          <Tooltip title={titleTruncated ? title : ""} placement="top-start" describeChild>
            <Typography
              component={`h${headingLevel}`}
              id={titleId}
              data-card-heading
              // Focusable from code: the toolbar's Line, Bar and Show move focus here from the keyboard.
              tabIndex={-1}
              variant="subtitle1"
              onMouseEnter={checkTruncated}
              onFocus={checkTruncated}
              sx={{
                ...headingSx, "&:focus-visible": { outline: "2px solid", outlineOffset: 2 },
                ...compact && { display: "flex", flexWrap: "nowrap", alignItems: "baseline", columnGap: "0.3em" },
              }}
            >
              <Box component="span" ref={titleTextRef} sx={nameSx}>
                {/* Two lines keep the " · " with the rest, so a wrapped end doesn't start with
                    it; one line keeps it with the end, so the ellipsis doesn't hide it. */}
                {titleEnd && !compact ? `${titleStart} ·` : titleStart}
              </Box>
              {/* A real space, for the heading's text and the section's name; flex doesn't draw it. */}
              {titleEnd ? " " : null}
              {titleEnd
                ? (
                  <Box component="span" sx={{ whiteSpace: "nowrap", ...compact ? { flex: "none" } : split ? { display: "block" } : {} }}>
                    {compact ? `· ${titleEnd}` : titleEnd}
                  </Box>
                )
                : null}
              {nameSuffix ? <Box component="span" sx={visuallyHidden}>, {nameSuffix}</Box> : null}
            </Typography>
          </Tooltip>
          {measure
            ? (
              <Typography ref={measureRef} component="div" variant="subtitle1" aria-hidden sx={{
                ...headingSx, position: "absolute", top: 0, left: 0, right: 0, visibility: "hidden", pointerEvents: "none",
              }}>
                {`${titleStart} ·`} <Box component="span" sx={{ whiteSpace: "nowrap" }}>{titleEnd}</Box>
              </Typography>
            )
            : null}
        </Box>
        {details || subtitle
          ? (
            // Two rows on a desktop, the details over the subtitle; one smaller row when compact,
            // in the same order. Inline text when compact, not flex, so the spaces and the " · "
            // between the parts are read.
            <Typography component="div" variant="body2" sx={compact
              ? { gridColumn: "1 / -1", color: "text.secondary", "& .MuiChip-root": { verticalAlign: "middle" } }
              : { gridColumn: "2 / -1", display: "flex", flexDirection: "column" }}>
              {details
                ? (
                  <Box component="span" sx={compact ? {} : {
                    display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 1, rowGap: 0.5, fontWeight: 500,
                  }}>
                    {details}
                  </Box>
                )
                : null}
              {details && subtitle ? <Box component="span" sx={compact ? {} : { display: "none" }}> · </Box> : null}
              {subtitle ? <Box component="span" sx={compact ? {} : { color: "text.secondary" }}>{subtitle}</Box> : null}
            </Typography>
          )
          : null
        }
        {badges
          ? <Box sx={{ gridColumn: compact ? "1 / -1" : "2 / -1", display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>{badges}</Box>
          : null
        }
      </Box>
      {collapsed ? null : <Divider />}
      <Collapse
        in={!collapsed}
        timeout="auto"
        unmountOnExit
        id={contentId}
      >
        {children}
      </Collapse>
    </Paper>
  )
}
