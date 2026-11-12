import { useId, useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import { type ChartPrice, } from "../../library/types.ts";
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ReferenceDot, ReferenceLine, } from "recharts";
import { averagedLineCaption, createLineVizData, rangeKey, visibleBandNdcs, type LineVizRow } from "../../library/createLineVizData.ts";
import { pricingUnitLabel } from "../../library/prices.ts";
import { dateTicks, formatPrice, formatPriceLabel, linePriceAxis, priceTickFormatter } from "../../library/chartScale.ts";
import UnitSplit from "./UnitSplit.tsx";
import { lineChartSummary } from "../../library/chartSummary.ts";
import { lineAnnouncement, lineReadoutHeight, rowAtIndex, tooltipRows, type TooltipRow } from "../../library/chartReadout.ts";
import useChartReadout from "../../hooks/useChartReadout.tsx";
import useLockedPoint from "../../hooks/useLockedPoint.ts";
import { DOCKED_TOOLTIP, ReadoutContent, ReadoutDock, ReadoutHeader, type ReadoutStatus } from "./ReadoutDock.tsx";
import { canHide, seriesSetKey, showGroup, toggleSeries, visibleSeries } from "../../library/seriesVisibility.ts";
import SeriesLegend from "./SeriesLegend.tsx";
import ChartData, { LineDataTable } from "./ChartData.tsx";
import { lineCsv, lineDataRows } from "../../library/chartCsv.ts";
import { clipToWindow, dateBounds, formatDate, FULL_WINDOW, type DateWindow } from "../../library/dates.ts";
import type { ChartChangeSpan } from "../../library/explorerItems.ts";
import useChartTheme from "../../hooks/useChartTheme.ts";
import useMobile from "../../hooks/useMobile.ts";

type Props = {
  nadacPrices: ChartPrice[];
  /** The card's title: the chart's accessible name. */
  title: string;
  /** Color per NDC, from the page (`useSeriesColors`) or a pinned snapshot. Others take palette order. */
  colors?: Map<string, string>;
  /** The dates to show. The axis spans the whole window, even where there are no prices. */
  dateWindow?: DateWindow;
  /** A price change to call out on the line. */
  changeSpan?: ChartChangeSpan;
  /** Shared price range per pricing unit ("Match scale"); units not in it fit their own data. */
  priceRanges?: Map<string, [number, number]>;
};

export default function LineViz({ nadacPrices, title, colors, dateWindow = FULL_WINDOW, changeSpan, priceRanges }: Props) {
  // Charts split by unit share one date axis: the window, with open ends at the data's dates.
  const shownPrices = useMemo(() => clipToWindow(nadacPrices, dateWindow), [nadacPrices, dateWindow]);
  const bounds = useMemo(() => dateBounds(shownPrices), [shownPrices]);
  const xDomain: [number, number] = [dateWindow.start ?? bounds?.first ?? 0, dateWindow.end ?? bounds?.last ?? 0];

  // Legend toggles are view state. A new set of series in the dates starts with every series shown.
  const seriesKey = useMemo(() => seriesSetKey(shownPrices.map(price => price.ndc)), [shownPrices]);
  const [visibility, setVisibility] = useState({ seriesKey, hidden: NONE_HIDDEN });
  const hidden = visibility.seriesKey === seriesKey ? visibility.hidden : NONE_HIDDEN;
  const update = (change: (current: ReadonlySet<string>) => ReadonlySet<string>) => setVisibility(prev => ({
    seriesKey,
    hidden: change(prev.seriesKey === seriesKey ? prev.hidden : NONE_HIDDEN),
  }));
  const toggle = (ndc: string, group: string[]) => update(current => toggleSeries(current, ndc, group));
  const showAll = (group: string[]) => update(current => showGroup(current, group));

  return (<Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
    <UnitSplit
      nadacPrices={nadacPrices}
      dateWindow={dateWindow}
      renderChart={(unitPrices, pricingUnit) => (
        <UnitLineChart
          nadacPrices={unitPrices}
          pricingUnit={pricingUnit}
          title={title}
          colors={colors}
          hidden={hidden}
          onToggle={toggle}
          onShowAll={showAll}
          xDomain={xDomain}
          changeSpan={changeSpan}
          priceRange={priceRanges?.get(pricingUnit)}
        />
      )}
    />
    {bounds
      ? <ChartData title={title} bounds={bounds} toCsv={() => lineCsv(lineDataRows(nadacPrices, dateWindow))}>
        <LineDataTable prices={nadacPrices} dateWindow={dateWindow} bounds={bounds} />
      </ChartData>
      : null}
  </Box>);
}

