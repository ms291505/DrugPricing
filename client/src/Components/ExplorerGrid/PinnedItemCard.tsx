import { memo, useId, useMemo, useRef, useState, type MouseEvent } from "react";
import { Button, Chip, Grid, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import WidthFullIcon from "@mui/icons-material/WidthFull";
import WidthNormalIcon from "@mui/icons-material/WidthNormal";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditCalendarIcon from "@mui/icons-material/EditCalendar";
import CheckIcon from "@mui/icons-material/Check";
import { usePinActions, type PinHighlight } from "../../Context/pinnedItemsContexts";
import {
  canDrillDownToPackages, formatItemSource, fromChartSeries, isScaleMatched, itemTitle, packageLevelView, type ExplorerItem,
} from "../../library/explorerItems";
import { dateBounds, formatWindow } from "../../library/dates";
import { barValueLabel, chartKindLabel, unitTitleEnd } from "../../library/chartTitles";
import ExplorerGridItem from "./ExplorerGridItem";
import ChartItemBody from "./ChartItemBody";
import PinnedChartDates from "./PinnedChartDates";
import PinnedPriceChangeList from "./PinnedPriceChangeList";
import { HALF_WIDTH_GRID_SIZE } from "../../library/constants";
import { fromKeyboard, nearestVisible } from "../ui/focus";

type Props = {
  item: ExplorerItem,
  isFirst: boolean,
  isLast: boolean,
  /** Set while this item is the one just added. */
  highlight: PinHighlight | null,
  /** Shared price range per pricing unit across the matched line charts ("Match scale"). Matched line charts only. */
  priceRanges?: Map<string, [number, number]>,
};

const sourceBadge = (source: ExplorerItem["source"]) => {
  switch (source.searchSource) {
    case "fda": return { label: "FDA Search", detail: "Found and grouped using FDA reference data. Prices are from NADAC." };
    case "nadac": return { label: "NADAC Search", detail: "Found by NADAC description or NDC. Prices are from NADAC." };
    default: return { label: "Search source unknown", detail: "This pin predates saved search sources. Prices are from NADAC." };
  }
};

/**
 * A pinned item's card. Memoized: its props change only when its own item does.
 */
export default memo(function PinnedItemCard({ item, isFirst, isLast, highlight, priceRanges }: Props) {
  const { updateItem, removeItem, moveItem } = usePinActions();
  const isFull = item.layout.width === "full";

  const cardRef = useRef<HTMLDivElement>(null);
  const highlighted = highlight !== null;

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();
  const closeMenu = () => setMenuAnchor(null);
  const runAndClose = (action: () => void) => () => {
    action();
    closeMenu();
  };

  // Remove unmounts the card with the menu's anchor, so keyboard focus would fall to <body>. From
  // the keyboard (MUI focuses menu items even after a tap, so not `holdsFocus`), pick a surviving
  // neighbor first and focus it once the menu's focus trap is gone.
  const remove = (event: MouseEvent<HTMLElement>) => {
    const card = cardRef.current;
    const target = fromKeyboard(event) && card ? removalFocusTarget(card) : null;
    closeMenu();
    removeItem(item.id);
    if (target) requestAnimationFrame(() => { if (target.isConnected) target.focus(); });
  };

  // The date picker opens from the dates chip, or from "Change dates" in the menu.
  const [datesAnchor, setDatesAnchor] = useState<HTMLElement | null>(null);
  const [showPackages, setShowPackages] = useState(false);
  const packageView = useMemo(
    () => item.kind === "chart" && showPackages ? packageLevelView(item) : null,
    [item, showPackages],
  );
  const visibleItem = packageView ?? item;
  const title = itemTitle(visibleItem);
  // A chart of one unit whose title ends with it (generated titles) keeps that end in view.
  const units = visibleItem.kind === "chart" ? new Set(visibleItem.series.map(series => series.unit)) : new Set<string>();
  const titleEnd = units.size === 1 ? unitTitleEnd(title, [...units][0]) : "";
  // A line and a bar chart of the same rows share a title; their names say which is which.
  const kind = item.kind === "chart" ? chartKindLabel(item.chartType, item.barValue ?? "latest") : "";
  const name = kind ? `${title}, ${kind}` : title;
  const source = sourceBadge(item.source);
  const canSwitchLevel = item.kind === "chart" && canDrillDownToPackages(item);

  const isLineChart = item.kind === "chart" && item.chartType === "line";
  const matched = isScaleMatched(item);

  const actions = (
    <>
      <Tooltip title="Item actions">
        <IconButton
          size="small"
          aria-label={`Actions for ${name}`}
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
        {item.kind === "chart" && <MenuItem onClick={runAndClose(() => setDatesAnchor(menuAnchor))}>
          <ListItemIcon><EditCalendarIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Change dates</ListItemText>
        </MenuItem>}
        {isLineChart
          ? <MenuItem
            role="menuitemcheckbox"
            aria-checked={matched}
            onClick={runAndClose(() => updateItem(item.id, prev => prev.kind === "chart" ? { ...prev, matchScale: !matched } : prev))}
          >
            <ListItemIcon>{matched ? <CheckIcon fontSize="small" /> : null}</ListItemIcon>
            <ListItemText>Match scale</ListItemText>
          </MenuItem>
          : null
        }
        {isLineChart && <MenuItem role="menuitemcheckbox" aria-checked={item.showPriceChanges !== false}
          onClick={runAndClose(() => updateItem(item.id, prev => prev.kind === "chart" ? { ...prev, showPriceChanges: prev.showPriceChanges === false } : prev))}>
          <ListItemIcon>{item.showPriceChanges !== false ? <CheckIcon fontSize="small" /> : null}</ListItemIcon>
          <ListItemText>Show price changes</ListItemText>
        </MenuItem>}
        <MenuItem onClick={runAndClose(() => updateItem(item.id, prev => ({
          ...prev, layout: { ...prev.layout, width: isFull ? "half" : "full" },
        })))}>
          <ListItemIcon>{isFull ? <WidthNormalIcon fontSize="small" /> : <WidthFullIcon fontSize="small" />}</ListItemIcon>
          <ListItemText>{isFull ? "Half width" : "Full width"}</ListItemText>
        </MenuItem>
        <MenuItem onClick={remove}>
          <ListItemIcon><DeleteOutlineIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Remove</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );

  return (
    <Grid size={isFull ? 12 : HALF_WIDTH_GRID_SIZE} ref={cardRef} data-pinned-item={item.id}>
      <ExplorerGridItem
        title={title}
        titleEnd={titleEnd}
        nameSuffix={kind}
        headingLevel={3}
        highlighted={highlighted}
        // As on an added chart: the bar value and the dates, here the Dates control, which a
        // chart's dates change through. The stored title, generated or the user's, stays as is.
        details={<>
          {item.kind === "chart" && item.chartType === "bar" ? <span>{barValueLabel(item.barValue ?? "latest")} </span> : null}
          {item.kind === "chart"
            ? <PinnedChartDates
              item={item}
              title={title}
              anchor={datesAnchor}
              onOpen={setDatesAnchor}
              onClose={() => setDatesAnchor(null)}
            />
            // A list's dates are fixed: it lists the changes in the dates it was pinned with.
            : <Chip size="small" variant="outlined" label={formatWindow(item.dateWindow, dateBounds(fromChartSeries(item.histories)))} />
          }
        </>}
        // describeChild on these Tooltips: without it, MUI names each chip by its tooltip text in
        // place of its visible label. With it the text describes the chip while the tooltip is
        // open. These chips aren't controls, so `title` is cleared too: closed, MUI would put the
        // text there, and a browser names a plain element by its title.
        badges={<>
          <Tooltip title={source.detail} describeChild>
            <Chip size="small" variant="outlined" label={source.label} title={undefined} />
          </Tooltip>
          <Chip size="small" variant="outlined" label={formatItemSource(visibleItem.source)} />
          {canSwitchLevel && <Button size="small" sx={{ minHeight: { xs: 44, sm: 24 } }} onClick={() => setShowPackages(value => !value)}>
            {showPackages ? "Show product averages" : "Show packages"}
          </Button>}
          {matched
            ? <Tooltip title="Shares its price axis with the other matched line charts in the same unit" describeChild>
              <Chip size="small" variant="outlined" label="Matched scale" title={undefined} />
            </Tooltip>
            : null
          }
        </>}
        actions={actions}
        collapsed={item.collapsed}
        onCollapsedChange={(collapsed: boolean) => updateItem(item.id, prev => ({ ...prev, collapsed }))}
      >
        {visibleItem.kind === "chart"
          ? <ChartItemBody item={visibleItem} priceRanges={priceRanges} />
          : <PinnedPriceChangeList item={visibleItem} />}
      </ExplorerGridItem>
    </Grid>
  );
})

/**
 * Where keyboard focus goes when `card` is removed: the next pinned card's collapse toggle, else
 * the previous card's, else the results heading, else the search's first field. The pinned
 * section isn't inside the results on standalone pages, so these are found through the DOM.
 */
function removalFocusTarget(card: HTMLElement): HTMLElement | null {
  const cards = [...card.parentElement?.querySelectorAll<HTMLElement>(":scope > [data-pinned-item]") ?? []];
  const index = cards.indexOf(card);
  const neighbor = cards[index + 1] ?? cards[index - 1];
  return neighbor?.querySelector<HTMLElement>("[data-collapse-toggle]")
    ?? nearestVisible(card, "[data-results-heading]")
    ?? nearestVisible(card, "[data-first-term]");
}
