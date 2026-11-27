import HelpButton from "../Help/HelpButton";
import { useId, useMemo, useRef, useState, type MouseEvent } from "react";
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
import { fromKeyboard, holdsFocus } from "../ui/focus";
import { DOCKED_TOOLTIP, ReadoutContent, ReadoutDock, ReadoutHeader, type ReadoutStatus } from "./ReadoutDock.tsx";
import { canHide, seriesSetKey, showGroup, toggleSeries, visibleSeries } from "../../library/seriesVisibility.ts";
import SeriesLegend from "./SeriesLegend.tsx";
import ChartData, { LineDataTable } from "./ChartData.tsx";
import { lineCsv, lineDataRows } from "../../library/chartCsv.ts";
import { clipToWindow, dateBounds, formatDate, FULL_WINDOW, type DateWindow } from "../../library/dates.ts";
import { lineChangeCallouts } from "../../library/lineChanges";
import { derivePriceEvents, eventLabel, groupPriceEvents } from "../../library/priceActivity";
import type { ChartChangeSpan, SeriesKind } from "../../library/explorerItems.ts";
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
  seriesKind?: SeriesKind;
  showPriceChanges?: boolean;
  /**
   * The change the chart was opened for: a solid line marks its date, and the readout rests there
   * (instead of the latest date).
   */
  eventDate?: number;
};

export default function LineViz({ nadacPrices, title, colors, dateWindow = FULL_WINDOW, changeSpan, priceRanges, seriesKind = "ndc", showPriceChanges = true, eventDate }: Props) {
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

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
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
            seriesKind={seriesKind}
            showPriceChanges={showPriceChanges}
            eventDate={eventDate}
            priceRange={priceRanges?.get(pricingUnit)}
          />
        )}
      />
      {bounds
        ? <ChartData title={title} bounds={bounds} toCsv={() => lineCsv(lineDataRows(nadacPrices, dateWindow))}>
          <LineDataTable prices={nadacPrices} dateWindow={dateWindow} bounds={bounds} />
        </ChartData>
        : null}
    </Box>
  );
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
  seriesKind: SeriesKind;
  showPriceChanges: boolean;
  eventDate?: number;
};

