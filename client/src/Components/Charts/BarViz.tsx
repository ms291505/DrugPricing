import { useId, type CSSProperties } from "react";
import { Bar, BarChart, Rectangle, Tooltip, XAxis, YAxis } from "recharts";
import { Box, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import type { ChartPrice } from "../../library/types";
import { pricingUnitLabel } from "../../library/chartSeries";
import { fittedPriceAxis, formatPrice, formatPriceLabel, priceTickFormatter, zeroBasedAxis } from "../../library/chartScale";
import { summarizeSeries, type BarValue, type SeriesSummary } from "../../library/seriesSummary";
import { clipToWindow, dateBounds, formatDate, FULL_WINDOW, type DateWindow } from "../../library/dates";
import useChartTheme from "../../hooks/useChartTheme";
import useMobile from "../../hooks/useMobile";
import UnitSplit from "./UnitSplit";
import { barChartSummary } from "../../library/chartSummary";
import { barCsv, barDataRows } from "../../library/chartCsv";
import ChartData, { BarDataTable } from "./ChartData";
import { useSettings } from "../../Context/SettingsContext";

type Props = {
  nadacPrices: ChartPrice[],
  /** The card's title: the chart's accessible name. */
  title: string,
  /** Color per NDC, from the page or a pinned snapshot. Others take palette order. */
  colors?: Map<string, string>,
  /** Bars summarize only these dates. */
  dateWindow?: DateWindow,
  /** What a row shows; the caller owns it (page state, or the pinned item). */
  barValue: BarValue,
  onBarValueChange: (barValue: BarValue) => void,
}

/**
 * One horizontal row per series, sorted by value: the latest price or the average over the
 * dates, with the range from the lowest to the highest price over the same dates.
 */
export default function BarViz({ nadacPrices, title, colors, dateWindow = FULL_WINDOW, barValue: value, onBarValueChange: setValue }: Props) {
  const { barStyle } = useSettings().settings;
  const valueLabel = value === "latest" ? "latest price" : "average price";
  // Says what each mark means; the range is easy to misread without it.
  const caption = barStyle === "bar"
    ? `Bar: ${valueLabel} · gray line: lowest to highest over these dates`
    : `Dot: ${valueLabel} · line: lowest to highest over these dates`;
  const bounds = dateBounds(clipToWindow(nadacPrices, dateWindow));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
        <Typography variant="caption" color="text.secondary">{caption}</Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={value}
          onChange={(_, next: BarValue | null) => { if (next) setValue(next); }}
          aria-label="Bar value"
          sx={{ ml: "auto" }}
        >
          <ToggleButton value="latest" sx={{ px: 1, py: 0.25 }}>Latest</ToggleButton>
          <ToggleButton value="average" sx={{ px: 1, py: 0.25 }}>Average</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <UnitSplit
        nadacPrices={nadacPrices}
        dateWindow={dateWindow}
        renderChart={(unitPrices, pricingUnit) => (
          <UnitBarChart nadacPrices={unitPrices} pricingUnit={pricingUnit} title={title} colors={colors} barValue={value} />
        )}
      />
      {bounds
        ? <ChartData title={title} bounds={bounds} toCsv={() => barCsv(barDataRows(nadacPrices, dateWindow, value))}>
          <BarDataTable prices={nadacPrices} dateWindow={dateWindow} barValue={value} bounds={bounds} />
        </ChartData>
        : null}
    </Box>
  );
}

type UnitBarChartProps = {
  nadacPrices: ChartPrice[],
  pricingUnit: string,
  title: string,
  colors?: Map<string, string>,
  barValue: BarValue,
}

type BarRow = SeriesSummary & { value: number };

const BAR_ROW_HEIGHT = 40;
/** Room right of the plot for value labels. */
const LABEL_MARGIN = 64;

