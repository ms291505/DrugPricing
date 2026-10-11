import { type ChartPrice, } from "../../library/types.ts";
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, Legend, ReferenceArea, } from "recharts";
import { NDC_NDC_DESCRIPTION_DELIMITER } from "../../library/constants.ts";
import { createLineVizData, rangeKey } from "../../library/createLineVizData.ts";
import { pricingUnitLabel } from "../../library/chartSeries.ts";
import { dateTicks, fittedPriceAxis, formatPrice, priceTickFormatter } from "../../library/chartScale.ts";
import UnitSplit from "./UnitSplit.tsx";
import { clipToWindow, dateBounds, formatDate, FULL_WINDOW, type DateWindow } from "../../library/dates.ts";
import type { ChartChangeSpan } from "../../library/explorerItems.ts";
import useChartTheme from "../../hooks/useChartTheme.ts";
import useMobile from "../../hooks/useMobile.ts";

type Props = {
  nadacPrices: ChartPrice[];
  /** Color per NDC, from the page (`useSeriesColors`) or a pinned snapshot. Others take palette order. */
  colors?: Map<string, string>;
  /** The dates to show. The axis spans the whole window, even where there are no prices. */
  dateWindow?: DateWindow;
  /** A price change to shade and label. */
  changeSpan?: ChartChangeSpan;
  /** Shared price range per pricing unit ("Match scale"); units not in it fit their own data. */
  priceRanges?: Map<string, [number, number]>;
};

const AVERAGE_SUFFIX = " (average; shaded band is min–max)";

export default function LineViz({ nadacPrices, colors, dateWindow = FULL_WINDOW, changeSpan, priceRanges }: Props) {
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
  colors?: Map<string, string>;
  xDomain: [number, number];
  changeSpan?: ChartChangeSpan;
  priceRange?: [number, number];
};

function UnitLineChart({ nadacPrices, pricingUnit, colors, xDomain, changeSpan, priceRange }: UnitLineChartProps) {
  const chartTheme = useChartTheme();
  const isMobile = useMobile();

  const ndcs = [...new Set(nadacPrices.map((nadacPrice) => nadacPrice.ndc))];

  const { rows: vizData, rangeNdcs } = createLineVizData(nadacPrices);

  const dataSeriesName = (ndc: string): string => {
    const ndcDescription = nadacPrices.find((price) => price.ndc === ndc)?.ndcDescription ?? "";
    const suffix = rangeNdcs.has(ndc) ? AVERAGE_SUFFIX : "";
    return ndc + NDC_NDC_DESCRIPTION_DELIMITER + ndcDescription + suffix;
  };

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

  return (
    <ComposedChart
      data={vizData}
      margin={chartTheme.margin}
      style={{ width: "100%", aspectRatio: isMobile ? "4 / 3" : "16 / 9", minHeight: 220, maxHeight: 420 }}
      responsive
      role="img"
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
        ? <Legend
          formatter={(value: string) => value.split(NDC_NDC_DESCRIPTION_DELIMITER)[0]}
          wrapperStyle={chartTheme.legendStyle}
        />
        : null
      }
      <Tooltip
        labelFormatter={(ts) => formatDate(ts as number)}
        formatter={(value) => `${formatPrice(value as number)} / ${unit}`}
        itemSorter={(item) => -(item.value as number)}
        {...chartTheme.tooltip}
      />
      {changeSpan
        ? <ReferenceArea
          x1={changeSpan.start}
          x2={changeSpan.end}
          fill={changeColor}
          fillOpacity={0.25}
          label={{ value: changeSpan.label, position: "insideTop", fill: chartTheme.textPrimary, fontSize: chartTheme.fontSize }}
        />
        : null
      }
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
          name={dataSeriesName(ndc)}
          // Off: recharts morphs old lines into new ones and draws made-up prices.
          isAnimationActive={false}
        />
      ))}
    </ComposedChart>
  );
}
