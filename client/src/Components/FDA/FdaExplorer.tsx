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
import PinButton from "../ExplorerGrid/PinButton";
import PinnedSection from "../ExplorerGrid/PinnedSection";
import useFdaItemSource from "../../hooks/useFdaItemSource";

type Props = {
  visible?: boolean
}

export default function FdaExplorer({ visible = true }: Props) {
  const { data } = useFdaSearch();
  const { fdaResultFilter, fdaResultDetailLevel } = useFdaSearchContext();
  const itemSource = useFdaItemSource();
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
            actions={<PinButton title={barVizTitle} chartType="bar" prices={nadacPrices} source={itemSource} />}
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
              actions={<PinButton title={lineVizTitle} chartType="line" prices={nadacPrices} source={itemSource} />}
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
          const title = PriceFlagger.percentageChangeToString(change.priceChange.percentage) + " Price Change for " + change.packageNdc;
          return (
            <Grid size={{ xs: 12, md: 6 }} key={change.packageNdc + change.priceChange.startDate.toDateString()}>
              <ExplorerGridItem
                title={title}
                actions={<PinButton title={title} chartType="line" prices={prices} source={{ ...itemSource, seriesLabel: "Packages" }} />}
              >
                <LineViz nadacPrices={prices} lineColors={[LINE_VIZ_COLORS[i % LINE_VIZ_COLORS.length]]} />
              </ExplorerGridItem>
            </Grid>
          )
        })
        : null
      }
      <Grid size={12}>
        <PinnedSection />
      </Grid>
    </Grid>
  )
}

