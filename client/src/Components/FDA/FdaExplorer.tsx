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
import { CHART_AUTO_ADD_UPPER_THRESHOLD, LINE_VIZ_COLORS } from "../../library/constants";

type Props = {
  visible?: boolean
}

export default function FdaExplorer({ visible = true }: Props) {
  const { data } = useFdaSearch();
  const { fdaResultFilter, fdaResultDetailLevel } = useFdaSearchContext();
  const nadacPrices = fdaSearchResultToNadacPrices(data, fdaResultFilter, fdaResultDetailLevel);
  const packageNadacPrices = fdaSearchResultToNadacPrices(data, fdaResultFilter, "package");

  const searchResult = data ?? { products: [] };

  const productPriceChanges = flagNadacPriceChangeForFdaProducts(applyFdaResultFilter(searchResult, fdaResultFilter).products);

  const resultTableTitleMap: Record<FdaResultDetailLevel, string> = {
    product: "Products",
    package: "Packages"
  }

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
        {nadacPrices.length > 0 && nadacPrices.length < CHART_AUTO_ADD_UPPER_THRESHOLD
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
        nadacPrices.length > 0 && nadacPrices.length < CHART_AUTO_ADD_UPPER_THRESHOLD
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
      {productPriceChanges.length < CHART_AUTO_ADD_UPPER_THRESHOLD
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
    </Grid>
  )
}
