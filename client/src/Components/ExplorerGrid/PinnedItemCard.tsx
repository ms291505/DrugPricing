import { useEffect, useId, useRef, useState } from "react";
import { Chip, Grid, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import WidthFullIcon from "@mui/icons-material/WidthFull";
import WidthNormalIcon from "@mui/icons-material/WidthNormal";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useExplorerItems } from "../../Context/ExplorerItemsContext";
import { formatItemSource, itemTitle, type ExplorerItem } from "../../library/explorerItems";
import ExplorerGridItem from "./ExplorerGridItem";
import ChartItemBody from "./ChartItemBody";
import { HALF_WIDTH_GRID_SIZE } from "../../library/constants";

type Props = {
  item: ExplorerItem,
  index: number,
  count: number,
}

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function PinnedItemCard({ item, index, count }: Props) {
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
        badges={<Chip size="small" variant="outlined" label={formatItemSource(item.source)} />}
        actions={actions}
        collapsed={item.collapsed}
        onCollapsedChange={(collapsed) => updateItem(item.id, prev => ({ ...prev, collapsed }))}
      >
        {item.kind === "chart" ? <ChartItemBody item={item} /> : null}
      </ExplorerGridItem>
    </Grid>
  );
}
