import { useId, type CSSProperties } from "react";
import { Box, Typography } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import { type ChartPrice, } from "../../library/types.ts";
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, Legend, ReferenceDot, ReferenceLine, } from "recharts";
import { createLineVizData, rangeKey, type LineVizRow } from "../../library/createLineVizData.ts";
import { pricingUnitLabel } from "../../library/chartSeries.ts";
import { dateTicks, fittedPriceAxis, formatPrice, formatPriceLabel, priceTickFormatter } from "../../library/chartScale.ts";
import UnitSplit from "./UnitSplit.tsx";
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
  const bounds = dateBounds(clipToWindow(nadacPrices, dateWindow));
  const xDomain: [number, number] = [dateWindow.start ?? bounds?.first ?? 0, dateWindow.end ?? bounds?.last ?? 0];

  return (
    <UnitSplit
      nadacPrices={nadacPrices}
      dateWindow={dateWindow}
      renderChart={(unitPrices, pricingUnit) => (
        <UnitLineChart
          nadacPrices={unitPrices}
          pricingUnit={pricingUnit}
          title={title}
          colors={colors}
          xDomain={xDomain}
          changeSpan={changeSpan}
          priceRange={priceRanges?.get(pricingUnit)}
        />
      )}
    />
  );
}

type UnitLineChartProps = {
  nadacPrices: ChartPrice[];
  pricingUnit: string;
  title: string;
  colors?: Map<string, string>;
  xDomain: [number, number];
  changeSpan?: ChartChangeSpan;
  priceRange?: [number, number];
};

function UnitLineChart({ nadacPrices, pricingUnit, title, colors, xDomain, changeSpan, priceRange }: UnitLineChartProps) {
  const chartTheme = useChartTheme();
  const isMobile = useMobile();
  const descriptionId = useId();

  const ndcs = [...new Set(nadacPrices.map((nadacPrice) => nadacPrice.ndc))];

  const { rows: vizData, rangeNdcs } = createLineVizData(nadacPrices);

  const descriptionFor = (ndc: string) => nadacPrices.find((price) => price.ndc === ndc)?.ndcDescription ?? "";

  const unit = pricingUnitLabel(pricingUnit);

  // One lookup for both the band and its line, so they always share a color.
  const colorFor = (ndc: string) =>
    colors?.get(ndc) ?? chartTheme.palette[ndcs.indexOf(ndc) % chartTheme.palette.length];

  const xTicks = dateTicks(xDomain[0], xDomain[1], isMobile ? 4 : 7);

  // Bands are within each date's min–max, so the raw prices bound everything drawn.
  const prices = nadacPrices.map(price => price.nadacPerUnit);
  const [low, high] = priceRange ?? [Math.min(...prices), Math.max(...prices)];
  const yAxis = fittedPriceAxis(low, high);

  const changeColor = changeSpan?.direction === "rise" ? chartTheme.rise
    : changeSpan?.direction === "drop" ? chartTheme.drop
      : chartTheme.textSecondary;

  return (<>
    <ComposedChart
      data={vizData}
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
      {/* One series is named by the card's title; a legend would only repeat it. */}
      {ndcs.length > 1
        ? <Legend wrapperStyle={chartTheme.legendStyle} />
        : null
      }
      <Tooltip
        // On a phone the finger is on the chart: keep the readout at the top, out from under it.
        position={isMobile ? { y: 0 } : undefined}
        content={({ active, payload, label }) => active && payload?.length
          ? <LineTooltip
            date={label as number}
            unit={unit}
            // The bands' entries come through too; keep the lines'.
            items={payload.filter(item => ndcs.includes(String(item.dataKey))).map(item => ({ ndc: String(item.dataKey), price: item.value as number, row: item.payload as LineVizRow }))}
            colorFor={colorFor}
            descriptionFor={isMobile ? undefined : descriptionFor}
            style={chartTheme.tooltip.contentStyle}
          />
          : null}
      />
      {changeSpan ? changeCallout(changeSpan, changeColor, xDomain, chartTheme) : null}
      {ndcs.filter(ndc => rangeNdcs.has(ndc)).map((ndc) => (
        <Area
          key={rangeKey(ndc)}
          dataKey={rangeKey(ndc)}
          type="stepAfter"
          stroke="none"
          fill={colorFor(ndc)}
          fillOpacity={0.2}
          activeDot={false}
          legendType="none"
          tooltipType="none"
          connectNulls={false}
          isAnimationActive={false}
        />
      ))}
      {ndcs.map((ndc) => (
        <Line
          key={ndc}
          dataKey={ndc}
          stroke={colorFor(ndc)}
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
    </ComposedChart>
    <Box id={descriptionId} sx={visuallyHidden}>{title}</Box>
    {/* Said once here rather than in every tooltip row. */}
    {rangeNdcs.size > 0
      ? <Typography variant="caption" color="text.secondary">
        Line: average of the product's packages · shading: lowest to highest package price
      </Typography>
      : null}
  </>);
}

type LineTooltipProps = {
  date: number,
  unit: string,
  items: Array<{ ndc: string, price: number, row: LineVizRow }>,
  colorFor: (ndc: string) => string,
  /** Each series' description, left out on a phone to keep the tooltip small. */
  descriptionFor?: (ndc: string) => string,
  style: CSSProperties,
}

/**
 * The prices on one date, highest first: a swatch, the NDC and the price per row, with the
 * description and, for an averaged product, its packages' range beneath on wider screens.
 */
function LineTooltip({ date, unit, items, colorFor, descriptionFor, style }: LineTooltipProps) {
  const sorted = [...items].sort((a, b) => b.price - a.price);
  return (
    <Box style={style} sx={{ p: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
      <Typography variant="body2">
        <Box component="span" sx={{ fontWeight: 600 }}>{formatDate(date)}</Box>
        <Box component="span" sx={{ color: "text.secondary" }}> · per {unit}</Box>
      </Typography>
      {sorted.map(({ ndc, price, row }) => {
        const range = row[rangeKey(ndc)] as [number, number] | undefined;
        // Only when the packages disagree at the precision shown.
        const rangeText = range && formatPrice(range[0]) !== formatPrice(range[1])
          ? `Packages ${formatPrice(range[0])}–${formatPrice(range[1])}`
          : null;
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
    </Box>
  );
}

/**
 * Calls out a price change on the line itself: the old price continues as a dashed line after
 * the change, so the gap to the new price is the size of the change; dots at the top and bottom
 * of the step mark the old and new prices, and a pill beside it reads "$9.69 → $5.52". The percent is in the card title.
 * Rendered as an array, since recharts needs its reference elements as direct chart children.
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
            <rect x={x} y={y} width={pillWidth} height={pillHeight} rx={4} fill={chartTheme.paper} stroke={color} />
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
