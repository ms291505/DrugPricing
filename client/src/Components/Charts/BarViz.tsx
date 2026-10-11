import { useState, type CSSProperties } from "react";
import { Bar, BarChart, ErrorBar, LabelList, Rectangle, Tooltip, XAxis, YAxis } from "recharts";
import { Box, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import type { ChartPrice } from "../../library/types";
import { pricingUnitLabel } from "../../library/chartSeries";
import { formatPrice, formatPriceLabel, priceTickFormatter, zeroBasedAxis } from "../../library/chartScale";
import { summarizeSeries, type BarValue, type SeriesSummary } from "../../library/seriesSummary";
import { formatDate, type DateWindow } from "../../library/dates";
import useChartTheme from "../../hooks/useChartTheme";
import UnitSplit from "./UnitSplit";

type Props = {
  nadacPrices: ChartPrice[],
  /** Color per NDC, from the page or a pinned snapshot. Others take palette order. */
  colors?: Map<string, string>,
  /** Bars summarize only these dates. */
  dateWindow?: DateWindow,
  /** What a bar shows. Without `onBarValueChange` the chart keeps its own choice. */
  barValue?: BarValue,
  onBarValueChange?: (barValue: BarValue) => void,
}

/**
 * One horizontal bar per series, sorted by value: the latest price or the average over the
 * dates, with a whisker from the lowest to the highest price over the same dates.
 */
export default function BarViz({ nadacPrices, colors, dateWindow, barValue, onBarValueChange }: Props) {
  const [ownBarValue, setOwnBarValue] = useState<BarValue>("latest");
  const value = barValue ?? ownBarValue;
  const setValue = onBarValueChange ?? setOwnBarValue;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={value}
        onChange={(_, next: BarValue | null) => { if (next) setValue(next); }}
        aria-label="Bar value"
        sx={{ alignSelf: "flex-end" }}
      >
        <ToggleButton value="latest" sx={{ px: 1, py: 0.25 }}>Latest</ToggleButton>
        <ToggleButton value="average" sx={{ px: 1, py: 0.25 }}>Average</ToggleButton>
      </ToggleButtonGroup>
      <UnitSplit
        nadacPrices={nadacPrices}
        dateWindow={dateWindow}
        renderChart={(unitPrices, pricingUnit) => (
          <UnitBarChart nadacPrices={unitPrices} pricingUnit={pricingUnit} colors={colors} barValue={value} />
        )}
      />
    </Box>
  );
}

type UnitBarChartProps = {
  nadacPrices: ChartPrice[],
  pricingUnit: string,
  colors?: Map<string, string>,
  barValue: BarValue,
}

type BarRow = SeriesSummary & { value: number, whisker: [number, number] };

const BAR_ROW_HEIGHT = 32;

function UnitBarChart({ nadacPrices, pricingUnit, colors, barValue }: UnitBarChartProps) {
  const chartTheme = useChartTheme();
  const unit = pricingUnitLabel(pricingUnit);

  const rows: BarRow[] = summarizeSeries(nadacPrices)
    .map(summary => {
      const value = summary[barValue];
      // ErrorBar takes distances below and above the bar's value.
      return { ...summary, value, whisker: [value - summary.min, summary.max - value] as [number, number] };
    })
    .sort((a, b) => b.value - a.value);

  const colorFor = (ndc: string, index: number) => colors?.get(ndc) ?? chartTheme.palette[index % chartTheme.palette.length];
  // Bar lengths start at 0; the axis reaches the highest whisker.
  const xAxis = zeroBasedAxis(Math.max(...rows.map(row => row.max)));
  const tickFormatter = priceTickFormatter(xAxis.ticks);

  return (
    <BarChart
      layout="vertical"
      data={rows}
      margin={{ ...chartTheme.margin, right: 64 }}
      style={{ width: "100%", height: rows.length * BAR_ROW_HEIGHT + 40 }}
      responsive
      role="img"
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
        cursor={{ fill: chartTheme.textSecondary, fillOpacity: 0.08 }}
        content={({ active, payload }) => {
          const row = active ? payload?.[0]?.payload as BarRow | undefined : undefined;
          return row ? <BarTooltip row={row} barValue={barValue} unit={unit} style={chartTheme.tooltip.contentStyle} /> : null;
        }}
      />
      <Bar
        dataKey="value"
        radius={[0, 3, 3, 0]}
        isAnimationActive={false}
        shape={(props) => <Rectangle {...props} fill={colorFor((props.payload as BarRow).ndc, props.index ?? 0)} />}
      >
        <ErrorBar dataKey="whisker" direction="x" width={6} stroke={chartTheme.textPrimary} strokeWidth={1} />
        <LabelList
          dataKey="value"
          content={({ x, y, width, height, index }) => {
            const row = rows[index ?? 0];
            if (!row || typeof x !== "number" || typeof width !== "number" || typeof y !== "number" || typeof height !== "number") return null;
            // Past the end of the whisker: the bar starts at 0, so width / value is px per dollar.
            const whiskerEnd = x + width + (row.value > 0 ? (row.max - row.value) * width / row.value : 0);
            return (
              <text x={whiskerEnd + 6} y={y + height / 2} dy="0.35em" fill={chartTheme.textPrimary} fontSize={chartTheme.fontSize}>
                {formatPriceLabel(row.value)}
              </text>
            );
          }}
        />
      </Bar>
    </BarChart>
  );
}

type BarTooltipProps = {
  row: BarRow,
  barValue: BarValue,
  unit: string,
  style: CSSProperties,
}

function BarTooltip({ row, barValue, unit, style }: BarTooltipProps) {
  return (
    <Box style={style} sx={{ p: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.ndc}</Typography>
      <Typography variant="body2" color="text.secondary">{row.label}</Typography>
      <Typography variant="body2">
        {barValue === "latest"
          ? `Latest ${formatPrice(row.latest)} / ${unit} (${formatDate(row.latestDate)})`
          : `Average ${formatPrice(row.average)} / ${unit}`}
      </Typography>
      <Typography variant="body2">Range over these dates {formatPrice(row.min)}–{formatPrice(row.max)}</Typography>
      {row.packages > 1
        ? <Typography variant="body2" color="text.secondary">Average of {row.packages} packages</Typography>
        : null}
    </Box>
  );
}
