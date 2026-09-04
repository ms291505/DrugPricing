import { type NadacPrice, type NdcColorMap } from "../../library/types.ts";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, } from "recharts";
import { DEFAULT_CHART_HEIGHT, DEFAULT_TOOLTIP_FONT_SIZE, LINE_VIZ_COLORS, NDC_NDC_DESCRIPTION_DELIMITER } from "../../library/constants.ts";
import { useTheme } from "@mui/material/styles";
import { dollarFormatter } from "../../library/dollarFormatter.ts";
import { useTabInstanceContext } from "../../Context/TabInstanceContext.tsx";
import { createLineVizData } from "../../library/createLineVizData.ts";

type Props = {
  nadacPrices: NadacPrice[];
  border?: boolean;
  lineColors?: string[];
  syncNdcColorsInContext?: boolean;
};

export default function LineViz({ nadacPrices, lineColors = LINE_VIZ_COLORS, syncNdcColorsInContext = false }: Props) {

  const theme = useTheme();

  const { ndcColorMap, setNdcColorMap } = useTabInstanceContext();

  const vizData = createLineVizData(nadacPrices);

  const ndcs = [...new Set(nadacPrices.map((nadacPrice) => nadacPrice.ndc))];

  if (syncNdcColorsInContext) {
    const newMap: NdcColorMap = Object.fromEntries(
      ndcs.map((ndc, i) => [ndc, lineColors[i % lineColors.length]])
    );

    setNdcColorMap(newMap);
  }

  const getNdcColor = (ndc: string, ndcColorMap: NdcColorMap | null) => (ndcColorMap ? ndcColorMap?.[ndc] : undefined);

  const dataSeriesName = (ndc: string): string => {
    const ndcDescription = nadacPrices.find((price) => price.ndc === ndc)?.ndcDescription ?? "";
    return ndc + NDC_NDC_DESCRIPTION_DELIMITER + ndcDescription;
  };

  return (
    <LineChart data={vizData} style={{ width: "100%", height: DEFAULT_CHART_HEIGHT }} responsive role="img">
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
        formatter={dollarFormatter}
        contentStyle={{
          backgroundColor: theme.palette.background.paper,
          fontSize: DEFAULT_TOOLTIP_FONT_SIZE,
        }}
      />
      {ndcs.map((ndc, i) => (
        <Line
          key={ndc}
          dataKey={ndc}
          stroke={getNdcColor(ndc, ndcColorMap) ?? lineColors[i % lineColors.length]}
          type="monotone"
          dot={false}
          connectNulls={false}
          name={dataSeriesName(ndc)}
        />
      ))}
    </LineChart>
  );
}
