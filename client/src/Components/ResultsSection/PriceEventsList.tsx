import { useId, useState, type ReactNode, type SyntheticEvent } from "react";
import { Box, Button, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import { formatPrice } from "../../library/chartScale";
import { pricingUnitLabel } from "../../library/prices";
import {
  previousObservationNote, priceEventGroupLabel, PRICE_CHANGE_GROUP_LIMIT, PRICE_CHANGE_PACKAGE_LIMIT, signedChange,
  type PriceEventGroup,
} from "../../library/priceActivity";

type Props = {
  groups: PriceEventGroup[],
  /** One row per group: its summary, details and anything it opens. */
  renderGroup: (group: PriceEventGroup) => ReactNode,
  /** Show all groups, when the caller needs to know which are shown; else the list keeps it. */
  showAll?: boolean,
  onShowAllChange?: (showAll: boolean) => void,
};

/** Events retain exact per-package values, even when the summary combines a date/unit/direction. */
export default function PriceEventsList({ groups, renderGroup, ...props }: Props) {
  const [ownShowAll, setOwnShowAll] = useState(false);
  const showAll = props.showAll ?? ownShowAll;
  const setShowAll = props.onShowAllChange ?? setOwnShowAll;
  const listId = useId();
  return <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
    <Box id={listId} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {(showAll ? groups : groups.slice(0, PRICE_CHANGE_GROUP_LIMIT)).map(group =>
        <Box key={group.key} sx={{ borderTop: 1, borderColor: "divider", pt: 1, display: "flex", flexDirection: "column", gap: 0.5, alignItems: "stretch", minWidth: 0 }}>
          {renderGroup(group)}
        </Box>)}
    </Box>
    {groups.length > PRICE_CHANGE_GROUP_LIMIT && <Button size="small" sx={{ alignSelf: "flex-start" }}
      aria-expanded={showAll} aria-controls={listId} onClick={() => setShowAll(!showAll)}>
      {showAll ? "Show fewer" : `Show all ${groups.length} events`}
    </Button>}
  </Box>;
}

type DetailsProps = {
  group: PriceEventGroup,
  open: boolean,
  onToggle: (key: string, open: boolean) => void,
  /** Narrow: the amount folds under the percent. */
  compact: boolean,
};

/** A group's Package details disclosure; its open state belongs to the caller. */
export function PriceEventDetails({ group, open, onToggle, compact }: DetailsProps) {
  return <Box component="details" open={open}
    // A toggle React caused (the default changed) leaves `open` as rendered; only the user's differs.
    onToggle={(event: SyntheticEvent<HTMLDetailsElement>) => {
      const now = event.currentTarget.open;
      if (now !== open) onToggle(group.key, now);
    }}
    sx={{ fontSize: "0.875rem", color: "text.secondary", maxWidth: "100%", "& > summary": { cursor: "pointer", width: "fit-content" } }}>
    <summary>Package details</summary>
    <PackageTable group={group} compact={compact} />
  </Box>;
}

/**
 * One row per package: NDC, old and new price, and the change. The group's label already gives
 * the date, unit and direction, so rows repeat none of them.
 */
function PackageTable({ group, compact }: { group: PriceEventGroup, compact: boolean }) {
  const [showAll, setShowAll] = useState(false);
  const tableId = useId();
  const unit = pricingUnitLabel(group.pricingUnit);
  const capped = group.events.length > PRICE_CHANGE_PACKAGE_LIMIT;
  const events = showAll || !capped ? group.events : group.events.slice(0, PRICE_CHANGE_PACKAGE_LIMIT);
  const glyph = group.direction === "drop" ? "▼" : "▲";
  const glyphColor = group.direction === "drop" ? "chart.drop" : "chart.rise";
  return <Box sx={{ maxWidth: "100%", overflowX: "auto", mt: 0.5 }}>
    <Table id={tableId} size="small" sx={{
      width: "auto",
      "& th, & td": { px: 1, py: 0.5, borderColor: "divider", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", verticalAlign: "top" },
      "& th:first-of-type, & td:first-of-type": { pl: 0 },
      "& thead th": { color: "text.secondary", typography: "caption", fontWeight: 600 },
      "& tbody tr:last-of-type td": { borderBottom: 0 },
    }}>
      <Box component="caption" sx={visuallyHidden}>{priceEventGroupLabel(group)}: prices per {unit}</Box>
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
          const { percent, amount } = signedChange(event.change);
          const note = previousObservationNote(event, group);
          return <TableRow key={`${event.seriesNdc}:${event.packageNdc}`}>
            <TableCell component="th" scope="row">
              {event.packageNdc}
              {note && <Box component="span" sx={{ display: "block", color: "text.secondary", typography: "caption" }}>{note}</Box>}
            </TableCell>
            <TableCell align="right" sx={{ color: "text.secondary" }}>{formatPrice(event.change.oldPrice)}</TableCell>
            <TableCell align="right">{formatPrice(event.change.newPrice)}</TableCell>
            <TableCell align="right">
              <Box component="span" aria-hidden sx={{ color: glyphColor, mr: 0.5, fontSize: "0.75em" }}>{glyph}</Box>
              {percent}
              {compact && <Box component="span" sx={{ display: "block", color: "text.secondary", typography: "caption" }}>{amount}</Box>}
            </TableCell>
            {!compact && <TableCell align="right" sx={{ color: "text.secondary" }}>{amount}</TableCell>}
          </TableRow>;
        })}
      </TableBody>
    </Table>
    {capped && <Button size="small" sx={{ ml: -0.5 }} aria-expanded={showAll} aria-controls={tableId}
      onClick={() => setShowAll(value => !value)}>
      {showAll ? "Show fewer packages" : `Show all ${group.events.length} packages`}
    </Button>}
  </Box>;
}
