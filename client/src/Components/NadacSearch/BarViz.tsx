import { Bar, BarChart, XAxis, YAxis, Tooltip } from "recharts";
import type { DrugSummary, NadacPrice } from "../../types";
import { useTheme } from "@mui/material/styles";
import nadacPriceToDrugSummary from "../../library/nadacPriceToDrugSummary";
import { formatDollar } from "../../library/formatDollar";
import { DEFAULT_CHART_HEIGHT, DEFAULT_TOOLTIP_FONT_SIZE } from "../../library/constants";
import BarVizToolTipLabel from "./BarVizToolTipLabel";

type Props = {
  nadacPrices: NadacPrice[],
  border?: boolean
}

export default function BarViz({ nadacPrices }: Props) {

  const theme = useTheme();

  const drugSummaries: DrugSummary[] = nadacPriceToDrugSummary(nadacPrices);


  return (
    <BarChart data={drugSummaries} style={{ width: "100%", height: DEFAULT_CHART_HEIGHT }} responsive role="img">
      <XAxis
        dataKey="ndc"
      />
      <YAxis
        width="auto"
        tickFormatter={(value: number) =>
          value >= 1000 ? `$${(value / 1000).toFixed(1)}K` : `$${value}`
        }
      />
      <Tooltip
        labelFormatter={(ndc) => {
          const drugSummary = drugSummaries.find((drug) => drug.ndc == ndc);
          if (!drugSummary) return ndc as string;
          return (<BarVizToolTipLabel drugSummary={drugSummary} />);
        }}
        formatter={formatDollar}
        contentStyle={{
          backgroundColor: theme.palette.background.paper,
          fontSize: DEFAULT_TOOLTIP_FONT_SIZE,
        }}
        cursor={{
          fill: theme.palette.background.paper
        }}
      />
      <Bar
        dataKey="averagePrice"
        name="Average Price"
        radius={[5, 5, 0, 0]}
        fill={theme.palette.primary.main}
      />
    </BarChart>
  )
}