function UnitLineChart({ nadacPrices, pricingUnit, title, colors, hidden, onToggle, onShowAll, xDomain, changeSpan, priceRange, seriesKind, showPriceChanges, eventDate }: UnitLineChartProps) {
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

  const visiblePrices = useMemo(() => nadacPrices.filter(p => shownNdcs.includes(p.ndc)), [nadacPrices, shownNdcs]);
  const events = useMemo(() => derivePriceEvents(visiblePrices, seriesKind), [visiblePrices, seriesKind]);
  const callouts = useMemo(() => showPriceChanges ? lineChangeCallouts(visiblePrices, seriesKind, events) : [], [visiblePrices, seriesKind, events, showPriceChanges]);
  const eventGroups = useMemo(() => groupPriceEvents(events), [events]);
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
    const events = eventGroups.filter(group => group.date === date).flatMap(group => group.events);
    return rows.length ? lineAnnouncement(date, unit, rows)
      + (events.length ? ` ${events.map(e => `${e.packageNdc}: ${eventLabel(e.change)}.`).join(" ")}` : "") : null;
  });

  // The docked readout: the hovered date, else the locked one, else the chart's change or the latest.
  const [dock, setDock] = useState<HTMLDivElement | null>(null);
  const dates = useMemo(() => new Set(vizData.map(row => row.asOfDate)), [vizData]);
  const lock = useLockedPoint<number>(readout.currentKey, date => dates.has(date));
  const eventShown = eventDate !== undefined && dates.has(eventDate);
  const restDate = eventShown ? eventDate : vizData.at(-1)?.asOfDate;
  // Unlock unmounts with the lock: when it had focus, give focus back to the chart, not the page.
  // After a tap on iOS it has none, so nothing moves.
  const focusBox = useRef<HTMLDivElement>(null);
  const focusChart = (options?: FocusOptions) => focusBox.current?.querySelector<SVGElement>("svg[tabindex]")?.focus(options);
  const unlockAndFocus = (event: MouseEvent<HTMLElement>) => {
    const hadFocus = holdsFocus(event.currentTarget);
    lock.unlock();
    if (hadFocus) focusChart({ preventScroll: !fromKeyboard(event) });
  };
  const rangeCount = shownNdcs.filter(ndc => rangeNdcs.has(ndc)).length;

  const legacySpanVisible = changeSpan && changeSpan.start >= xStart && changeSpan.end <= xEnd;
  const changeColor = changeSpan?.direction === "rise" ? chartTheme.rise
    : changeSpan?.direction === "drop" ? chartTheme.drop
      : chartTheme.textSecondary;

  return (
    <>
      <ReadoutDock portalRef={setDock} minHeight={lineReadoutHeight(shownNdcs.length, isMobile, rangeCount)} />
      <Box
        ref={focusBox}
        {...readout.focusProps}
        onKeyDown={event => {
          readout.focusProps.onKeyDown();
          const wasLocked = lock.locked !== null;
          lock.onKeyDown(event);
          // Esc from Unlock unmounts it with the focus: give it back to the chart.
          if (event.key === "Escape" && wasLocked) focusChart();
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
            // An element, not a function: recharts renders a function as a component type, so an
            // inline one remounts the readout on every render, and Unlock with it as Tab reaches it.
            content={(
              <LineTooltip
                locked={lock.locked}
                restDate={restDate}
                vizData={vizData}
                shownNdcs={shownNdcs}
                unit={unit}
                restLabel={eventShown ? "this change" : "latest"}
                onUnlock={unlockAndFocus}
                colorFor={colorFor}
                descriptionFor={isMobile ? undefined : descriptionFor}
              />
            )}
          />
          {/* The chart's change: solid and wider, under the lock's thin dashed line, and kept while locked elsewhere. */}
          {eventShown
            ? <ReferenceLine x={eventDate} stroke={chartTheme.textSecondary} strokeWidth={2} />
            : null}
          {lock.locked !== null
            ? <ReferenceLine x={lock.locked} stroke={chartTheme.textSecondary} strokeDasharray="3 3" />
            : null}
          {showPriceChanges && legacySpanVisible && !callouts.some(c => c.date === changeSpan.end)
            ? changeCallout(changeSpan, changeColor, xDomain, chartTheme, "legacy", { label: legacyCalloutLabel(changeSpan) })
            : null}
          {callouts.flatMap(callout => {
            const color = callout.events.every(e => e.change.percentage < 0) ? chartTheme.drop
              : callout.events.every(e => e.change.percentage > 0) ? chartTheme.rise : chartTheme.textSecondary;
            const refs = callout.spans.flatMap((span, i) => changeCallout(span,
              span.direction === "drop" ? chartTheme.drop : chartTheme.rise, xDomain, chartTheme,
              `${callout.date}:${i}`, i === 0 ? { label: callout.label } : { hideLabel: true }));
            const markers = callout.markers.map(marker => (
              <ReferenceDot key={`${callout.date}:${marker.ndc}`}
                x={callout.date} y={marker.price} r={5} fill={color} stroke={chartTheme.paper} />
            ));
            const first = callout.markers[0];
            return [...refs, ...markers, ...(first ? [changePill(callout.label, callout.date,
              first.price, color, xDomain, chartTheme, `${callout.date}:product-label`)] : [])];
          })}
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
      <Box id={descriptionId} sx={visuallyHidden}>{lineChartSummary(nadacPrices, showPriceChanges && legacySpanVisible ? changeSpan : undefined, seriesKind)}</Box>
      {/* Said once here rather than in every tooltip row. */}
      {bandCaption
        ? <Typography variant="caption" color="text.secondary">{bandCaption}<HelpButton topic="charts" /></Typography>
        : null}
    </>
  );
}

type LineTooltipProps = Omit<LineReadoutProps, "date" | "rows" | "status"> & {
  /** From recharts, which clones the element with the hovered point. */
  active?: boolean,
  payload?: readonly { payload?: unknown }[],
  locked: number | null,
  restDate: number | undefined,
  vizData: LineVizRow[],
  shownNdcs: string[],
};

/**
 * The readout for the hovered date, else the locked one, else the rest date. recharts clones it
 * with all of `Tooltip`'s props, so it passes on only the readout's, by name.
 */
function LineTooltip({
  active, payload, locked, restDate, vizData, shownNdcs, unit, restLabel, onUnlock, colorFor, descriptionFor,
}: LineTooltipProps) {
  const hovered = active && payload?.length ? payload[0].payload as LineVizRow : undefined;
  const date = hovered?.asOfDate ?? locked ?? restDate;
  const row = hovered ?? vizData.find(r => r.asOfDate === date);
  if (date === undefined || !row) return null;
  return (
    <LineReadout
      date={date}
      rows={tooltipRows(row, shownNdcs)}
      status={hovered ? "hover" : locked !== null ? "locked" : "default"}
      unit={unit}
      restLabel={restLabel}
      onUnlock={onUnlock}
      colorFor={colorFor}
      descriptionFor={descriptionFor}
    />
  );
}

type LineReadoutProps = {
  date: number,
  unit: string,
  rows: TooltipRow[],
  status: ReadoutStatus,
  /** What the resting (default) date is: the latest, or the change the chart was opened for. */
  restLabel: "latest" | "this change",
  onUnlock: (event: MouseEvent<HTMLElement>) => void,
  colorFor: (ndc: string) => string,
  /** Each series' description, left out on a phone to keep the readout small. */
  descriptionFor?: (ndc: string) => string,
}

/**
 * The prices on one date, highest first: a swatch, the NDC and the price per row, with the
 * description and, for an averaged product, its packages' range beneath on wider screens.
 */
function LineReadout({ date, unit, rows, status, restLabel, onUnlock, colorFor, descriptionFor }: LineReadoutProps) {
  return (
    <ReadoutContent
      header={<ReadoutHeader status={status} onUnlock={onUnlock} title={`${formatDate(date)} · per ${unit}${status === "default" ? ` · ${restLabel}` : ""}`}>
        <Box component="span" sx={{ fontWeight: 600 }}>{formatDate(date)}</Box>
        <Box component="span" sx={{ color: "text.secondary" }}>
          {" "}· per {unit}{status === "default" ? ` · ${restLabel}` : ""}
        </Box>
      </ReadoutHeader>}
    >
      {rows.map(({ ndc, price, range }) => {
        const rangeText = range ? `Packages ${formatPrice(range[0])}–${formatPrice(range[1])}` : null;
        return (
          <Box key={ndc}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: colorFor(ndc), flexShrink: 0 }} />
              <Typography variant="body2" noWrap title={ndc} sx={{ flexGrow: 1, minWidth: 0 }}>{ndc}</Typography>
              <Typography variant="body2" noWrap sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, flexShrink: 0 }}>{formatPrice(price)}</Typography>
            </Box>
            {descriptionFor
              ? <Box sx={{ pl: 2.25 }}>
                {/* One ellipsised line each, so a row is never taller than `lineReadoutHeight` reserves. */}
                <Typography variant="caption" color="text.secondary" component="div" noWrap title={descriptionFor(ndc)}>
                  {descriptionFor(ndc)}
                </Typography>
                {rangeText
                  ? <Typography variant="caption" color="text.secondary" component="div" noWrap>{rangeText}</Typography>
                  : null}
              </Box>
              : null}
          </Box>
        );
      })}
    </ReadoutContent>
  );
}

