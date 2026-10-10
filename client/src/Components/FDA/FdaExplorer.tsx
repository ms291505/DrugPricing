import { Grid, } from "@mui/material";
import FdaSearchResults from "./FdaSearchResults";
import FdaPageTools from "./FdaPageTools";
import BarViz from "../NadacSearch/BarViz";
import useFdaSearch from "../../hooks/useFdaSearch";
import { applyFdaResultFilter, resultDetailLevelToLabel, type FdaResultDetailLevel, } from "../../library/types";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import fdaSearchResultToNadacPrices from "../../library/fdaDataToNadacPrices";
import ExplorerGridItem from "../ExplorerGrid/ExplorerGridItem";
import LineViz from "../NadacSearch/LineViz";
import { flagNadacPriceChangeForFdaProducts, getAllPricesForFlaggedPackages } from "../../library/flagNadacPriceChange";
import * as PriceFlagger from "../../library/flagNadacPriceChange";
import { LINE_VIZ_COLORS, MAX_AUTO_PRICE_CHANGE_CHARTS } from "../../library/constants";
import { shouldAutoChart } from "../../library/chartSeries";

type Props = {
  visible?: boolean
}

export default function FdaExplorer({ visible = true }: Props) {
  const { data } = useFdaSearch();
  const { fdaResultFilter, fdaResultDetailLevel, charts } = useFdaSearchContext();
  const nadacPrices = fdaSearchResultToNadacPrices(data, fdaResultFilter, fdaResultDetailLevel);
  const packageNadacPrices = fdaSearchResultToNadacPrices(data, fdaResultFilter, "package");

  const searchResult = data ?? { products: [] };

  const productPriceChanges = flagNadacPriceChangeForFdaProducts(applyFdaResultFilter(searchResult, fdaResultFilter).products);

  const resultTableTitleMap: Record<FdaResultDetailLevel, string> = {
    product: "Products",
    package: "Packages"
  }

  const showAutoCharts = shouldAutoChart(nadacPrices);

  const barVizTitle = "Average Price by " + resultDetailLevelToLabel(fdaResultDetailLevel);
  const lineVizTitle = resultDetailLevelToLabel(fdaResultDetailLevel) + " Price Over Time";

  return (
    <Grid container spacing={2} display={visible ? "flex" : "none"} minHeight={0}>
      <Grid
        size={{ xs: 12, md: 3 }}
      >
        <FdaPageTools />
      </Grid>
      <Grid
        component="div"
        size={{ xs: 12, md: 9 }}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <ExplorerGridItem title={resultTableTitleMap[fdaResultDetailLevel]}>
          <FdaSearchResults />
        </ExplorerGridItem>
        {showAutoCharts
          ?
          <ExplorerGridItem
            title={barVizTitle}
          >
            <BarViz
              nadacPrices={nadacPrices}
            />
          </ExplorerGridItem>
          : null
        }
      </Grid>
      {
        showAutoCharts
          ?
          <Grid size={12}>
            <ExplorerGridItem
              title={lineVizTitle}
            >
              <LineViz nadacPrices={nadacPrices} />
            </ExplorerGridItem>
          </Grid>
          : null
      }
      {productPriceChanges.length <= MAX_AUTO_PRICE_CHANGE_CHARTS
        ?
        productPriceChanges.map((change, i) => {
          const prices = getAllPricesForFlaggedPackages(change, packageNadacPrices);
          return (
            <Grid size={{ xs: 12, md: 6 }} key={change.packageNdc + change.priceChange.startDate.toDateString()}>
              <ExplorerGridItem title={PriceFlagger.percentageChangeToString(change.priceChange.percentage) + " Price Change for " + change.packageNdc}>
                <LineViz nadacPrices={prices} lineColors={[LINE_VIZ_COLORS[i % LINE_VIZ_COLORS.length]]} />
              </ExplorerGridItem>
            </Grid>
          )
        })
        : null
      }
      {
        charts.map(chart => {
          return (

            <Grid size={{ xs: 12, md: 6 }} key={chart.id}>
              <ExplorerGridItem title="New Chart">
                {
                  chart.type === "line"
                    ? <LineViz nadacPrices={chart.nadacPrices} lineColors={LINE_VIZ_COLORS} />
                    : chart.type === "bar"
                      ? <BarViz nadacPrices={chart.nadacPrices} />
                      : "Invalid chart type used."
                }
              </ExplorerGridItem>
            </Grid>
          )
        })
      }
    </Grid>
  )
}

