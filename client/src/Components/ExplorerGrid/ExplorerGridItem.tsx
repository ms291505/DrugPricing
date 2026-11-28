import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Box, Paper, Typography, Collapse, IconButton, Divider, Tooltip, useMediaQuery } from "@mui/material";
import { keyframes, useTheme } from "@mui/material/styles";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

type Props = {
  title: string,
  /**
   * The end of `title`, after its " · ", to keep in view when the rest is cut short: a chart's
   * currency and unit (`unitTitleEnd`), which sets a card apart from its search's other unit cards.
   */
  titleEnd?: string,
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
  // keep the two-line title and details line.
  const compact = useMediaQuery(theme.breakpoints.down("sm"));
  // Touch-sized on a phone (AGENTS.md: 44px on narrow layouts); the row has room for them.
  const actionsBox = actions
    ? (
      <Box sx={{
        gridColumn: 3, gridRow: 1, display: "flex", alignItems: "center", gap: 0.5,
        ...compact && { "& .MuiIconButton-root": { width: 44, height: 44 } },
      }}>
        {actions}
      </Box>
    )
    : null;
  // The title without its end and the " · " before it.
  const titleStart = titleEnd ? title.slice(0, -titleEnd.length).replace(/\s*·\s*$/, "") : title;

  // Titles wrap to two lines (one in a compact header), then truncate; the tooltip shows the full
  // title only when cut off.
  const titleTextRef = useRef<HTMLSpanElement>(null);
  const [titleTruncated, setTitleTruncated] = useState(false);
  const checkTruncated = () => {
    const el = titleTextRef.current;
    setTitleTruncated(el ? el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1 : false);
  };

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
          wrapping in the title's column. A compact header puts the toggle and actions on a row
          of their own, then the title across the card. The DOM follows that order, so the reading
          and tab order match what's seen. */}
      <Box sx={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr) auto", alignItems: "start", columnGap: 1 }}>
        <IconButton
          onClick={handleCollapse}
          data-collapse-toggle
          size="small"
          // The name stays fixed and aria-expanded carries the state (the accordion pattern).
          // The content unmounts while collapsed, so only point at it when it exists.
          aria-expanded={!collapsed}
          aria-controls={collapsed ? undefined : contentId}
          aria-label={title}
          sx={compact ? { width: 44, height: 44 } : undefined}
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
        {compact ? actionsBox : null}
        <Box sx={{ minWidth: 0, pt: compact ? 0 : 0.5, gridColumn: compact ? "1 / -1" : undefined }}>
          <Tooltip title={titleTruncated ? title : ""} placement="top-start">
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
                fontWeight: 600, lineHeight: 1.3, "&:focus-visible": { outline: "2px solid", outlineOffset: 2 },
                // The end follows the rest on its line while it fits, else takes the next line (on
                // one line when compact), so cutting a long title short never cuts it.
                ...(titleEnd || compact) && {
                  display: "flex", flexWrap: compact ? "nowrap" : "wrap", alignItems: "baseline", columnGap: "0.3em",
                },
              }}
            >
              <Box
                component="span"
                ref={titleTextRef}
                sx={compact
                  ? { flex: "0 1 auto", minWidth: 0, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }
                  : {
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    overflowWrap: "anywhere",
                    minWidth: 0,
                  }}
              >
                {/* Two lines keep the " · " with the rest, so a wrapped end doesn't start with
                    it; one line keeps it with the end, so the ellipsis doesn't hide it. */}
                {titleEnd && !compact ? `${titleStart} ·` : titleStart}
              </Box>
              {/* A real space, for the heading's text and the section's name; flex doesn't draw it. */}
              {titleEnd ? " " : null}
              {titleEnd ? <Box component="span" sx={{ flex: "none", whiteSpace: "nowrap" }}>{compact ? `· ${titleEnd}` : titleEnd}</Box> : null}
            </Typography>
          </Tooltip>
        </Box>
        {compact ? null : actionsBox}
        {compact && (details || subtitle)
          ? (
            // One smaller second row: the details, then the count, as the two rows read when not compact.
            <Typography component="div" variant="body2" color="text.secondary" sx={{
              gridColumn: "1 / -1", display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 0.5, rowGap: 0.5,
            }}>
              {details}
              {details && subtitle ? <span aria-hidden>·</span> : null}
              {subtitle}
            </Typography>
          )
          : null
        }
        {details && !compact
          ? (
            <Typography component="div" variant="body2" sx={{
              gridColumn: "2 / -1", display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 1, rowGap: 0.5, fontWeight: 500,
            }}>
              {details}
            </Typography>
          )
          : null
        }
        {subtitle && !compact
          ? <Typography variant="body2" color="text.secondary" sx={{ gridColumn: "2 / -1" }}>{subtitle}</Typography>
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
