import { useId, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import { Box, Paper, Typography, Collapse, IconButton, Divider, Tooltip } from "@mui/material";
import { keyframes, useTheme } from "@mui/material/styles";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

type Props = {
  title: string,
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
  headingLevel?: 2 | 3,
  /** Briefly outline the card, e.g. right after it was added. */
  highlighted?: boolean,
  /** The heading is focusable (tabIndex -1) so new cards can receive focus. */
  headingRef?: Ref<HTMLHeadingElement>,
}

/**
 * Card shell for everything in the explorer grid: the results table, auto charts, and pinned
 * items. A labelled `<section>` with a real heading, a collapse toggle wired for assistive tech,
 * and slots for a subtitle, badges, and actions.
 */
export default function ExplorerGridItem({
  children,
  title,
  subtitle,
  badges,
  actions,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  defaultCollapsed = false,
  headingLevel = 2,
  highlighted = false,
  headingRef,
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

  // Titles wrap to two lines, then truncate; the tooltip shows the full title only when cut off.
  const titleTextRef = useRef<HTMLSpanElement>(null);
  const [titleTruncated, setTitleTruncated] = useState(false);
  const checkTruncated = () => {
    const el = titleTextRef.current;
    setTitleTruncated(el ? el.scrollHeight > el.clientHeight + 1 : false);
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
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
        <IconButton
          onClick={handleCollapse}
          size="small"
          // The name stays fixed and aria-expanded carries the state (the accordion pattern).
          // The content unmounts while collapsed, so only point at it when it exists.
          aria-expanded={!collapsed}
          aria-controls={collapsed ? undefined : contentId}
          aria-label={title}
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
        <Box sx={{ flexGrow: 1, minWidth: 0, pt: 0.5 }}>
          <Tooltip title={titleTruncated ? title : ""} placement="top-start">
            <Typography
              component={`h${headingLevel}`}
              id={titleId}
              ref={headingRef}
              tabIndex={-1}
              variant="subtitle1"
              onMouseEnter={checkTruncated}
              onFocus={checkTruncated}
              sx={{ fontWeight: 600, lineHeight: 1.3, "&:focus-visible": { outline: "2px solid", outlineOffset: 2 } }}
            >
              <Box
                component="span"
                ref={titleTextRef}
                sx={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  overflowWrap: "anywhere",
                }}
              >
                {title}
              </Box>
            </Typography>
          </Tooltip>
          {subtitle
            ? <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
            : null
          }
          {badges
            ? <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>{badges}</Box>
            : null
          }
        </Box>
        {actions
          ? <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>{actions}</Box>
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
