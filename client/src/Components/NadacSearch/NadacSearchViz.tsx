import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper"
import Grid from "@mui/material/Grid";
import TableViz from "./TableViz";
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
import { useState } from "react";
import useSeriesColors from "../../hooks/useSeriesColors";
import { chartSubtitle, chartTitle, seriesLabels } from "../../library/chartTitles";
import type { BarValue } from "../../library/seriesSummary";

export default function NadacSearchViz() {

  const { data, isLoading } = useNadacSearch();
  const origin = useNadacChartOrigin();
  const { chartWindow } = useChartWindow(origin.resultPrices);
  const [barValue, setBarValue] = useState<BarValue>("latest");

  // System charts are derived from the current result on every render, like the FDA page's.
  // User charts live in the tab's pinned items and are not touched by a new search.
  const prices = data?.prices ?? [];
  const showAutoCharts = shouldAutoChart(prices);
  // The same rows as `prices`, behind a stable empty fallback, so the colors stay memoized.
  const colors = useSeriesColors(origin.resultPrices, origin.resultPrices);

  const labels = seriesLabels(prices);
  const barTitle = chartTitle("bar", origin.searchLabel, origin.seriesKind, labels);
  const lineTitle = chartTitle("line", origin.searchLabel, origin.seriesKind, labels);
  const autoChartSubtitle = chartSubtitle(labels.length, origin.seriesKind, chartWindow, prices);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        width: "100%"
      }}
    >
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 3 }}>
          <VizTools />
        </Grid>
        <Grid size={{ xs: 12, sm: 9 }}>
          <Paper sx={{ p: 1 }}>
            <TableViz nadacPrices={prices} loading={isLoading} />
          </Paper>
        </Grid>
      </Grid>
      {showAutoCharts
        ?
        <Grid container spacing={2}>
          <Grid size={HALF_WIDTH_GRID_SIZE}>
            <ExplorerGridItem
              title={barTitle}
              subtitle={autoChartSubtitle}
              actions={<PinButton
                title={barTitle} chartType="bar" prices={prices} origin={origin} dateWindow={chartWindow}
                colors={colors} barValue={barValue}
              />}
            >
              <BarViz
                nadacPrices={prices}
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
              <LineViz nadacPrices={prices} colors={colors} dateWindow={chartWindow} />
            </ExplorerGridItem>
          </Grid>
        </Grid>
        : null
      }
      <PinnedSection />
    </Box>
  )
}
