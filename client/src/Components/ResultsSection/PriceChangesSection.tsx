import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { aroundPriceEvent, derivePriceEvents, groupPriceEvents, type PriceEventGroup } from "../../library/priceActivity";
import type { ChartPrice } from "../../library/types";
import type { ChartOrigin } from "../../library/explorerItems";
import { formatDate } from "../../library/dates";
import { pricingUnitLabel } from "../../library/prices";
import PriceEventsList from "./PriceEventsList";
import LineViz from "../Charts/LineViz";
import ExplorerGridItem from "../ExplorerGrid/ExplorerGridItem";
import PinButton from "../ExplorerGrid/PinButton";

type Props = {
  prices: ChartPrice[], history: () => ChartPrice[], origin: ChartOrigin, colors: Map<string, string>,
  productLevel?: boolean, onSelect: (group: PriceEventGroup) => void,
};

/** Replaces automatic event charts with a compact list. A chart opens only for an explicit event focus. */
export default function PriceChangesSection({ prices, history, origin, colors, productLevel, onSelect }: Props) {
  const headingId = useId();
  const groups = useMemo(() => groupPriceEvents(derivePriceEvents(prices, "package")), [prices]);
  const [focus, setFocus] = useState<{ prices: ChartPrice[], group: PriceEventGroup, history: ChartPrice[], trigger: HTMLButtonElement } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const current = focus?.prices === prices ? focus : null;
  useEffect(() => {
    if (!current || !headingRef.current?.checkVisibility()) return;
    headingRef.current.focus({ preventScroll: true });
    headingRef.current.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, [current]);
  if (!groups.length) return null;
  const title = current ? `Price change · ${formatDate(current.group.date)} · per ${pricingUnitLabel(current.group.pricingUnit)}` : "";
  const window = current ? aroundPriceEvent(current.group.events) : null;
  return <Box component="section" aria-labelledby={headingId} sx={{ minWidth: 0, px: { xs: 1, sm: 0 } }}>
    <Typography id={headingId} component="h3" variant="subtitle1">Price changes</Typography>
    <Typography variant="body2" color="text.secondary">Package changes of 10% or more in these dates and filters.</Typography>
    <PriceEventsList groups={groups} onSelect={onSelect} productLevel={productLevel}
      onFocus={(group, trigger) => {
        const affected = new Set(group.events.map(e => e.packageNdc));
        setFocus({ prices, group, trigger, history: history().filter(p => affected.has(p.ndc) && p.pricingUnit === group.pricingUnit) });
      }} />
    {current && window && <Box sx={{ mt: 1 }}><ExplorerGridItem title={title} headingLevel={4} headingRef={headingRef}
      actions={<><PinButton title={title} chartType="line" prices={current.history} history={() => current.history}
        origin={origin} colors={colors} dateWindow={window} />
        <Button size="small" onClick={() => { setFocus(null); current.trigger.focus(); }}>Close</Button></>}>
      <LineViz nadacPrices={current.history} title={title} colors={colors} dateWindow={window} seriesKind="package" />
    </ExplorerGridItem></Box>}
  </Box>;
}