const NONE_HIDDEN: ReadonlySet<string> = new Set();
/** Other series' strength while one is highlighted from the legend. */
const DIMMED_OPACITY = 0.25;
/** The package-range band's strength behind its line. */
const BAND_OPACITY = 0.3;

type UnitLineChartProps = {
  nadacPrices: ChartPrice[];
  pricingUnit: string;
  title: string;
  colors?: Map<string, string>;
  hidden: ReadonlySet<string>;
  onToggle: (ndc: string, group: string[]) => void;
  onShowAll: (group: string[]) => void;
  xDomain: [number, number];
  changeSpan?: ChartChangeSpan;
  priceRange?: [number, number];
};

function UnitLineChart({ nadacPrices, pricingUnit, title, colors, hidden, onToggle, onShowAll, xDomain, changeSpan, priceRange }: UnitLineChartProps) {
  const chartTheme = useChartTheme();
  const isMobile = useMobile();
  const descriptionId = useId();
  const [highlighted, setHighlighted] = useState<string | null>(null);

  // Derived once per set of prices: the legend's hover highlight re-renders the chart.
  const ndcs = useMemo(() => [...new Set(nadacPrices.map((nadacPrice) => nadacPrice.ndc))], [nadacPrices]);
  const shownNdcs = useMemo(() => visibleSeries(ndcs, hidden), [ndcs, hidden]);
  // A series hidden while under the pointer dims nothing.
  const focusNdc = highlighted && shownNdcs.includes(highlighted) ? highlighted : null;
  const opacityOf = (ndc: string) => focusNdc && focusNdc !== ndc ? DIMMED_OPACITY : 1;

  const { rows: vizData, rangeNdcs, packageCounts } = useMemo(() => createLineVizData(nadacPrices), [nadacPrices]);

  const descriptionFor = (ndc: string) => nadacPrices.find((price) => price.ndc === ndc)?.ndcDescription ?? "";

  const unit = pricingUnitLabel(pricingUnit);

  // One lookup for both the band and its line, so they always share a color. From the full list,
  // so hiding a series doesn't recolor the others.
  const colorFor = (ndc: string) =>
    colors?.get(ndc) ?? chartTheme.palette[ndcs.indexOf(ndc) % chartTheme.palette.length];

  const [xStart, xEnd] = xDomain;
  const xTicks = useMemo(() => dateTicks(xStart, xEnd, isMobile ? 4 : 7), [xStart, xEnd, isMobile]);

  const yAxis = useMemo(() => linePriceAxis(nadacPrices, shownNdcs, priceRange), [nadacPrices, shownNdcs, priceRange]);

  const bandNdcs = useMemo(
    () => visibleBandNdcs(vizData, shownNdcs.filter(ndc => rangeNdcs.has(ndc)), yAxis.domain),
    [vizData, shownNdcs, rangeNdcs, yAxis.domain]);
  const bandCaption = averagedLineCaption(bandNdcs, shownNdcs.length, packageCounts);

  const readout = useChartReadout((row: LineVizRow) => row.asOfDate, date => {
    const row = vizData.find(r => r.asOfDate === date);
    const rows = row ? tooltipRows(row, shownNdcs) : [];
    return rows.length ? lineAnnouncement(date, unit, rows) : null;
  });

  // The docked readout: the hovered date, else the locked one, else the latest.
  const [dock, setDock] = useState<HTMLDivElement | null>(null);
  const lock = useLockedPoint<number>(readout.currentKey);
  const latestDate = vizData.at(-1)?.asOfDate;

  const changeColor = changeSpan?.direction === "rise" ? chartTheme.rise
    : changeSpan?.direction === "drop" ? chartTheme.drop
      : chartTheme.textSecondary;

  return (<>
    <ReadoutDock portalRef={setDock} minHeight={lineReadoutHeight(shownNdcs.length, isMobile)} />
    <Box
      {...readout.focusProps}
      onKeyDown={event => {
        readout.focusProps.onKeyDown();
        lock.onKeyDown(event);
      }}
    >
      <ComposedChart
        data={vizData}
        onClick={state => lock.toggle(rowAtIndex(vizData, state.activeTooltipIndex)?.asOfDate)}
        margin={chartTheme.margin}
        style={{ width: "100%", aspectRatio: isMobile ? "4 / 3" : "16 / 9", minHeight: 220, maxHeight: 420 }}
        responsive
        // Recharts makes the SVG a focusable `role="application"`, which passes arrow keys through.
        aria-label={`${title}, USD per ${unit}`}
        aria-describedby={descriptionId}
      >
        <XAxis
          dataKey="asOfDate"
          scale="time"
          type="number"
          domain={xDomain}
          ticks={xTicks.ticks}
          tickFormatter={xTicks.format}
          tick={chartTheme.tick}
          axisLine={chartTheme.axisLine}
          tickLine={chartTheme.axisLine}
        />
        <YAxis
          width="auto"
          domain={yAxis.domain}
          ticks={yAxis.ticks}
          tickFormatter={priceTickFormatter(yAxis.ticks)}
          tick={chartTheme.tick}
          axisLine={chartTheme.axisLine}
          tickLine={chartTheme.axisLine}
        />
        <Tooltip
          {...DOCKED_TOOLTIP}
          portal={dock}
          // Locked: the pointer no longer moves the readout.
          active={lock.locked !== null ? false : undefined}
          content={({ active, payload }) => {
            const hovered = active && payload?.length ? payload[0].payload as LineVizRow : undefined;
            const date = hovered?.asOfDate ?? lock.locked ?? latestDate;
            const row = hovered ?? vizData.find(r => r.asOfDate === date);
            if (date === undefined || !row) return null;
            return (
              <LineReadout
                date={date}
                unit={unit}
                rows={tooltipRows(row, shownNdcs)}
                status={hovered ? "hover" : lock.locked !== null ? "locked" : "default"}
                onUnlock={lock.unlock}
                colorFor={colorFor}
                descriptionFor={isMobile ? undefined : descriptionFor}
              />
            );
          }}
        />
        {lock.locked !== null
          ? <ReferenceLine x={lock.locked} stroke={chartTheme.textSecondary} strokeDasharray="3 3" />
          : null}
        {changeSpan ? changeCallout(changeSpan, changeColor, xDomain, chartTheme) : null}
        {bandNdcs.map((ndc) => (
          <Area
            key={rangeKey(ndc)}
            dataKey={rangeKey(ndc)}
            type="stepAfter"
            stroke="none"
            fill={colorFor(ndc)}
            fillOpacity={BAND_OPACITY * opacityOf(ndc)}
            activeDot={false}
            legendType="none"
            tooltipType="none"
            connectNulls={false}
            isAnimationActive={false}
          />
        ))}
        {shownNdcs.map((ndc) => (
          <Line
            key={ndc}
            dataKey={ndc}
            stroke={colorFor(ndc)}
            strokeOpacity={opacityOf(ndc)}
            strokeWidth={2}
            // NADAC prices hold until the next weekly file: steps, not curves between weeks.
            type="stepAfter"
            dot={false}
            connectNulls={false}
            name={ndc}
            // Off: recharts morphs old lines into new ones and draws made-up prices.
            isAnimationActive={false}
          />
        ))}
        {readout.reporter}
      </ComposedChart>
    </Box>
    {readout.liveRegion}
    {/* One series is named by the card's title; a legend would only repeat it. */}
    {ndcs.length > 1
      ? <SeriesLegend
        series={ndcs.map(ndc => ({
          ndc,
          color: colorFor(ndc),
          description: descriptionFor(ndc),
          shown: !hidden.has(ndc),
          canHide: canHide(hidden, ndc, ndcs),
        }))}
        onToggle={ndc => onToggle(ndc, ndcs)}
        onShowAll={() => onShowAll(ndcs)}
        onHighlight={setHighlighted}
      />
      : null}
    <Box id={descriptionId} sx={visuallyHidden}>{lineChartSummary(nadacPrices, changeSpan)}</Box>
    {/* Said once here rather than in every tooltip row. */}
    {bandCaption
      ? <Typography variant="caption" color="text.secondary">{bandCaption}</Typography>
      : null}
  </>);
}

