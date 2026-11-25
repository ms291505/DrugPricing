import { useEffect, useId, useRef, type MouseEvent } from "react";
import toast from "react-hot-toast";
import { Box, Button, ButtonGroup, Typography } from "@mui/material";
import BarChartIcon from "@mui/icons-material/BarChart";
import SsidChartIcon from "@mui/icons-material/SsidChart";
import { usePinActions } from "../../Context/pinnedItemsContexts";
import { useSettings } from "../../Context/SettingsContext";
import { createChartItems, withLoadedDates, type ChartSource, type ChartType } from "../../library/explorerItems";
import { chartTitle, seriesLabels } from "../../library/chartTitles";
import {
  chartControlLabel, countSeries, manySeries, manySeriesWarning, overSeriesLimit, seriesLimitNotice,
} from "../../library/chartSeries";
import type { ChartPrice } from "../../library/types";
import type { LiveCharts } from "../../hooks/useLiveCharts";
import { fromKeyboard, nearestVisible } from "../ui/focus";

type Props = {
  /** At the table's level: a pin keeps its loaded dates, origin and colors. */
  source: ChartSource,
  /** The shown prices of the selected rows (`selectedChartPrices`): what Line and Bar chart. */
  chartPrices: ChartPrice[],
  /** The rows checked, shown or hidden: the label names the hidden ones. */
  selectedCount: number,
  charts: LiveCharts,
  /** The results' narrow tier: the label goes above the buttons, which are touch-sized. */
  compact: boolean,
};

const CHART_TYPES: Array<{ type: ChartType, label: string, Icon: typeof BarChartIcon }> = [
  { type: "line", label: "Line", Icon: SsidChartIcon },
  { type: "bar", label: "Bar", Icon: BarChartIcon },
];

/**
 * The results toolbar's label and Line / Bar toggles. Each toggle shows or hides a live card of
 * the selected rows (`SelectionCharts`), which follows the selection, dates and filters until the
 * user pins a copy. With Pin charts when you make them on, turning one on also pins a copy.
 */
export default function ChartControl({ source, chartPrices, selectedCount, charts, compact }: Props) {
  const { loadedPrices, origin, dateWindow, colors } = source;
  const { addItems } = usePinActions();
  const { settings } = useSettings();
  // At the table's level a shown row is one series, so this is also the shown selected rows.
  const seriesCount = countSeries(chartPrices);
  const hiddenCount = selectedCount - seriesCount;
  // Nothing to draw, or too much: a chart can't be turned on, but one that's on (a filter hid its
  // rows) can still be turned off.
  const cantTurnOn = seriesCount === 0 || overSeriesLimit(seriesCount);
  const { on, toggle, closedAtSeries } = charts;
  const labelId = useId();

  // Toasts follow what is charted, so they come from what rendered rather than from the toggle:
  // the selection changes in the table. The warning shows on crossing `CHART_SERIES_WARNING`
  // with a chart on, and again only after the count drops back and crosses again.
  const charting = on.line || on.bar ? seriesCount : 0;
  const wasMany = useRef(false);
  useEffect(() => {
    const many = manySeries(charting);
    if (many && !wasMany.current) toast(manySeriesWarning(charting));
    wasMany.current = many;
  }, [charting]);
  useEffect(() => {
    if (closedAtSeries !== null) toast(seriesLimitNotice(closedAtSeries));
  }, [closedAtSeries]);

  const pin = (chartType: ChartType) => {
    const items = createChartItems({
      chartType,
      prices: withLoadedDates(chartPrices, loadedPrices()),
      defaultTitle: chartTitle(chartType, origin.searchLabel, origin.seriesKind, seriesLabels(chartPrices)),
      origin,
      dateWindow,
      colors,
    }, unitPrices => chartTitle(chartType, origin.searchLabel, origin.seriesKind, seriesLabels(unitPrices)));
    addItems(items);
    if (items.length > 1) toast.success(`Pinned ${items.length} ${chartType} charts, one per pricing unit (${items.map(item => item.series[0].unit).join(", ")}).`);
    else if (items.length === 1) toast.success(`Pinned a ${chartType} chart.`);
  };

  const handleToggle = (chartType: ChartType, event: MouseEvent<HTMLElement>) => {
    const turningOn = !on[chartType];
    toggle(chartType);
    if (!turningOn) return;
    if (settings.autoPinCharts) pin(chartType);
    // The toolbar is above the table, so the new card can be off screen: bring it into view
    // for everyone, and from the keyboard move focus to its heading so keyboard users land on
    // what they made. A tap leaves focus on the toggle. The card renders with this click, so
    // look for it on the next frame.
    const button = event.currentTarget;
    const keyboard = fromKeyboard(event);
    requestAnimationFrame(() => {
      const card = nearestVisible(button, `[data-live-chart="${chartType}"]`);
      if (!card) return;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      card.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
      if (keyboard) card.querySelector<HTMLElement>("[data-card-heading]")?.focus({ preventScroll: true });
    });
  };

  return (
    // Narrow: the label is a caption above Line and Bar, so they and Scan fit one line on a phone.
    // The two make one block, as wide as the wider, so the caption reads as the buttons' own.
    <Box sx={compact
      ? { display: "flex", flexDirection: "column", alignItems: "stretch", gap: 0.25 }
      : { display: "flex", alignItems: "center", gap: 1 }}>
      <Typography id={labelId} variant={compact ? "caption" : "body2"} color={cantTurnOn ? "text.secondary" : "text.primary"}>
        {chartControlLabel(seriesCount, hiddenCount)}
      </Typography>
      <ButtonGroup size="small" variant="outlined" fullWidth={compact} aria-labelledby={labelId}>
        {CHART_TYPES.map(({ type, label, Icon }) => (
          <Button key={type} startIcon={<Icon />} variant={on[type] ? "contained" : "outlined"} aria-pressed={on[type]}
            disabled={cantTurnOn && !on[type]}
            aria-label={`${label} chart of ${seriesCount} selected`} onClick={event => handleToggle(type, event)}
            sx={compact ? { minHeight: 44 } : undefined}>
            {label}
          </Button>
        ))}
      </ButtonGroup>
    </Box>
  );
}
