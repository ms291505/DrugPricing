import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { derivePriceEvents, groupPriceEvents, type PriceEventGroup } from "../../library/priceActivity";
import type { ChartPrice } from "../../library/types";
import type { ChartOrigin } from "../../library/explorerItems";
import { formatDate, type DateWindow } from "../../library/dates";
import { pricingUnitLabel } from "../../library/prices";
import useWidthTier from "../../hooks/useWidthTier";
import PriceEventsList from "./PriceEventsList";
import LineViz from "../Charts/LineViz";
import ExplorerGridItem from "../ExplorerGrid/ExplorerGridItem";
import PinButton from "../ExplorerGrid/PinButton";

type Props = {
  prices: ChartPrice[], history: () => ChartPrice[], origin: ChartOrigin, colors: Map<string, string>,
  /** The dates the page shows: the window of a change's chart. */
  dateWindow: DateWindow,
};

/** Replaces automatic event charts with a compact list. A chart opens only for an explicit event. */
export default function PriceChangesSection(props: Props) {
  const groups = useMemo(() => groupPriceEvents(derivePriceEvents(props.prices, "package")), [props.prices]);
  // The user's own open/close of a group's package details, kept while the page is mounted.
  const [detailsChoice, setDetailsChoice] = useState<ReadonlyMap<string, boolean>>(new Map());
  const onDetailsToggle = useCallback((key: string, open: boolean) =>
    setDetailsChoice(prev => new Map(prev).set(key, open)), []);
  if (!groups.length) return null;
  return <PriceChanges {...props} groups={groups} detailsChoice={detailsChoice} onDetailsToggle={onDetailsToggle} />;
}

type ListProps = Props & {
  groups: PriceEventGroup[],
  detailsChoice: ReadonlyMap<string, boolean>,
  onDetailsToggle: (key: string, open: boolean) => void,
};

function PriceChanges({ prices, history, origin, colors, dateWindow, groups, detailsChoice, onDetailsToggle }: ListProps) {
  const headingId = useId();
  const chartId = useId();
  // The section's own width: a workspace pane can be narrow in a wide window.
  const [sectionRef, widthTier] = useWidthTier<HTMLElement>();
  const [focus, setFocus] = useState<{ prices: ChartPrice[], group: PriceEventGroup, history: ChartPrice[], trigger: HTMLButtonElement } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const current = focus?.prices === prices ? focus : null;
  useEffect(() => {
    if (!current || !headingRef.current?.checkVisibility()) return;
    headingRef.current.focus({ preventScroll: true });
    headingRef.current.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [current]);
  const close = () => { if (current) { setFocus(null); current.trigger.focus(); } };
  // Package details start open from `md` up and closed below; a group the user toggled keeps that.
  const defaultOpen = widthTier === "wide";
  const title = current ? `Price change · ${formatDate(current.group.date)} · per ${pricingUnitLabel(current.group.pricingUnit)}` : "";
  return <Box component="section" ref={sectionRef} aria-labelledby={headingId} sx={{ minWidth: 0, px: { xs: 1, sm: 0 } }}>
    <Typography id={headingId} component="h3" variant="subtitle1">Price changes</Typography>
    <Typography variant="body2" color="text.secondary">Package changes of 10% or more in these dates and filters.</Typography>
    <PriceEventsList groups={groups} actionLabel="Chart this change" compact={widthTier === "narrow"}
      expanded={{ key: current?.group.key ?? null, controls: chartId }}
      details={{ isOpen: key => detailsChoice.get(key) ?? defaultOpen, onToggle: onDetailsToggle }}
      onAction={(group, trigger) => {
        if (current?.group.key === group.key) { setFocus(null); return; }
        const affected = new Set(group.events.map(e => e.packageNdc));
        setFocus({ prices, group, trigger, history: history().filter(p => affected.has(p.ndc) && p.pricingUnit === group.pricingUnit) });
      }} />
    {/* Keyed by the change, so the readout's lock starts on each new change's date. */}
    {current && <Box id={chartId} key={current.group.key} sx={{ mt: 1 }}><ExplorerGridItem title={title} headingLevel={4} headingRef={headingRef}
      actions={<><PinButton title={title} chartType="line" prices={current.history} history={() => current.history}
        origin={origin} colors={colors} dateWindow={dateWindow} eventDate={current.group.date} />
        <Button size="small" onClick={close}>Close</Button></>}>
      <LineViz nadacPrices={current.history} title={title} colors={colors} dateWindow={dateWindow} seriesKind="package"
        eventDate={current.group.date} />
    </ExplorerGridItem></Box>}
  </Box>;
}
