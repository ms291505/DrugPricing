import { memo, useEffect, useId, useRef, useState } from "react";
import { Chip, Grid, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import WidthFullIcon from "@mui/icons-material/WidthFull";
import WidthNormalIcon from "@mui/icons-material/WidthNormal";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import CheckIcon from "@mui/icons-material/Check";
import { usePinActions, type PinHighlight } from "../../Context/pinnedItemsContexts";
import { formatItemSource, isScaleMatched, itemTitle, type ExplorerItem } from "../../library/explorerItems";
import ExplorerGridItem from "./ExplorerGridItem";
import ChartItemBody from "./ChartItemBody";
import PinnedChartDates from "./PinnedChartDates";
import { HALF_WIDTH_GRID_SIZE } from "../../library/constants";

type Props = {
  item: ExplorerItem,
  isFirst: boolean,
  isLast: boolean,
  /** Set while this item is the one just added. */
  highlight: PinHighlight | null,
  /** Shared price range per pricing unit across the matched line charts ("Match scale"). Matched line charts only. */
  priceRanges?: Map<string, [number, number]>,
}

/** When to start centering a new card again if no `scrollend` arrives. */
const RECENTER_FALLBACK_MS = 1000;
/** How often, and how many times, to check that a new card is still centered. */
const RECENTER_INTERVAL_MS = 150;
const RECENTER_CHECKS = 6;
/** How far off center a new card may sit. */
const SETTLED_PX = 24;
/** Input that scrolls the page: the user taking over from the centering. */
const USER_SCROLL_EVENTS = ["wheel", "touchmove", "keydown"] as const;

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A pinned item's card. Memoized: its props change only when its own item does. */
export default memo(function PinnedItemCard({ item, isFirst, isLast, highlight, priceRanges }: Props) {
  const { updateItem, removeItem, moveItem } = usePinActions();
  const title = itemTitle(item);
  const isFull = item.layout.width === "full";

  const cardRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const highlighted = highlight !== null;
  const focusOnAdd = highlight?.focus ?? false;

  // Chart selected feedback: bring the new card into view and move focus to its heading,
  // so keyboard and screen-reader users land on what they just created.
  useEffect(() => {
    if (!focusOnAdd) return;
    const card = cardRef.current;
    card?.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    headingRef.current?.focus({ preventScroll: true });
    // Pinned charts draw as the scroll passes them, or after it when it jumps (`ChartItemBody`),
    // and grow past their placeholders, pushing the card down. Once the scroll stops, center the
    // card again until the charts around it have drawn and it stays put. The user scrolling
    // first ends it.
    let timer: ReturnType<typeof setTimeout> | undefined;
    let checks = 0;
    const settle = () => {
      if (!card) return;
      const { top, bottom } = card.getBoundingClientRect();
      const offCenter = Math.abs((top + bottom) / 2 - window.innerHeight / 2);
      if (offCenter > SETTLED_PX) {
        card.scrollIntoView({ block: "center", behavior: "auto" });
      }
      if (++checks < RECENTER_CHECKS) timer = setTimeout(settle, RECENTER_INTERVAL_MS);
    };
    const start = () => {
      window.removeEventListener("scrollend", start);
      clearTimeout(timer);
      settle();
    };
    const stop = () => {
      clearTimeout(timer);
      window.removeEventListener("scrollend", start);
      for (const type of USER_SCROLL_EVENTS) window.removeEventListener(type, stop);
    };
    window.addEventListener("scrollend", start);
    for (const type of USER_SCROLL_EVENTS) window.addEventListener(type, stop, { passive: true });
    // Browsers without `scrollend`, and a card already in place (no scroll, so no event).
    timer = setTimeout(start, RECENTER_FALLBACK_MS);
    return stop;
  }, [focusOnAdd]);

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();
  const closeMenu = () => setMenuAnchor(null);
  const runAndClose = (action: () => void) => () => {
    action();
    closeMenu();
  };

  // The date picker opens from the dates chip, or from "Change dates" in the menu.
  const [datesAnchor, setDatesAnchor] = useState<HTMLElement | null>(null);

  const isLineChart = item.kind === "chart" && item.chartType === "line";
  const matched = isScaleMatched(item);

  const actions = (
    <>
      <Tooltip title="Item actions">
        <IconButton
          size="small"
          aria-label={`Actions for ${title}`}
          aria-haspopup="menu"
          aria-controls={menuAnchor ? menuId : undefined}
          aria-expanded={menuAnchor ? true : undefined}
          onClick={(e) => setMenuAnchor(e.currentTarget)}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu id={menuId} anchorEl={menuAnchor} open={menuAnchor !== null} onClose={closeMenu}>
        <MenuItem disabled={isFirst} onClick={runAndClose(() => moveItem(item.id, -1))}>
          <ListItemIcon><ArrowUpwardIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Move up</ListItemText>
        </MenuItem>
        <MenuItem disabled={isLast} onClick={runAndClose(() => moveItem(item.id, 1))}>
          <ListItemIcon><ArrowDownwardIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Move down</ListItemText>
        </MenuItem>
        <MenuItem onClick={runAndClose(() => setDatesAnchor(menuAnchor))}>
          <ListItemIcon><EditCalendarIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Change dates</ListItemText>
        </MenuItem>
        {isLineChart
          ? <MenuItem
            role="menuitemcheckbox"
            aria-checked={matched}
            onClick={runAndClose(() => updateItem(item.id, prev => ({ ...prev, matchScale: !matched })))}
          >
            <ListItemIcon>{matched ? <CheckIcon fontSize="small" /> : null}</ListItemIcon>
            <ListItemText>Match scale</ListItemText>
          </MenuItem>
          : null
        }
        <MenuItem onClick={runAndClose(() => updateItem(item.id, prev => ({
          ...prev, layout: { ...prev.layout, width: isFull ? "half" : "full" },
        })))}>
          <ListItemIcon>{isFull ? <WidthNormalIcon fontSize="small" /> : <WidthFullIcon fontSize="small" />}</ListItemIcon>
          <ListItemText>{isFull ? "Half width" : "Full width"}</ListItemText>
        </MenuItem>
        <MenuItem onClick={runAndClose(() => removeItem(item.id))}>
          <ListItemIcon><DeleteOutlineIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Remove</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );

  return (
    <Grid size={isFull ? 12 : HALF_WIDTH_GRID_SIZE} ref={cardRef}>
      <ExplorerGridItem
        title={title}
        headingLevel={3}
        headingRef={headingRef}
        highlighted={highlighted}
        fill={item.kind === "chart" && item.chartType === "bar"}
        badges={<>
          <Chip size="small" variant="outlined" label={formatItemSource(item.source)} />
          {item.kind === "chart"
            ? <PinnedChartDates
              item={item}
              title={title}
              anchor={datesAnchor}
              onOpen={setDatesAnchor}
              onClose={() => setDatesAnchor(null)}
            />
            : null
          }
          {matched
            ? <Tooltip title="Shares its price axis with the other matched line charts in the same unit">
              <Chip size="small" variant="outlined" label="Matched scale" />
            </Tooltip>
            : null
          }
        </>}
        actions={actions}
        collapsed={item.collapsed}
        onCollapsedChange={(collapsed: boolean) => updateItem(item.id, prev => ({ ...prev, collapsed }))}
      >
        {item.kind === "chart" ? <ChartItemBody item={item} priceRanges={priceRanges} /> : null}
      </ExplorerGridItem>
    </Grid>
  );
})
