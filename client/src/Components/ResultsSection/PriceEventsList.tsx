import { Fragment, useCallback, useEffect, useId, useRef, useState, type ReactNode, type SyntheticEvent } from "react";
import { Box, Button, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Tooltip } from "@mui/material";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import { visuallyHidden } from "@mui/utils";
import { formatPrice } from "../../library/chartScale";
import { pricingUnitLabel } from "../../library/prices";
import { formatDate, type DateWindow } from "../../library/dates";
import type { ChartPrice } from "../../library/types";
import type { ChartOrigin } from "../../library/explorerItems";
import LineViz from "../Charts/LineViz";
import ExplorerGridItem from "../ExplorerGrid/ExplorerGridItem";
import PinButton from "../ExplorerGrid/PinButton";
import {
  previousObservationNote, priceEventGroupLabel, PRICE_CHANGE_GROUP_LIMIT, PRICE_CHANGE_PACKAGE_LIMIT, signedChange,
  type PriceEventGroup,
} from "../../library/priceActivity";

type Props = {
  groups: PriceEventGroup[],
  /** One row per group: its summary, details and anything it opens. */
  renderGroup: (group: PriceEventGroup) => ReactNode,
};

/** Events retain exact per-package values, even when the summary combines a date/unit/direction. */
export default function PriceEventsList({ groups, renderGroup }: Props) {
  const [showAll, setShowAll] = useState(false);
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
  prices: ChartPrice[], history: () => ChartPrice[], origin: ChartOrigin, colors: Map<string, string>,
  dateWindow: DateWindow,
  open: boolean,
  onToggle: (key: string, open: boolean) => void,
  /** Narrow: the amount folds under the percent. */
  compact: boolean,
  onFocusInChart: (inChart: boolean) => void,
};

/** A group's Package details disclosure; its open state belongs to the caller. */
export function PriceEventDetails({ group, prices, history, origin, colors, dateWindow, open, onToggle, compact, onFocusInChart }: DetailsProps) {
  return <Box component="details" open={open}
    // A toggle React caused (the default changed) leaves `open` as rendered; only the user's differs.
    onToggle={(event: SyntheticEvent<HTMLDetailsElement>) => {
      const now = event.currentTarget.open;
      if (now !== open) onToggle(group.key, now);
    }}
    sx={{ fontSize: "0.875rem", color: "text.secondary", maxWidth: "100%", "& > summary": { cursor: "pointer", width: "fit-content" } }}>
    <summary>Package details</summary>
    <PackageTable group={group} prices={prices} history={history} origin={origin} colors={colors} dateWindow={dateWindow}
      compact={compact} onFocusInChart={onFocusInChart} />
  </Box>;
}

/**
 * One row per package: NDC, old and new price, and the change. The group's label already gives
 * the date, unit and direction, so rows repeat none of them.
 */
