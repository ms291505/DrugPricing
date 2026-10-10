import { useEffect, useId, useRef, useState } from "react";
import { Box, Button, Chip, Grid, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Popover, Tooltip } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import WidthFullIcon from "@mui/icons-material/WidthFull";
import WidthNormalIcon from "@mui/icons-material/WidthNormal";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import { useExplorerItems } from "../../Context/ExplorerItemsContext";
import { chartDataBounds, formatItemSource, itemTitle, type ExplorerItem } from "../../library/explorerItems";
import ExplorerGridItem from "./ExplorerGridItem";
import ChartItemBody from "./ChartItemBody";
import ChartDatesControl from "./ChartDatesControl";
import { HALF_WIDTH_GRID_SIZE, PRICE_CHANGE_WINDOW_MONTHS } from "../../library/constants";
import { formatWindow, windowAround } from "../../library/dates";

type Props = {
  item: ExplorerItem,
  index: number,
  count: number,
  /** Shared price axes from "Match scale", per pricing unit. */
  priceDomains?: Map<string, [number, number]>,
}

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function PinnedItemCard({ item, index, count, priceDomains }: Props) {
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

  // The dates chip opens the date picker; "Change dates" in the menu opens it at the same spot.
  const datesChipRef = useRef<HTMLDivElement>(null);
  const [datesAnchor, setDatesAnchor] = useState<HTMLElement | null>(null);
  const datesOpen = datesAnchor !== null;
  const datesDialogId = useId();
  const dataBounds = chartDataBounds(item);
  const datesLabel = formatWindow(item.dateWindow, dataBounds);
  const focusPreset = item.changeSpan
    ? { label: "Around change", dateWindow: windowAround(item.changeSpan.start, item.changeSpan.end, PRICE_CHANGE_WINDOW_MONTHS) }
    : undefined;

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
        <MenuItem onClick={() => {
          setDatesAnchor(datesChipRef.current ?? menuAnchor);
          closeMenu();
        }}>
          <ListItemIcon><EditCalendarIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Change dates</ListItemText>
        </MenuItem>
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
          {datesLabel
            ? <Tooltip title="Change dates">
              <Chip
                ref={datesChipRef}
                size="small"
                variant="outlined"
                icon={<EditCalendarIcon />}
                label={datesLabel}
                onClick={(e) => setDatesAnchor(e.currentTarget)}
                aria-haspopup="dialog"
                aria-controls={datesOpen ? datesDialogId : undefined}
                aria-expanded={datesOpen}
              />
            </Tooltip>
            : null
          }
          <Popover
            open={datesOpen}
            anchorEl={datesAnchor}
            onClose={() => setDatesAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            slotProps={{ paper: { id: datesDialogId, role: "dialog", "aria-label": `Dates for ${title}`, sx: { p: 2, maxWidth: 360 } } }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <ChartDatesControl
                value={item.dateWindow}
                onChange={(dateWindow) => updateItem(item.id, prev => ({ ...prev, dateWindow }))}
                bounds={dataBounds}
                focusPreset={focusPreset}
              />
              <Button size="small" sx={{ alignSelf: "flex-end" }} onClick={() => setDatesAnchor(null)}>Done</Button>
            </Box>
          </Popover>
        </>}
        actions={actions}
        collapsed={item.collapsed}
        onCollapsedChange={(collapsed) => updateItem(item.id, prev => ({ ...prev, collapsed }))}
      >
        {item.kind === "chart" ? <ChartItemBody item={item} priceDomains={priceDomains} /> : null}
      </ExplorerGridItem>
    </Grid>
  );
}
