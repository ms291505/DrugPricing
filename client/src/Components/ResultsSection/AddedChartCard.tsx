import { useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Grid, IconButton, Tooltip, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import BarViz from "../Charts/BarViz";
import LineViz from "../Charts/LineViz";
import ExplorerGridItem from "../ExplorerGrid/ExplorerGridItem";
import PinButton from "../ExplorerGrid/PinButton";
import { HALF_WIDTH_GRID_SIZE } from "../../library/constants";
import { barValueLabel, chartDates, chartTitle, hiddenSeriesNote, seriesCountLabel, seriesLabels, unitTitleEnd } from "../../library/chartTitles";
import { countSeries, openPricingUnits, selectedChartPrices } from "../../library/chartSeries";
import type { BarValue, ChartSource } from "../../library/explorerItems";
import { splitByPricingUnit } from "../../library/prices";
import type { AddedChart, AddedCharts } from "../../hooks/useAddedCharts";
import { moveFocusFromClosingCard } from "./closeCard";

const gridItemSx = { alignSelf: "flex-start", minWidth: 0 } as const;

/**
 * A chart Line or Bar added (`useAddedCharts`), in its place among the page's cards
 * (`ResultCards`). It draws its rows' shown prices, so it redraws with the dates and filters, as
 * one card per pricing unit, next to each other. It is never stored: Pin keeps a copy, and Close
 * removes that card (the last open one removes the chart). Each grid item carries
 * `data-added-chart` (the chart's id), which Show in the status line scrolls to.
 */
export default function AddedChartCard({ source, chart, onClose }: {
  /** At the table's level: its shown and loaded prices, origin, colors and dates. */
  source: ChartSource,
  chart: AddedChart,
  onClose: AddedCharts["close"],
}) {
  const ndcs = useMemo(() => new Set(chart.ndcs), [chart.ndcs]);
  const prices = useMemo(() => selectedChartPrices(source.prices, ndcs), [source.prices, ndcs]);
  const groups = useMemo(() => splitByPricingUnit(prices), [prices]);
  const openGroups = groups.filter(group => !chart.closedUnits.includes(group.pricingUnit));
  const hiddenCount = chart.ndcs.length - countSeries(prices);
  // Each unit's card closes on its own; the last open one removes the chart. A unit the dates or
  // filters hide right now is still open, so closing the last card on screen keeps the chart.
  const othersOpen = openPricingUnits(chart.pricingUnits, prices, chart.closedUnits).length > 1;
  const close = (pricingUnit: string | undefined) => (event: MouseEvent<HTMLElement>, card: HTMLElement | null) => {
    moveFocusFromClosingCard(card, event);
    onClose(chart.id, pricingUnit !== undefined && othersOpen ? pricingUnit : undefined);
  };

  // The dates or filters hide every open unit: the card stays, so it can be closed, and says why it's empty.
  if (!openGroups.length) {
    const title = chartTitle(source.origin.searchLabel, chart.labels);
    return (
      <UnitCard chart={chart} title={title} subtitle={hiddenSeriesNote(hiddenCount)} onClose={close(undefined)}>
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          The dates or filters hide {hiddenCount
            ? <>this chart’s {seriesCountLabel(hiddenCount, chart.seriesKind)}</>
            : "the rest of this chart"}.
        </Typography>
      </UnitCard>
    );
  }
  return openGroups.map(group => (
    <UnitChart key={group.pricingUnit} chart={chart}
      source={{ ...source, prices: group.nadacPrices }}
      pricingUnit={group.pricingUnit}
      hiddenCount={hiddenCount}
      onClose={close(group.pricingUnit)}
    />
  ));
}

type CloseHandler = (event: MouseEvent<HTMLElement>, card: HTMLElement | null) => void;

/** One pricing unit's card of an added chart. */
function UnitChart({ chart, source, pricingUnit, hiddenCount, onClose }: {
  chart: AddedChart, source: ChartSource, pricingUnit: string, hiddenCount: number, onClose: CloseHandler,
}) {
  const { prices, loadedPrices, origin, colors, dateWindow } = source;
  const [barValue, setBarValue] = useState<BarValue>("latest");
  const labels = seriesLabels(prices);
  const title = chartTitle(origin.searchLabel, labels, pricingUnit);
  // The header's details follow the bar value and dates as they change; the title (and a pin's) doesn't.
  const details = [chart.chartType === "bar" ? barValueLabel(barValue) : "", chartDates(dateWindow, prices)]
    .filter(Boolean).join(" · ");
  const subtitle = [seriesCountLabel(labels.length, origin.seriesKind), hiddenSeriesNote(hiddenCount)]
    .filter(Boolean).join(" · ");
  return (
    <UnitCard chart={chart} title={title} titleEnd={unitTitleEnd(title, pricingUnit)} details={details} subtitle={subtitle} onClose={onClose}
      pin={<PinButton
        title={title} chartType={chart.chartType} prices={prices} loadedPrices={loadedPrices} origin={origin} dateWindow={dateWindow}
        colors={colors} barValue={chart.chartType === "bar" ? barValue : undefined}
      />}>
      {chart.chartType === "line"
        ? <LineViz seriesKind={origin.seriesKind} nadacPrices={prices} title={title} colors={colors} dateWindow={dateWindow} />
        : <BarViz nadacPrices={prices} title={title} colors={colors} dateWindow={dateWindow}
          barValue={barValue} onBarValueChange={setBarValue} />}
    </UnitCard>
  );
}

/** The grid item and card frame, with Pin (when there is something to pin) and Close. */
function UnitCard({ chart, title, titleEnd, details, subtitle, pin, onClose, children }: {
  chart: AddedChart, title: string, titleEnd?: string, details?: string, subtitle: string, pin?: ReactNode, onClose: CloseHandler,
  children: ReactNode,
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <Grid ref={ref} size={HALF_WIDTH_GRID_SIZE} sx={gridItemSx} data-added-chart={chart.id}>
      <ExplorerGridItem title={title} titleEnd={titleEnd} details={details} subtitle={subtitle} headingLevel={3}
        actions={<>
          {pin}
          <Tooltip title="Close">
            <IconButton size="small" aria-label={`Close ${title}`} onClick={event => onClose(event, ref.current)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </>}>
        {children}
      </ExplorerGridItem>
    </Grid>
  );
}