function PackageTable(props: Omit<DetailsProps, "open" | "onToggle">) {
  const { group, prices, history, origin, colors, dateWindow, compact, onFocusInChart } = props;
  const [showAll, setShowAll] = useState(false);
  const tableId = useId();
  const unit = pricingUnitLabel(group.pricingUnit);
  const capped = group.events.length > PRICE_CHANGE_PACKAGE_LIMIT;
  const events = showAll || !capped ? group.events : group.events.slice(0, PRICE_CHANGE_PACKAGE_LIMIT);
  const glyph = group.direction === "drop" ? "▼" : "▲";
  const glyphColor = group.direction === "drop" ? "chart.drop" : "chart.rise";
  return <Box sx={{ maxWidth: "100%", overflowX: "auto", mt: 0.5 }}>
    <Table id={tableId} size="small" sx={{
      width: "100%",
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
        {events.map(event => <PackageEventRow key={`${event.seriesNdc}:${event.packageNdc}`} event={event} group={group}
          prices={prices} history={history} origin={origin} colors={colors} dateWindow={dateWindow} compact={compact}
          onFocusInChart={onFocusInChart} glyph={glyph} glyphColor={glyphColor} />)}
      </TableBody>
    </Table>
    {capped && <Button size="small" sx={{ ml: -0.5 }} aria-expanded={showAll} aria-controls={tableId}
      onClick={() => setShowAll(value => !value)}>
      {showAll ? "Show fewer packages" : `Show all ${group.events.length} packages`}
    </Button>}
  </Box>;
}

function PackageEventRow({ event, group, prices, history, origin, colors, dateWindow, compact, onFocusInChart, glyph, glyphColor }:
  Omit<DetailsProps, "open" | "onToggle"> & { event: PriceEventGroup["events"][number], glyph: string, glyphColor: string }) {
  const chartId = useId();
  const [open, setOpen] = useState<{ prices: ChartPrice[], history: ChartPrice[] } | null>(null);
  const current = open?.prices === prices ? open : null;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const title = `Price change · ${formatDate(group.date)} · ${event.packageNdc} · per ${pricingUnitLabel(group.pricingUnit)}`;
  const { percent, amount } = signedChange(event.change);
  const note = previousObservationNote(event, group);
  useEffect(() => {
    if (!current || !headingRef.current?.checkVisibility()) return;
    headingRef.current.focus({ preventScroll: true });
    headingRef.current.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [current]);
  const toggle = useCallback(() => {
    if (current) { setOpen(null); return; }
    setOpen({ prices, history: history().filter(p => p.ndc === event.packageNdc && p.pricingUnit === group.pricingUnit) });
  }, [current, prices, history, event.packageNdc, group.pricingUnit]);
  const close = () => { setOpen(null); onFocusInChart(false); buttonRef.current?.focus(); };
  return <Fragment>
    <TableRow>
      <TableCell component="th" scope="row">
        {event.packageNdc}
        <Tooltip title={current ? "Close this chart" : "Chart this change"}>
          <IconButton ref={buttonRef} size="small" aria-label={`${current ? "Close" : "Chart"} price change for ${event.packageNdc}`}
            aria-expanded={!!current} aria-controls={current ? chartId : undefined} onClick={toggle}
            sx={{ ml: 0.5, color: current ? "primary.main" : "text.secondary", ...(compact ? { minWidth: 44, minHeight: 44 } : {}) }}>
            <ShowChartIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {note && <Box component="span" sx={{ display: "block", color: "text.secondary", typography: "caption" }}>{note}</Box>}
      </TableCell>
      <TableCell align="right" sx={{ color: "text.secondary" }}>{formatPrice(event.change.oldPrice)}</TableCell>
      <TableCell align="right">{formatPrice(event.change.newPrice)}</TableCell>
      <TableCell align="right"><Box component="span" aria-hidden sx={{ color: glyphColor, mr: 0.5, fontSize: "0.75em" }}>{glyph}</Box>
        {percent}{compact && <Box component="span" sx={{ display: "block", color: "text.secondary", typography: "caption" }}>{amount}</Box>}
      </TableCell>
      {!compact && <TableCell align="right" sx={{ color: "text.secondary" }}>{amount}</TableCell>}
    </TableRow>
    {current && <TableRow><TableCell colSpan={compact ? 4 : 5} sx={{ whiteSpace: "normal", p: 0, border: 0 }}>
      <Box id={chartId} sx={{ mt: 1, minWidth: 0 }}
      onFocus={() => onFocusInChart(true)}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) onFocusInChart(false); }}>
      <ExplorerGridItem title={title} headingLevel={4} headingRef={headingRef}
        actions={<><PinButton title={title} chartType="line" prices={current.history} history={() => current.history}
          origin={origin} colors={colors} dateWindow={dateWindow} eventDate={group.date} />
          <Button size="small" onClick={close}>Close</Button></>}>
        <LineViz nadacPrices={current.history} title={title} colors={colors} dateWindow={dateWindow} seriesKind="package"
          eventDate={group.date} />
      </ExplorerGridItem>
      </Box>
    </TableCell></TableRow>}
  </Fragment>;
}
