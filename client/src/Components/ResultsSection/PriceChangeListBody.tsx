import { useId, useState, type SyntheticEvent } from "react";
import { Box, Button, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from "@mui/material";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import { visuallyHidden } from "@mui/utils";
import {
  previousObservationNote, priceEventGroupLabel, PRICE_CHANGE_GROUP_LIMIT, PRICE_CHANGE_PACKAGE_LIMIT, signedChange,
  type PriceEvent, type PriceEventGroup,
} from "../../library/priceActivity";
import { formatPrice } from "../../library/chartScale";
import { pricingUnitLabel } from "../../library/prices";
import type { WidthTier } from "../../hooks/useWidthTier";

const captionSx = { display: "block", color: "text.secondary", typography: "caption" } as const;

export type PriceChangeListBodyProps = {
  groups: PriceEventGroup[],
  /** The card's own width tier determines whether amounts fold under percentages. */
  widthTier: WidthTier,
  /** The user's own open/close of each group's Package details, by `detailsKeyPrefix` + group key. */
  detailsChoice: ReadonlyMap<string, boolean>,
  /** Sets this list's details keys apart: groups in different lists share keys. */
  detailsKeyPrefix: string,
  onDetailsToggle: (key: string, open: boolean) => void,
  /** The open change charts by event key: a listed change's button shows its chart as open. */
  openCharts: ReadonlyMap<string, { cardId: string }>,
  onToggleChart: (key: string, group: PriceEventGroup, event: PriceEvent) => void,
  onRegisterButton: (key: string, button: HTMLButtonElement | null) => void,
};

/**
 * A price change list: groups by date, unit and direction, five before Show all, each with its
 * Package details and each package's Chart button. Shared by the result cards and
 * pinned lists, whose owners keep the open charts.
 */
export default function PriceChangeListBody({
  groups, widthTier, detailsChoice, detailsKeyPrefix, onDetailsToggle, ...rowProps
}: PriceChangeListBodyProps) {
  const [showAllGroups, setShowAllGroups] = useState(false);
  const listId = useId();
  const compact = widthTier === "narrow";
  return <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
    <Box id={listId} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {(showAllGroups ? groups : groups.slice(0, PRICE_CHANGE_GROUP_LIMIT)).map(group => {
        const detailsKey = detailsKeyPrefix + group.key;
        return <PriceEventGroupRow key={group.key} group={group} compact={compact}
          detailsOpen={detailsChoice.get(detailsKey) ?? true}
          onDetailsToggle={open => onDetailsToggle(detailsKey, open)} {...rowProps} />;
      })}
    </Box>
    {groups.length > PRICE_CHANGE_GROUP_LIMIT && <Button size="small" sx={{ alignSelf: "flex-start" }}
      aria-expanded={showAllGroups} aria-controls={listId}
      onClick={event => { event.currentTarget.focus(); setShowAllGroups(!showAllGroups); }}>
      {showAllGroups ? "Show fewer" : `Show all ${groups.length} events`}
    </Button>}
  </Box>;
}

/**
 * One date/unit/direction group: its label and a Package details disclosure with one row per
 * package (NDC, old and new price, the change). The label gives the date, unit and direction, so
 * rows repeat none of them.
 */
function PriceEventGroupRow({ group, compact, detailsOpen, onDetailsToggle, openCharts, onToggleChart, onRegisterButton }:
  Pick<PriceChangeListBodyProps, "openCharts" | "onToggleChart" | "onRegisterButton"> & {
    group: PriceEventGroup,
    /** Narrow: the amount folds under the percent. */
    compact: boolean,
    detailsOpen: boolean,
    onDetailsToggle: (open: boolean) => void,
  }) {
  const [showAll, setShowAll] = useState(false);
  const tableId = useId();
  const label = priceEventGroupLabel(group);
  const capped = group.events.length > PRICE_CHANGE_PACKAGE_LIMIT;
  const events = showAll || !capped ? group.events : group.events.slice(0, PRICE_CHANGE_PACKAGE_LIMIT);
  const glyph = group.direction === "drop" ? "▼" : "▲";
  const glyphColor = group.direction === "drop" ? "chart.drop" : "chart.rise";
  return <Box sx={{ width: "100%", borderBottom: 1, borderColor: "divider", py: 1, display: "flex", flexDirection: "column", gap: 0.5, minWidth: 0 }}>
    <Typography variant="subtitle2" component="p">{label}</Typography>
    <Box component="details" open={detailsOpen}
      // Ignore toggle events that match the rendered state.
      onToggle={(event: SyntheticEvent<HTMLDetailsElement>) => {
        const now = event.currentTarget.open;
        if (now !== detailsOpen) onDetailsToggle(now);
      }}
      sx={{ fontSize: "0.875rem", color: "text.secondary", maxWidth: "100%", "& > summary": { cursor: "pointer", width: "fit-content" } }}>
      <summary>Package details</summary>
      <Box sx={{ maxWidth: "100%", overflowX: "auto", mt: 0.5 }}>
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
              const chartId = openCharts.get(key)?.cardId;
              const { percent, amount } = signedChange(event.change);
              const note = previousObservationNote(event, group);
              return <TableRow key={key}>
                <TableCell component="th" scope="row">
                  <Box sx={{ display: "flex", flexDirection: compact ? "column" : "row",
                    alignItems: compact ? "flex-start" : "center", gap: 1 }}>
                    {event.packageNdc}
                    <Tooltip title={chartId ? "Hide chart" : "Chart this change"} describeChild>
                      <IconButton ref={button => onRegisterButton(key, button)} size="small"
                        aria-label={`${chartId ? "Hide chart" : "Chart price change"} for ${event.packageNdc}`}
                        aria-expanded={!!chartId} aria-controls={chartId}
                        onClick={click => { click.currentTarget.focus(); onToggleChart(key, group, event); }}
                        sx={{
                          border: 1, borderRadius: 1,
                          borderColor: chartId ? "primary.main" : "divider",
                          color: chartId ? "primary.main" : "text.secondary",
                          "&:hover, &.Mui-focusVisible": { borderColor: "primary.main", color: "primary.main" },
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
              </TableRow>;
            })}
          </TableBody>
        </Table>
        {capped && <Button size="small" sx={{ ml: -0.5 }} aria-expanded={showAll} aria-controls={tableId}
          onClick={click => { click.currentTarget.focus(); setShowAll(value => !value); }}>
          {showAll ? "Show fewer packages" : `Show all ${group.events.length} packages`}
        </Button>}
      </Box>
    </Box>
  </Box>;
}

/** One change, the same in every list that shows it, so a chart opened from one shows as open in all. Holds no whitespace. */
function eventKey(group: PriceEventGroup, event: PriceEvent) {
  const { startDate, endDate, oldPrice, newPrice } = event.change;
  return `${group.key}:${event.seriesNdc}:${event.packageNdc}:${startDate.getTime()}:${endDate.getTime()}:${oldPrice}:${newPrice}`;
}
