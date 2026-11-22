import { useCallback, useId, useState, type SyntheticEvent } from "react";
import { Box, Button, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import { visuallyHidden } from "@mui/utils";
import {
  previousObservationNote, priceEventGroupLabel, PRICE_CHANGE_GROUP_LIMIT, PRICE_CHANGE_PACKAGE_LIMIT, signedChange,
  type PriceEvent, type PriceEventGroup,
} from "../../library/priceActivity";
import { formatPrice } from "../../library/chartScale";
import { eventChartTitle } from "../../library/chartTitles";
import type { ChartPrice } from "../../library/types";
import PriceChangeChartDialog, { type ChartContext, type OpenChange } from "./PriceChangeChartDialog";
import { pricingUnitLabel } from "../../library/prices";
import type { WidthTier } from "../../hooks/useWidthTier";

const captionSx = { display: "block", color: "text.secondary", typography: "caption" } as const;

/**
 * Below this list width the Chart button goes under its NDC. A narrow row (no Amount column,
 * 44px button) needs about 330px, so this stacks on phones but not in a narrow card with room.
 */
const STACK_BUTTON_BELOW_PX = 360;

export type PriceChangeListBodyProps = {
  groups: PriceEventGroup[],
  /** The card's own width tier determines whether amounts fold under percentages. */
  widthTier: WidthTier,
  /** The user's own open/close of each group's Package details, by `detailsKeyPrefix` + group key. */
  detailsChoice: ReadonlyMap<string, boolean>,
  /** Sets this list's details keys apart: groups in different lists share keys. */
  detailsKeyPrefix: string,
  onDetailsToggle: (key: string, open: boolean) => void,
  /** The prices a change's chart draws: its package's, in the group's unit. */
  chartPrices: (group: PriceEventGroup, event: PriceEvent) => ChartPrice[],
  /** The list's title, origin, colors and dates, for the change chart dialog. */
  chartContext: ChartContext,
};

/**
 * A price change list: groups by date, unit and direction, five before Show all, each with its
 * Package details and each package's Chart button, which opens that change in a dialog (one at
 * a time). Shared by the result cards and pinned lists.
 */
export default function PriceChangeListBody({
  groups, widthTier, detailsChoice, detailsKeyPrefix, onDetailsToggle, chartPrices, chartContext,
}: PriceChangeListBodyProps) {
  const [showAllGroups, setShowAllGroups] = useState(false);
  const [open, setOpen] = useState<OpenChange | null>(null);
  // New groups (new prices) close the chart.
  const [openGroups, setOpenGroups] = useState(groups);
  if (openGroups !== groups) {
    setOpenGroups(groups);
    setOpen(null);
  }
  const openChart = (group: PriceEventGroup, event: PriceEvent) => setOpen({
    key: eventKey(group, event), eventDate: group.date,
    title: eventChartTitle(group.date, event.packageNdc, group.pricingUnit),
    prices: chartPrices(group, event),
  });
  const closeChart = useCallback(() => setOpen(null), []);
  const listId = useId();
  const compact = widthTier === "narrow";
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Box id={listId} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {(showAllGroups ? groups : groups.slice(0, PRICE_CHANGE_GROUP_LIMIT)).map(group => {
          const detailsKey = detailsKeyPrefix + group.key;
          return (
            <PriceEventGroupRow key={group.key} group={group} compact={compact}
              detailsOpen={detailsChoice.get(detailsKey) ?? true}
              onDetailsToggle={detailsOpen => onDetailsToggle(detailsKey, detailsOpen)} onChart={openChart} />
          );
        })}
      </Box>
      {groups.length > PRICE_CHANGE_GROUP_LIMIT && <Button size="small" sx={{ alignSelf: "flex-start" }}
        aria-expanded={showAllGroups} aria-controls={listId}
        onClick={() => setShowAllGroups(!showAllGroups)}>
        {showAllGroups ? "Show fewer" : `Show all ${groups.length} events`}
      </Button>}
      {open && <PriceChangeChartDialog change={open} context={chartContext} onClose={closeChart} />}
    </Box>
  );
}

/**
 * One date/unit/direction group: its label and a Package details disclosure with one row per
 * package (NDC, old and new price, the change). The label gives the date, unit and direction, so
 * rows repeat none of them.
 */
