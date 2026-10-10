import { type ChartPrice, } from "../../library/types.ts";
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, Legend, } from "recharts";
import { DEFAULT_CHART_HEIGHT, DEFAULT_TOOLTIP_FONT_SIZE, LINE_VIZ_COLORS, NDC_NDC_DESCRIPTION_DELIMITER } from "../../library/constants.ts";
import { useTheme } from "@mui/material/styles";
import { dollarFormatter } from "../../library/dollarFormatter.ts";
import { createLineVizData, rangeKey } from "../../library/createLineVizData.ts";
import { pricingUnitLabel } from "../../library/chartSeries.ts";
import UnitSplit from "./UnitSplit.tsx";

type Props = {
  nadacPrices: ChartPrice[];
  border?: boolean;
  lineColors?: string[];
};

const AVERAGE_SUFFIX = " (average; shaded band is min–max)";

export default function LineViz({ nadacPrices, lineColors = LINE_VIZ_COLORS, }: Props) {
  return (
    <UnitSplit
      nadacPrices={nadacPrices}
      renderChart={(unitPrices, pricingUnit) => (
        <UnitLineChart nadacPrices={unitPrices} pricingUnit={pricingUnit} lineColors={lineColors} />
      )}
    />
  );
}

type UnitLineChartProps = {
  nadacPrices: ChartPrice[];
  pricingUnit: string;
  lineColors: string[];
};

function UnitLineChart({ nadacPrices, pricingUnit, lineColors }: UnitLineChartProps) {

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
        domain={["dataMin", "dataMax"]}
        tickFormatter={(ts: number) => new Date(ts).toLocaleDateString()}
      />
      <YAxis
        width="auto"
        tickFormatter={(value: number) =>
          value >= 1000 ? `$${(value / 1000).toFixed(1)}K` : `$${value}`
        }
      />
      <Legend
        formatter={(value: string) => value.split(NDC_NDC_DESCRIPTION_DELIMITER)[0]}
      />
      <Tooltip
        labelFormatter={(ts) => new Date(ts as number).toLocaleDateString()}
        formatter={(value) => `${dollarFormatter(value as number)} / ${unit}`}
        contentStyle={{
          backgroundColor: theme.palette.background.paper,
          fontSize: DEFAULT_TOOLTIP_FONT_SIZE,
          maxWidth: 400,
          whiteSpace: "normal"
        }}
      />
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
        />
      ))}
    </ComposedChart>
  );
}
