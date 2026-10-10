import { type ChartPrice, } from "../../library/types.ts";
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, Legend, ReferenceArea, } from "recharts";
import { DEFAULT_CHART_HEIGHT, DEFAULT_TOOLTIP_FONT_SIZE, LINE_VIZ_COLORS, NDC_NDC_DESCRIPTION_DELIMITER } from "../../library/constants.ts";
import { useTheme } from "@mui/material/styles";
import { dollarFormatter } from "../../library/dollarFormatter.ts";
import { createLineVizData, rangeKey } from "../../library/createLineVizData.ts";
import { niceCeiling, pricingUnitLabel } from "../../library/chartSeries.ts";
import UnitSplit from "./UnitSplit.tsx";
import { formatDate, formatShortDate, FULL_WINDOW, type DateWindow } from "../../library/dates.ts";
import type { ChartChangeSpan } from "../../library/explorerItems.ts";

type Props = {
  nadacPrices: ChartPrice[];
  lineColors?: string[];
  /** The dates to show. The axis spans the whole window, even where there are no prices. */
  dateWindow?: DateWindow;
  /** A price change to shade and label. */
  changeSpan?: ChartChangeSpan;
  /** Fixed price-axis range per pricing unit ("Match scale"); units not in it scale to their data. */
  priceDomains?: Map<string, [number, number]>;
};

const AVERAGE_SUFFIX = " (average; shaded band is min–max)";

export default function LineViz({
  nadacPrices, lineColors = LINE_VIZ_COLORS, dateWindow = FULL_WINDOW, changeSpan, priceDomains,
}: Props) {
  return (
    <UnitSplit
      nadacPrices={nadacPrices}
      dateWindow={dateWindow}
      renderChart={(unitPrices, pricingUnit) => (
        <UnitLineChart
          nadacPrices={unitPrices}
          pricingUnit={pricingUnit}
          lineColors={lineColors}
          dateWindow={dateWindow}
          changeSpan={changeSpan}
          priceDomain={priceDomains?.get(pricingUnit)}
        />
      )}
    />
  );
}

type UnitLineChartProps = {
  nadacPrices: ChartPrice[];
  pricingUnit: string;
  lineColors: string[];
  dateWindow: DateWindow;
  changeSpan?: ChartChangeSpan;
  priceDomain?: [number, number];
};

function UnitLineChart({ nadacPrices, pricingUnit, lineColors, dateWindow, changeSpan, priceDomain }: UnitLineChartProps) {

  const theme = useTheme();

  const ndcs = [...new Set(nadacPrices.map((nadacPrice) => nadacPrice.ndc))];

  const { rows: vizData, rangeNdcs } = createLineVizData(nadacPrices);

  const dataSeriesName = (ndc: string): string => {
    const ndcDescription = nadacPrices.find((price) => price.ndc === ndc)?.ndcDescription ?? "";
    const suffix = rangeNdcs.has(ndc) ? AVERAGE_SUFFIX : "";
    return ndc + NDC_NDC_DESCRIPTION_DELIMITER + ndcDescription + suffix;
  };

  const unit = pricingUnitLabel(pricingUnit);

  // One lookup for both the band and its line, so they always share a color.
  const seriesIndex = new Map(ndcs.map((ndc, i) => [ndc, i]));
  const colorFor = (ndc: string) => lineColors[(seriesIndex.get(ndc) ?? 0) % lineColors.length];

  return (
    <ComposedChart data={vizData} style={{ width: "100%", height: DEFAULT_CHART_HEIGHT }} responsive role="img">
      {/* <CartesianGrid strokeDasharray="3 3" /> */}
      <XAxis
        dataKey="asOfDate"
        scale="time"
        type="number"
        domain={[dateWindow.start ?? "dataMin", dateWindow.end ?? "dataMax"]}
        tickFormatter={formatShortDate}
      />
      <YAxis
        width="auto"
        // Matched charts keep the zero baseline unmatched ones get by default.
        domain={priceDomain ? [0, niceCeiling(priceDomain[1])] : undefined}
        tickFormatter={(value: number) =>
          value >= 1000 ? `$${(value / 1000).toFixed(1)}K` : `$${value}`
        }
      />
      <Legend
        formatter={(value: string) => value.split(NDC_NDC_DESCRIPTION_DELIMITER)[0]}
      />
      <Tooltip
        labelFormatter={(ts) => formatDate(ts as number)}
        formatter={(value) => `${dollarFormatter(value as number)} / ${unit}`}
        contentStyle={{
          backgroundColor: theme.palette.background.paper,
          fontSize: DEFAULT_TOOLTIP_FONT_SIZE,
          maxWidth: 400,
          whiteSpace: "normal"
        }}
      />
      {changeSpan
        ? <ReferenceArea
          x1={changeSpan.start}
          x2={changeSpan.end}
          fill={theme.palette.warning.main}
          fillOpacity={0.25}
          label={{ value: changeSpan.label, position: "insideTop", fill: theme.palette.text.primary, fontSize: DEFAULT_TOOLTIP_FONT_SIZE }}
        />
        : null
      }
      {ndcs.filter(ndc => rangeNdcs.has(ndc)).map((ndc) => (
        <Area
          key={rangeKey(ndc)}
          dataKey={rangeKey(ndc)}
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
          type="monotone"
          dot={false}
          connectNulls={false}
          name={dataSeriesName(ndc)}
          // No animation: recharts morphs the old line into the new one point by point, so changing
          // the dates drew made-up prices for a second or more, and re-renders restarted it.
          isAnimationActive={false}
        />
      ))}
    </ComposedChart>
  );
}
