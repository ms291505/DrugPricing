import { useMemo } from "react";
import { Grid, } from "@mui/material";
import FdaSearchResults from "./FdaSearchResults";
import FdaPageTools from "./FdaPageTools";
import BarViz from "../Charts/BarViz";
import useFdaSearch from "../../hooks/useFdaSearch";
import { applyFdaResultFilter, resultDetailLevelToLabel, type FdaResultDetailLevel, } from "../../library/types";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import fdaSearchResultToNadacPrices from "../../library/fdaDataToNadacPrices";
import ExplorerGridItem from "../ExplorerGrid/ExplorerGridItem";
import LineViz from "../Charts/LineViz";
import { flagNadacPriceChangeForFdaProducts, getAllPricesForFlaggedPackages } from "../../library/flagNadacPriceChange";
import { HALF_WIDTH_GRID_SIZE, LINE_VIZ_COLORS, MAX_AUTO_PRICE_CHANGE_CHARTS } from "../../library/constants";
import { shouldAutoChart } from "../../library/chartSeries";
import PinButton from "../ExplorerGrid/PinButton";
import useFdaChartOrigin from "../../hooks/useFdaChartOrigin";
import useChartWindow from "../../hooks/useChartWindow";
import { chartDatesSubtitle } from "../../library/dates";
import PriceChangeCard from "./PriceChangeCard";

type Props = {
  visible?: boolean
}

export default function FdaExplorer({ visible = true }: Props) {
  const { data } = useFdaSearch();
  const { fdaResultFilter, fdaResultDetailLevel } = useFdaSearchContext();
  const origin = useFdaChartOrigin();
  const { chartWindow } = useChartWindow(origin.resultPrices);
  const packageOrigin = useFdaChartOrigin("package");
  // Derived once per result, filter, and level change, not on every render (e.g. each change
  // of the chart dates).
  const nadacPrices = useMemo(
    () => fdaSearchResultToNadacPrices(data, fdaResultFilter, fdaResultDetailLevel),
    [data, fdaResultFilter, fdaResultDetailLevel]);
  const packageNadacPrices = useMemo(
    () => fdaSearchResultToNadacPrices(data, fdaResultFilter, "package"),
    [data, fdaResultFilter]);
  const productPriceChanges = useMemo(
    () => flagNadacPriceChangeForFdaProducts(applyFdaResultFilter(data ?? { products: [] }, fdaResultFilter).products),
    [data, fdaResultFilter]);

  const resultTableTitleMap: Record<FdaResultDetailLevel, string> = {
    product: "Products",
    package: "Packages"
  }

  const showAutoCharts = shouldAutoChart(nadacPrices);

  const barVizTitle = "Average Price by " + resultDetailLevelToLabel(fdaResultDetailLevel);
  const lineVizTitle = resultDetailLevelToLabel(fdaResultDetailLevel) + " Price Over Time";
  const autoChartSubtitle = chartDatesSubtitle(chartWindow);

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
            subtitle={autoChartSubtitle}
            actions={<PinButton title={barVizTitle} chartType="bar" prices={nadacPrices} origin={origin} dateWindow={chartWindow} />}
          >
            <BarViz
              nadacPrices={nadacPrices}
              dateWindow={chartWindow}
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
              subtitle={autoChartSubtitle}
              actions={<PinButton title={lineVizTitle} chartType="line" prices={nadacPrices} origin={origin} dateWindow={chartWindow} />}
            >
              <LineViz nadacPrices={nadacPrices} dateWindow={chartWindow} />
            </ExplorerGridItem>
          </Grid>
          : null
      }
      {productPriceChanges.length <= MAX_AUTO_PRICE_CHANGE_CHARTS
        ?
        productPriceChanges.map((change, i) => (
          <Grid size={HALF_WIDTH_GRID_SIZE} key={change.packageNdc + change.priceChange.startDate.getTime()}>
            <PriceChangeCard
              change={change}
              prices={getAllPricesForFlaggedPackages(change, packageNadacPrices)}
              origin={packageOrigin}
              color={LINE_VIZ_COLORS[i % LINE_VIZ_COLORS.length]}
            />
          </Grid>
        ))
        : null
      }
    </Grid>
  )
}