type LineReadoutProps = {
  date: number,
  unit: string,
  rows: TooltipRow[],
  status: ReadoutStatus,
  onUnlock: () => void,
  colorFor: (ndc: string) => string,
  /** Each series' description, left out on a phone to keep the readout small. */
  descriptionFor?: (ndc: string) => string,
}

/**
 * The prices on one date, highest first: a swatch, the NDC and the price per row, with the
 * description and, for an averaged product, its packages' range beneath on wider screens.
 */
function LineReadout({ date, unit, rows, status, onUnlock, colorFor, descriptionFor }: LineReadoutProps) {
  return (
    <ReadoutContent
      header={<ReadoutHeader status={status} onUnlock={onUnlock}>
        <Box component="span" sx={{ fontWeight: 600 }}>{formatDate(date)}</Box>
        <Box component="span" sx={{ color: "text.secondary" }}>
          {" "}· per {unit}{status === "default" ? " · latest" : ""}
        </Box>
      </ReadoutHeader>}
    >
      {rows.map(({ ndc, price, range }) => {
        const rangeText = range ? `Packages ${formatPrice(range[0])}–${formatPrice(range[1])}` : null;
        return (
          <Box key={ndc}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: colorFor(ndc), flexShrink: 0 }} />
              <Typography variant="body2" sx={{ flexGrow: 1 }}>{ndc}</Typography>
              <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{formatPrice(price)}</Typography>
            </Box>
            {descriptionFor
              ? <Typography variant="caption" color="text.secondary" component="div" sx={{ pl: 2.25 }}>
                {descriptionFor(ndc)}
                {rangeText ? <><br />{rangeText}</> : null}
              </Typography>
              : null}
          </Box>
        );
      })}
    </ReadoutContent>
  );
}