function UnitBarChart({ nadacPrices, pricingUnit, title, colors, barValue }: UnitBarChartProps) {
  const chartTheme = useChartTheme();
  const isMobile = useMobile();
  const { barStyle } = useSettings().settings;
  const unit = pricingUnitLabel(pricingUnit);
  const descriptionId = useId();

  const rows: BarRow[] = summarizeSeries(nadacPrices)
    .map(summary => ({ ...summary, value: summary[barValue] }))
    .sort((a, b) => b.value - a.value);

  const colorFor = (ndc: string, index: number) => colors?.get(ndc) ?? chartTheme.palette[index % chartTheme.palette.length];
  // Bar lengths must start at $0. Dots don't, so their axis is fitted like a line chart's, under
  // the same exaggeration cap.
  const xAxis = barStyle === "bar"
    ? zeroBasedAxis(Math.max(...rows.map(row => row.max)))
    : fittedPriceAxis(Math.min(...rows.map(row => row.min)), Math.max(...rows.map(row => row.max)));
  const tickFormatter = priceTickFormatter(xAxis.ticks);
  const [low, high] = xAxis.domain;

  return (<>
    <BarChart
      layout="vertical"
      data={rows}
      margin={{ ...chartTheme.margin, right: LABEL_MARGIN }}
      style={{ width: "100%", height: rows.length * BAR_ROW_HEIGHT + 40 }}
      responsive
      aria-label={`${title}, USD per ${unit}`}
      aria-describedby={descriptionId}
    >
      <XAxis
        type="number"
        domain={xAxis.domain}
        ticks={xAxis.ticks}
        tickFormatter={tickFormatter}
        tick={chartTheme.tick}
        axisLine={chartTheme.axisLine}
        tickLine={chartTheme.axisLine}
      />
      <YAxis
        type="category"
        dataKey="ndc"
        width="auto"
        // Every bar keeps its label; recharts would otherwise drop some when space is tight.
        interval={0}
        tick={chartTheme.tick}
        axisLine={chartTheme.axisLine}
        tickLine={false}
      />
      <Tooltip
        // Highlights the whole row, label to value, under the pointer.
        cursor={{ fill: chartTheme.textSecondary, fillOpacity: 0.15 }}
        // On a phone the rows fill the chart, so any spot inside it covers one. The tooltip goes
        // above the plot instead (`compact` lifts it by its own height), over the caption and
        // toggle, which aren't being read while a finger is on a row.
        position={isMobile ? { y: 0 } : undefined}
        allowEscapeViewBox={isMobile ? { x: false, y: true } : undefined}
        content={({ active, payload }) => {
          const row = active ? payload?.[0]?.payload as BarRow | undefined : undefined;
          if (!row) return null;
          const color = colorFor(row.ndc, rows.findIndex(r => r.ndc === row.ndc));
          return <BarTooltip row={row} barValue={barValue} unit={unit} color={color} compact={isMobile} style={chartTheme.tooltip.contentStyle} />;
        }}
      />
      <Bar
        dataKey="value"
        isAnimationActive={false}
        // Drawn from the row's band and the axis domain, not recharts' bar rectangle: that
        // starts at $0, which a fitted axis doesn't show. (recharts' ErrorBar also kept a stale
        // scale and drew ranges at the wrong prices.)
        shape={(props) => {
          const row = props.payload as BarRow;
          const band = props.background;
          const left = band?.x ?? 0;
          const plotWidth = band?.width ?? 0;
          const at = (price: number) => left + (price - low) / (high - low) * plotWidth;
          const { y = 0, height = 0 } = props;
          const color = colorFor(row.ndc, props.index ?? 0);
          const rangeX = at(row.min);
          const rangeWidth = Math.max(at(row.max) - rangeX, 2);
          const text = formatPriceLabel(row.value);
          const textWidth = text.length * 7;
          const valueX = at(row.value);
          if (barStyle === "bar") {
            const barHeight = height * 0.62;
            const fitsAfterBar = valueX + 6 + textWidth <= left + plotWidth + LABEL_MARGIN;
            return (
              <g>
                <Rectangle x={left} y={y} width={at(row.value) - left} height={barHeight} radius={[0, 3, 3, 0]} fill={color} />
                <rect x={rangeX} y={y + barHeight + 4} width={rangeWidth} height={4} rx={2} fill={chartTheme.textSecondary} />
                {/* Right after the bar's end, or inside it in dark text if that would leave the chart.
                    The range track runs below the bar, so the two never collide. */}
                <text
                  x={fitsAfterBar ? valueX + 6 : valueX - 6}
                  textAnchor={fitsAfterBar ? "start" : "end"}
                  fill={fitsAfterBar ? chartTheme.textPrimary : chartTheme.paper}
                  y={y + barHeight / 2}
                  dy="0.35em"
                  fontSize={chartTheme.fontSize}
                >
                  {text}
                </text>
              </g>
            );
          }

          const cy = y + height / 2;
          return (
            <g>
              {/* A faint rail across the row leads the eye from the label to the dot. */}
              <line x1={left} x2={left + plotWidth} y1={cy} y2={cy} stroke={chartTheme.axisLine.stroke} strokeDasharray="2 4" />
              <rect x={rangeX} y={cy - 3} width={rangeWidth} height={6} rx={3} fill={color} fillOpacity={0.4} />
              <circle cx={valueX} cy={cy} r={7} fill={color} stroke={chartTheme.paper} strokeWidth={2} />
              {/* Above its dot, so it can't be read as the end of the range; kept inside the chart. */}
              <text
                x={Math.min(Math.max(valueX, left + textWidth / 2), left + plotWidth + LABEL_MARGIN - textWidth / 2)}
                y={cy - 11}
                textAnchor="middle"
                fill={chartTheme.textPrimary}
                fontSize={chartTheme.fontSize}
              >
                {text}
              </text>
            </g>
          );
        }}
      />
    </BarChart>
    <Box id={descriptionId} sx={visuallyHidden}>{barChartSummary(nadacPrices, barValue)}</Box>
  </>);
}

type BarTooltipProps = {
  row: BarRow,
  barValue: BarValue,
  unit: string,
  color: string,
  /** Phone: no description or package count, and lifted above the plot. */
  compact: boolean,
  style: CSSProperties,
}

/** One row in full, laid out like the line chart's tooltip: the value, its date, and the range. */
function BarTooltip({ row, barValue, unit, color, compact, style }: BarTooltipProps) {
  return (
    <Box
      style={style}
      sx={{ p: 1, display: "flex", flexDirection: "column", gap: 0.25, transform: compact ? "translateY(-100%)" : undefined }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
        <Typography variant="body2">
          <Box component="span" sx={{ fontWeight: 600 }}>{row.ndc}</Box>
          <Box component="span" sx={{ color: "text.secondary" }}> · per {unit}</Box>
        </Typography>
      </Box>
      {compact ? null : <Typography variant="caption" color="text.secondary">{row.label}</Typography>}
      <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
        {barValue === "latest"
          ? <>Latest <b>{formatPrice(row.latest)}</b> · {formatDate(row.latestDate)}</>
          : <>Average <b>{formatPrice(row.average)}</b></>}
      </Typography>
      <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
        Range {formatPrice(row.min)}–{formatPrice(row.max)}
      </Typography>
      {row.packages > 1 && !compact
        ? <Typography variant="caption" color="text.secondary">Average of {row.packages} packages</Typography>
        : null}
    </Box>
  );
}