function legacyCalloutLabel({ from, to, label }: ChartChangeSpan): string {
  return from === undefined || to === undefined ? label : `${formatPriceLabel(from)} → ${formatPriceLabel(to)}`;
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
  keyPrefix: string,
  options: { label: string } | { hideLabel: true },
) {
  const { from, to } = span;
  // Pinned before the prices were stored: mark the date and label the percent.
  if (from === undefined || to === undefined) {
    return [
      <ReferenceLine
        key={`${keyPrefix}:change`}
        x={span.end}
        stroke={color}
        strokeDasharray="4 4"
        label={"label" in options ? { value: options.label, position: "insideTopRight", fill: chartTheme.textPrimary, fontSize: chartTheme.fontSize } : undefined}
      />,
    ];
  }

  const label = "label" in options ? options.label : null;
  return [
    <ReferenceLine
      key={`${keyPrefix}:old-price`}
      segment={[{ x: span.end, y: from }, { x: xDomain[1], y: from }]}
      stroke={chartTheme.textSecondary}
      strokeDasharray="4 4"
    />,
    <ReferenceDot key={`${keyPrefix}:from`} x={span.end} y={from} r={4} fill={chartTheme.paper} stroke={chartTheme.textSecondary} strokeWidth={2} />,
    <ReferenceDot key={`${keyPrefix}:to`} x={span.end} y={to} r={5} fill={color} stroke={chartTheme.paper} strokeWidth={2} />,
    ...(label !== null ? [changePill(label, span.end, (from + to) / 2, color, xDomain, chartTheme, `${keyPrefix}:callout`)] : []),
  ];
}

/** A shared per-date label for package spans and product package-event markers. */
function changePill(text: string, date: number, price: number, color: string,
  xDomain: [number, number], chartTheme: ReturnType<typeof useChartTheme>, key: string) {
  // Beside the step on the side with more room, halfway between the two prices.
  const placeLeft = (date - xDomain[0]) / (xDomain[1] - xDomain[0] || 1) > 0.5;
  const pillWidth = text.length * 7 + 16;
  const pillHeight = 22;

  return (
    <ReferenceDot
      key={key}
      x={date}
      y={price}
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

}
