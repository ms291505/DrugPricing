import { LineChart } from "@mui/x-charts";
import type { NadacPrice } from "../../library/types";
import { DEFAULT_CHART_HEIGHT, NDC_NDC_DESCRIPTION_DELIMITER } from "../../library/constants";

type Props = {
  nadacPrices: NadacPrice[];
};

export default function MuiLineViz({ nadacPrices }: Props) {
  const vizData = Object.values(
    nadacPrices.reduce<Record<number, Record<string, unknown>>>((acc, { asOfDate, ndc, nadacPerUnit }) => {
      const key = asOfDate.getTime();
      acc[key] = acc[key] || { asOfDate: key };
      acc[key][ndc] = nadacPerUnit;
      return acc;
    }, {})
  ).sort((a, b) => (a.asOfDate as number) - (b.asOfDate as number));

  const ndcs = [...new Set(nadacPrices.map((nadacPrice) => nadacPrice.ndc))];

  const dataSeriesName = (ndc: string): string => {
    const ndcDescription = nadacPrices.find((price) => price.ndc === ndc)?.ndcDescription ?? "";
    return ndc + NDC_NDC_DESCRIPTION_DELIMITER + ndcDescription;
  };
  const formatDollar = (value: number | null) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value ?? 0);

  return (
    <LineChart

      xAxis={[
        {
          dataKey: "asOfDate",
          scaleType: "time",
          valueFormatter: (date: number) => new Date(date).toLocaleDateString(),
        }
      ]}
      yAxis={[{
        valueFormatter: (price: number) =>
          price >= 1000 ? `$${(price / 1000).toFixed(1)}K` : `$${price}`
      }]}
      dataset={vizData}
      series={ndcs.map((ndc) => ({
        dataKey: ndc,
        label: dataSeriesName(ndc),
        valueFormatter: formatDollar,
        showMark: false,
        connectNulls: false,
      }))}
      height={DEFAULT_CHART_HEIGHT}
    />
  )
}
