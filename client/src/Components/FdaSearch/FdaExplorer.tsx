import { useMemo, useState } from "react";
import { Grid, } from "@mui/material";
import FdaSearchResults from "./FdaSearchResults";
import FdaPageTools from "./FdaPageTools";
import BarViz from "../Charts/BarViz";
import useFdaSearch from "../../hooks/useFdaSearch";
import { applyFdaResultFilter, type FdaResultDetailLevel, } from "../../library/types";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import fdaSearchResultToNadacPrices from "../../library/fdaDataToNadacPrices";
import LineViz from "../Charts/LineViz";
import { flagNadacPriceChangeForFdaProducts } from "../../library/flagNadacPriceChange";
import { shouldAutoChart } from "../../library/chartSeries";
import PinButton from "../ExplorerGrid/PinButton";
import useFdaChartOrigin from "../../hooks/useFdaChartOrigin";
import useChartWindow from "../../hooks/useChartWindow";
import useSeriesColors from "../../hooks/useSeriesColors";
import { chartSubtitle, chartTitle, seriesLabels } from "../../library/chartTitles";
import type { BarValue } from "../../library/explorerItems";
import PriceChangeCards from "../ExplorerGrid/PriceChangeCards";
import SearchResultToast from "../ui/SearchResultToast";
import useNewSearchResult from "../../hooks/useNewSearchResult";
import { countMessage } from "../../library/searchToasts";
import ExplorerGrid, { ExplorerGridItem } from "../ExplorerGrid";

type Props = {
  visible?: boolean
}

export default function FdaExplorer({ visible = true }: Props) {
  const { data, isSuccess, dataUpdatedAt } = useFdaSearch();
  const { fdaSearchParams, fdaResultFilter, fdaResultDetailLevel } = useFdaSearchContext();
  const resultKey = useNewSearchResult(fdaSearchParams, isSuccess, dataUpdatedAt);
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

  const colors = useSeriesColors(origin.resultPrices, nadacPrices);
  const packageColors = useSeriesColors(packageOrigin.resultPrices, packageNadacPrices);
  const [barValue, setBarValue] = useState<BarValue>("latest");

  const resultTableTitleMap: Record<FdaResultDetailLevel, string> = {
    product: "Products",
    package: "Packages"
  }

  const showAutoCharts = shouldAutoChart(nadacPrices);

  const labels = seriesLabels(nadacPrices);
  const barVizTitle = chartTitle("bar", origin.searchLabel, origin.seriesKind, labels);
  const lineVizTitle = chartTitle("line", origin.searchLabel, origin.seriesKind, labels);
  const autoChartSubtitle = chartSubtitle(labels.length, origin.seriesKind, chartWindow, nadacPrices);

  return (<>
    {/* Counts every change the search flagged, charted or not: the cards' notes say why some aren't. */}
    <SearchResultToast
      resultKey={resultKey}
      message={productPriceChanges.length > 0 ? countMessage(productPriceChanges.length, ["price change", "price changes"], "flagged") : null}
      kind="flag"
    />
    <ExplorerGrid visible={visible}>
      <Grid
        component="div"
        size={12}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <ExplorerGridItem title={resultTableTitleMap[fdaResultDetailLevel]}>
          <FdaSearchResults />
        </ExplorerGridItem>
      </Grid>
      <Grid
        size={12}
      >
        <ExplorerGridItem title="Page Tools" >
          <FdaPageTools />
        </ExplorerGridItem>
      </Grid>
      {showAutoCharts
        ?
        <Grid
          component="div"
          size={12}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <ExplorerGridItem
            title={barVizTitle}
            subtitle={autoChartSubtitle}
            actions={<PinButton
              title={barVizTitle} chartType="bar" prices={nadacPrices} origin={origin} dateWindow={chartWindow}
              colors={colors} barValue={barValue}
            />}
          >
            <BarViz
              nadacPrices={nadacPrices}
              title={barVizTitle}
              colors={colors}
              dateWindow={chartWindow}
              barValue={barValue}
              onBarValueChange={setBarValue}
            />
          </ExplorerGridItem>
        </Grid>
        : null
      }
      {
        showAutoCharts
          ?
          <Grid size={12}>
            <ExplorerGridItem
              title={lineVizTitle}
              subtitle={autoChartSubtitle}
              actions={<PinButton
                title={lineVizTitle} chartType="line" prices={nadacPrices} origin={origin} dateWindow={chartWindow}
                colors={colors}
              />}
            >
              <LineViz nadacPrices={nadacPrices} title={lineVizTitle} colors={colors} dateWindow={chartWindow} />
            </ExplorerGridItem>
          </Grid>
          : null
      }
      <PriceChangeCards
        changes={productPriceChanges}
        prices={packageNadacPrices}
        chartWindow={chartWindow}
        origin={packageOrigin}
        colors={packageColors}
      />
    </ExplorerGrid>
  </>)
}