/**
 * Calls out a price change on the line: dots at the old and new price, the old price continued
 * as a dashed line, and a "$9.69 → $5.52" pill. An array, since recharts needs reference elements
 * as direct chart children.
 */
function changeCallout(
  span: ChartChangeSpan,
  color: string,
  xDomain: [number, number],
  chartTheme: ReturnType<typeof useChartTheme>,
) {
  const { from, to } = span;
  // Pinned before the prices were stored: mark the date and label the percent.
  if (from === undefined || to === undefined) {
    return [
      <ReferenceLine
        key="change"
        x={span.end}
        stroke={color}
        strokeDasharray="4 4"
        label={{ value: span.label, position: "insideTopRight", fill: chartTheme.textPrimary, fontSize: chartTheme.fontSize }}
      />,
    ];
  }

  const text = `${formatPriceLabel(from)} → ${formatPriceLabel(to)}`;
  // Beside the step on the side with more room, halfway between the two prices.
  const placeLeft = (span.end - xDomain[0]) / (xDomain[1] - xDomain[0] || 1) > 0.6;
  const pillWidth = text.length * 7 + 16;
  const pillHeight = 22;

  const pill = (
    <ReferenceDot
      key="callout"
      x={span.end}
      y={(from + to) / 2}
      r={0}
      ifOverflow="visible"
      label={({ viewBox }: { viewBox?: { x?: number, y?: number } }) => {
        const x = (viewBox?.x ?? 0) + (placeLeft ? -pillWidth - 10 : 10);
        const y = (viewBox?.y ?? 0) - pillHeight / 2;
        return (
          <g>
            <rect x={x} y={y} width={pillWidth} height={pillHeight} rx={chartTheme.radius} fill={chartTheme.paper} stroke={color} />
            <text x={x + pillWidth / 2} y={y + pillHeight / 2} dy="0.35em" textAnchor="middle" fill={chartTheme.textPrimary} fontSize={chartTheme.fontSize}>
              {text}
            </text>
          </g>
        );
      }}
    />
  );

  return [
    <ReferenceLine
      key="old-price"
      segment={[{ x: span.end, y: from }, { x: xDomain[1], y: from }]}
      stroke={chartTheme.textSecondary}
      strokeDasharray="4 4"
    />,
    <ReferenceDot key="from" x={span.end} y={from} r={4} fill={chartTheme.paper} stroke={chartTheme.textSecondary} strokeWidth={2} />,
    <ReferenceDot key="to" x={span.end} y={to} r={5} fill={color} stroke={chartTheme.paper} strokeWidth={2} />,
    pill,
  ];
}
