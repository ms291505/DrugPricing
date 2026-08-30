import { type NadacPrice } from "../../library/types.ts";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, } from "recharts";
import { DEFAULT_CHART_HEIGHT, DEFAULT_TOOLTIP_FONT_SIZE, LINE_VIZ_COLORS, NDC_NDC_DESCRIPTION_DELIMITER } from "../../library/constants.ts";
import { useTheme } from "@mui/material/styles";
import { formatDollar } from "../../library/formatDollar.ts";

type Props = {
  nadacPrices: NadacPrice[];
  border?: boolean;
};

export default function LineViz({ nadacPrices }: Props) {

  const theme = useTheme();

  const vizData = Object.values(
    nadacPrices.reduce<Record<number, Record<string, unknown>>>((acc, { asOfDate, ndc, nadacPerUnit }) => {
      const key = asOfDate.getTime();
      acc[key] = acc[key] || { asOfDate: key };
      acc[key][ndc] = nadacPerUnit;
      return acc;
    }, {})
  ).sort((a, b) => (a.asOfDate as number) - (b.asOfDate as number));

  const ndcs = [...new Set(nadacPrices.map((nadacPrice) => nadacPrice.ndc))];
  const colors = LINE_VIZ_COLORS;

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
        formatter={formatDollar}
        contentStyle={{
          backgroundColor: theme.palette.background.paper,
          fontSize: DEFAULT_TOOLTIP_FONT_SIZE,
        }}
      />
      {ndcs.map((ndc, i) => (
        <Line
          key={ndc}
          dataKey={ndc}
          stroke={colors[i % colors.length]}
          type="monotone"
          dot={false}
          connectNulls={false}
          name={dataSeriesName(ndc)}
        />
      ))}
    </LineChart>
  );
}