function PriceEventGroupRow({ group, compact, detailsOpen, onDetailsToggle, onChart }: {
    group: PriceEventGroup,
    /** Narrow: the amount folds under the percent, and the Chart button is touch-sized. */
    compact: boolean,
    detailsOpen: boolean,
    onDetailsToggle: (open: boolean) => void,
    onChart: (group: PriceEventGroup, event: PriceEvent) => void,
  }) {
  const [showAll, setShowAll] = useState(false);
  const tableId = useId();
  const label = priceEventGroupLabel(group);
  const capped = group.events.length > PRICE_CHANGE_PACKAGE_LIMIT;
  const events = showAll || !capped ? group.events : group.events.slice(0, PRICE_CHANGE_PACKAGE_LIMIT);
  const glyph = group.direction === "drop" ? "▼" : "▲";
  const glyphColor = group.direction === "drop" ? "chart.drop" : "chart.rise";
  return (
    <Box sx={{ width: "100%", borderBottom: 1, borderColor: "divider", py: 1, display: "flex", flexDirection: "column", gap: 0.5, minWidth: 0 }}>
      <Typography variant="subtitle2" component="p">{label}</Typography>
      <Box component="details" open={detailsOpen}
        // Ignore toggle events that match the rendered state.
        onToggle={(event: SyntheticEvent<HTMLDetailsElement>) => {
          const now = event.currentTarget.open;
          if (now !== detailsOpen) onDetailsToggle(now);
        }}
        sx={{ fontSize: "0.875rem", color: "text.secondary", maxWidth: "100%", "& > summary": { cursor: "pointer", width: "fit-content" } }}>
        <summary>Package details</summary>
        <Box sx={{ maxWidth: "100%", overflowX: "auto", mt: 0.5, containerType: "inline-size" }}>
          <Table id={tableId} size="small" sx={{
            width: "100%",
            "& th, & td": { px: 1, py: 0.5, borderColor: "divider", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", verticalAlign: "top" },
            "& th:first-of-type, & td:first-of-type": { pl: 0 },
            "& thead th": { color: "text.secondary", typography: "caption", fontWeight: 600 },
            "& tbody tr:last-of-type th, & tbody tr:last-of-type td": { borderBottom: 0 },
          }}>
            <Box component="caption" sx={visuallyHidden}>{label}: prices per {pricingUnitLabel(group.pricingUnit)}</Box>
            <TableHead>
              <TableRow>
                <TableCell>Package NDC</TableCell>
                <TableCell align="right">Was</TableCell>
                <TableCell align="right">Now</TableCell>
                <TableCell align="right">Change</TableCell>
                {!compact && <TableCell align="right">Amount</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {events.map(event => {
                const key = eventKey(group, event);
                const { percent, amount } = signedChange(event.change);
                const note = previousObservationNote(event, group);
                return (
                  <TableRow key={key}>
                    <TableCell component="th" scope="row">
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1,
                        [`@container (width < ${STACK_BUTTON_BELOW_PX}px)`]: { flexDirection: "column", alignItems: "flex-start" } }}>
                        {event.packageNdc}
                        <Tooltip title="Chart this change" describeChild>
                          <IconButton size="small" aria-label={`Chart this change for ${event.packageNdc}`} aria-haspopup="dialog"
                            onClick={() => onChart(group, event)}
                            sx={{
                              border: 1, borderRadius: 1, borderColor: "divider", color: "text.secondary",
                              ...(compact && { minWidth: 44, minHeight: 44 }),
                            }}>
                            <ShowChartIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      {note && <Box component="span" sx={captionSx}>{note}</Box>}
                    </TableCell>
                    <TableCell align="right" sx={{ color: "text.secondary" }}>{formatPrice(event.change.oldPrice)}</TableCell>
                    <TableCell align="right">{formatPrice(event.change.newPrice)}</TableCell>
                    <TableCell align="right"><Box component="span" aria-hidden sx={{ color: glyphColor, mr: 0.5, fontSize: "0.75em" }}>{glyph}</Box>
                      {percent}{compact && <Box component="span" sx={captionSx}>{amount}</Box>}
                    </TableCell>
                    {!compact && <TableCell align="right" sx={{ color: "text.secondary" }}>{amount}</TableCell>}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {capped && <Button size="small" sx={{ ml: -0.5 }} aria-expanded={showAll} aria-controls={tableId}
            onClick={() => setShowAll(value => !value)}>
            {showAll ? "Show fewer packages" : `Show all ${group.events.length} packages`}
          </Button>}
        </Box>
      </Box>
    </Box>
  );
}

/** One change, the same in every list that shows it. Holds no whitespace. */
function eventKey(group: PriceEventGroup, event: PriceEvent) {
  const { startDate, endDate, oldPrice, newPrice } = event.change;
  return `${group.key}:${event.seriesNdc}:${event.packageNdc}:${startDate.getTime()}:${endDate.getTime()}:${oldPrice}:${newPrice}`;
}
