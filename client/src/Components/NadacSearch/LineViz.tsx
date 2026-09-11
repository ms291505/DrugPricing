import { type NadacPrice, } from "../../library/types.ts";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, } from "recharts";
import { DEFAULT_CHART_HEIGHT, DEFAULT_TOOLTIP_FONT_SIZE, LINE_VIZ_COLORS, NDC_NDC_DESCRIPTION_DELIMITER } from "../../library/constants.ts";
import { useTheme } from "@mui/material/styles";
import { dollarFormatter } from "../../library/dollarFormatter.ts";
import { createLineVizData } from "../../library/createLineVizData.ts";

type Props = {
  nadacPrices: NadacPrice[];
  border?: boolean;
  lineColors?: string[];
};

export default function LineViz({ nadacPrices, lineColors = LINE_VIZ_COLORS, }: Props) {

  const theme = useTheme();


  const ndcs = [...new Set(nadacPrices.map((nadacPrice) => nadacPrice.ndc))];

  const dataSeriesName = (ndc: string): string => {
    const ndcDescription = nadacPrices.find((price) => price.ndc === ndc)?.ndcDescription ?? "";
    return ndc + NDC_NDC_DESCRIPTION_DELIMITER + ndcDescription;
  };

  const vizData = createLineVizData(nadacPrices);

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
          maxWidth: 400,
          whiteSpace: "normal"
        }}
      />
      {ndcs.map((ndc, i) => (
        <Line
          key={ndc}
          dataKey={ndc}
          stroke={lineColors[i % lineColors.length]}
          type="monotone"
          dot={false}
          connectNulls={false}
          name={dataSeriesName(ndc)}
        />
      ))}
    </LineChart>
  );
}
