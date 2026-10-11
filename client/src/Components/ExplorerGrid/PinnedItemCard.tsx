import { useEffect, useId, useRef, useState } from "react";
import { Chip, Grid, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import WidthFullIcon from "@mui/icons-material/WidthFull";
import WidthNormalIcon from "@mui/icons-material/WidthNormal";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import CheckIcon from "@mui/icons-material/Check";
import { useExplorerItems } from "../../Context/ExplorerItemsContext";
import { formatItemSource, itemTitle, type ExplorerItem } from "../../library/explorerItems";
import ExplorerGridItem from "./ExplorerGridItem";
import ChartItemBody from "./ChartItemBody";
import PinnedChartDates from "./PinnedChartDates";
import { HALF_WIDTH_GRID_SIZE } from "../../library/constants";

type Props = {
  item: ExplorerItem,
  index: number,
  count: number,
  /** Shared price range per pricing unit across the matched line charts ("Match scale"). */
  priceRanges?: Map<string, [number, number]>,
}

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function PinnedItemCard({ item, index, count, priceRanges }: Props) {
  const { updateItem, removeItem, moveItem, highlight } = useExplorerItems();
  const title = itemTitle(item);
  const isFull = item.layout.width === "full";

  const cardRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const highlighted = highlight?.id === item.id;
  const focusOnAdd = highlighted && highlight.focus;

  // Add Chart feedback: bring the new card into view and move focus to its heading,
  // so keyboard and screen-reader users land on what they just created.
  useEffect(() => {
    if (!focusOnAdd) return;
    cardRef.current?.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    headingRef.current?.focus({ preventScroll: true });
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
  const matched = isLineChart && item.matchScale === true;

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
        <MenuItem disabled={index === 0} onClick={runAndClose(() => moveItem(item.id, -1))}>
          <ListItemIcon><ArrowUpwardIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Move up</ListItemText>
        </MenuItem>
        <MenuItem disabled={index === count - 1} onClick={runAndClose(() => moveItem(item.id, 1))}>
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
        onCollapsedChange={(collapsed) => updateItem(item.id, prev => ({ ...prev, collapsed }))}
      >
        {item.kind === "chart" ? <ChartItemBody item={item} priceRanges={matched ? priceRanges : undefined} /> : null}
      </ExplorerGridItem>
    </Grid>
  );
}
