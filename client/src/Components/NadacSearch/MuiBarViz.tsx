import { DEFAULT_CHART_HEIGHT } from "../../library/constants"
import type { NadacPrice, DrugSummary } from "../../types"
import { BarChart } from "@mui/x-charts/BarChart"

type Props =
  {
    nadacPrices: NadacPrice[]
  }
export default function MuiBarViz({ nadacPrices }: Props) {
  const formatDollar = (value: number | null) => {
    if (!value) return "";
    const dollar = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
    return dollar;
  }

  const drugSummaries: DrugSummary[] = Object.entries(
    nadacPrices.reduce((acc, item) => {
      if (!acc[item.ndc]) {
        acc[item.ndc] = {
          total: 0, count: 0, ndcDescription: item.ndcDescription, pricingUnit: item.pricingUnit, minPrice: Infinity, maxPrice: 0
        };
      }
      acc[item.ndc].total += item.nadacPerUnit;
      acc[item.ndc].count += 1;

      acc[item.ndc].minPrice = Math.min(acc[item.ndc].minPrice, item.nadacPerUnit);
      acc[item.ndc].maxPrice = Math.max(acc[item.ndc].maxPrice, item.nadacPerUnit);

      return acc;
    }, {} as Record<string, { total: number; count: number; ndcDescription: string; pricingUnit: string; minPrice: number; maxPrice: number; }>)
  ).map(([ndc, { total, count, ndcDescription, pricingUnit, minPrice, maxPrice }]) => ({
    ndc,
    averagePrice: total / count,
    ndcDescription,
    pricingUnit,
    minPrice,
    maxPrice
  }));
  return (
    <BarChart
      dataset={drugSummaries}
      xAxis={[{ dataKey: "ndc", scaleType: "band" }]}
      yAxis={[{
        valueFormatter: (value: number) =>
          value >= 1000 ? `$${(value / 1000).toFixed(1)}K` : `$${value}`
      }]}
      series={[{
        dataKey: "averagePrice",
        label: "Average Price",
        valueFormatter: formatDollar,
      }]}
      height={DEFAULT_CHART_HEIGHT}
      hideLegend
    />)
}
