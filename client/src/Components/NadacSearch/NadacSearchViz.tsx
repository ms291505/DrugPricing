import { memo, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper"
import Grid from "@mui/material/Grid";
import { NadacResultTable } from "../ResultTables";
import BarViz from "../Charts/BarViz";
import LineViz from "../Charts/LineViz";
import { useNadacSearch } from "../../hooks/useNadacSearch";
import VizTools from "./VizTools";
import { shouldAutoChart } from "../../library/chartSeries";
import ExplorerGridItem from "../ExplorerGrid/ExplorerGridItem";
import PinButton from "../ExplorerGrid/PinButton";
import PinnedSection from "../ExplorerGrid/PinnedSection";
import useNadacChartOrigin from "../../hooks/useNadacChartOrigin";
import { HALF_WIDTH_GRID_SIZE } from "../../library/constants";
import useChartWindow from "../../hooks/useChartWindow";
import useSeriesColors from "../../hooks/useSeriesColors";
import { chartSubtitle, chartTitle, seriesLabels } from "../../library/chartTitles";
import type { BarValue } from "../../library/explorerItems";
import { flagPriceChanges, nadacPackagePrices } from "../../library/flagNadacPriceChange";
import PriceChangeCards from "../ExplorerGrid/PriceChangeCards";
import SearchResultToast from "../ui/SearchResultToast";
import useNewSearchResult from "../../hooks/useNewSearchResult";
import { useSearchContext } from "../../Context/NadacSearchContext";
import { countMessage } from "../../library/searchToasts";

// Memoized (it takes no props) so the search form's keystrokes and changes to the workspace's
// tab list, such as a rename after a search, don't re-render every NADAC tab's results.
export default memo(function NadacSearchViz() {

  const { isLoading, isSuccess, dataUpdatedAt } = useNadacSearch();
  // The loaded result clipped to the search's dates (`NadacSearch` copies it in).
  const { data: prices, lastSearch } = useSearchContext();
  const resultKey = useNewSearchResult(lastSearch, isSuccess, dataUpdatedAt);
  const origin = useNadacChartOrigin();
  const { chartWindow } = useChartWindow(origin.resultPrices);
  const [barValue, setBarValue] = useState<BarValue>("latest");

  // System charts are derived from the current result on every render, like the FDA page's.
  // User charts live in the tab's pinned items and are not touched by a new search.
  const showAutoCharts = shouldAutoChart(prices);
  // The auto charts show the whole (clipped) result, so it is also the visible set.
  const colors = useSeriesColors(origin.resultPrices, prices);
  // Every package's changes, like the FDA page's; a NADAC result is already package-level.
  const priceChanges = useMemo(() => flagPriceChanges(nadacPackagePrices(prices)), [prices]);
  const packageCount = useMemo(() => new Set(prices.map(price => price.ndc)).size, [prices]);

  const labels = seriesLabels(prices);
  const barTitle = chartTitle("bar", origin.searchLabel, origin.seriesKind, labels);
  const lineTitle = chartTitle("line", origin.searchLabel, origin.seriesKind, labels);
  const autoChartSubtitle = chartSubtitle(labels.length, origin.seriesKind, chartWindow, prices);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        width: "100%"
      }}
    >
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 3 }}>
          <VizTools />
        </Grid>
        <Grid size={{ xs: 12, sm: 9 }}>
          <Paper sx={{ p: 1 }}>
            <NadacResultTable nadacPrices={prices} loading={isLoading} />
          </Paper>
        </Grid>
      </Grid>
      {showAutoCharts
        ?
        <Grid container spacing={1}>
          <Grid size={HALF_WIDTH_GRID_SIZE}>
            <ExplorerGridItem
              fill
              title={barTitle}
              subtitle={autoChartSubtitle}
              actions={<PinButton
                title={barTitle} chartType="bar" prices={prices} origin={origin} dateWindow={chartWindow}
                colors={colors} barValue={barValue}
              />}
            >
              <BarViz
                nadacPrices={prices}
                title={barTitle}
                colors={colors}
                dateWindow={chartWindow}
                barValue={barValue}
                onBarValueChange={setBarValue}
              />
            </ExplorerGridItem>
          </Grid>
          <Grid size={HALF_WIDTH_GRID_SIZE}>
            <ExplorerGridItem
              title={lineTitle}
              subtitle={autoChartSubtitle}
              actions={<PinButton
                title={lineTitle} chartType="line" prices={prices} origin={origin} dateWindow={chartWindow}
                colors={colors}
              />}
            >
              <LineViz nadacPrices={prices} title={lineTitle} colors={colors} dateWindow={chartWindow} />
            </ExplorerGridItem>
          </Grid>
        </Grid>
        : null
      }
      {priceChanges.length > 0
        ? <Grid container spacing={1}>
          <PriceChangeCards
            changes={priceChanges}
            prices={prices}
            chartWindow={chartWindow}
            origin={origin}
            colors={colors}
          />
        </Grid>
        : null
      }
      <SearchResultToast resultKey={resultKey} message={countMessage(packageCount, ["package", "packages"], "found")} />
      <SearchResultToast
        resultKey={resultKey}
        message={priceChanges.length > 0 ? countMessage(priceChanges.length, ["price change", "price changes"], "flagged") : null}
        kind="flag"
      />
      <PinnedSection />
    </Box>
  )
})
