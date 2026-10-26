import { useMemo, useState } from "react";
import { Grid, Typography, } from "@mui/material";
import FdaSearchResults from "./FdaSearchResults";
import FdaPageTools from "./FdaPageTools";
import BarViz from "../Charts/BarViz";
import useFdaSearch from "../../hooks/useFdaSearch";
import { applyFdaResultFilter, type FdaResultDetailLevel, } from "../../library/types";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import fdaSearchResultToNadacPrices from "../../library/fdaDataToNadacPrices";
import LineViz from "../Charts/LineViz";
import { flagNadacPriceChangeForFdaProducts, getAllPricesForFlaggedPackages, priceChangesInWindow } from "../../library/flagNadacPriceChange";
import { HALF_WIDTH_GRID_SIZE, MAX_AUTO_PRICE_CHANGE_CHARTS } from "../../library/constants";
import { shouldAutoChart } from "../../library/chartSeries";
import PinButton from "../ExplorerGrid/PinButton";
import useFdaChartOrigin from "../../hooks/useFdaChartOrigin";
import useChartWindow from "../../hooks/useChartWindow";
import useSeriesColors from "../../hooks/useSeriesColors";
import { chartSubtitle, chartTitle, seriesLabels } from "../../library/chartTitles";
import type { BarValue } from "../../library/seriesSummary";
import PriceChangeCard from "./PriceChangeCard";
import ExplorerGrid, { ExplorerGridItem } from "../ExplorerGrid";

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

  const colors = useSeriesColors(origin.resultPrices, nadacPrices);
  const packageColors = useSeriesColors(packageOrigin.resultPrices, packageNadacPrices);
  const [barValue, setBarValue] = useState<BarValue>("latest");

  const resultTableTitleMap: Record<FdaResultDetailLevel, string> = {
    product: "Products",
    package: "Packages"
  }

  const showAutoCharts = shouldAutoChart(nadacPrices);

  // Price-change cards follow the chart dates like the other auto charts; each keeps its own focus.
  const shownPriceChanges = useMemo(
    () => priceChangesInWindow(productPriceChanges, chartWindow),
    [productPriceChanges, chartWindow]);
  const outsidePriceChanges = productPriceChanges.length - shownPriceChanges.length;
  const tooManyPriceChanges = shownPriceChanges.length > MAX_AUTO_PRICE_CHANGE_CHARTS;
  // Explains why price-changes the search found have no card.
  const priceChangeNotes = [
    tooManyPriceChanges
      ? `${shownPriceChanges.length} price changes in these dates are too many to chart (up to ${MAX_AUTO_PRICE_CHANGE_CHARTS}). Narrow the dates or filter the results.`
      : null,
    outsidePriceChanges > 0
      ? `${outsidePriceChanges === 1 ? "1 price change is" : `${outsidePriceChanges} price changes are`} outside the chart dates.`
      : null,
  ].filter(note => note !== null);

  const labels = seriesLabels(nadacPrices);
  const barVizTitle = chartTitle("bar", origin.searchLabel, origin.seriesKind, labels);
  const lineVizTitle = chartTitle("line", origin.searchLabel, origin.seriesKind, labels);
  const autoChartSubtitle = chartSubtitle(labels.length, origin.seriesKind, chartWindow, nadacPrices);

  return (
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
      {priceChangeNotes.length > 0
        ? <Grid size={12}>
          <Typography variant="body2" color="text.secondary" sx={{ px: { xs: 1, md: 0 } }}>
            {priceChangeNotes.join(" ")}
          </Typography>
        </Grid>
        : null
      }
      {!tooManyPriceChanges
        ?
        shownPriceChanges.map((change) => (
          <Grid size={HALF_WIDTH_GRID_SIZE} key={change.packageNdc + change.priceChange.startDate.getTime()}>
            <PriceChangeCard
              change={change}
              prices={getAllPricesForFlaggedPackages(change, packageNadacPrices)}
              origin={packageOrigin}
              colors={packageColors}
            />
          </Grid>
        ))
        : null
      }
    </ExplorerGrid>
  )
}

