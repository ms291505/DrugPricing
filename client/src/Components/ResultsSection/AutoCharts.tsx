import { useState } from "react";
import { Grid } from "@mui/material";
import BarViz from "../Charts/BarViz";
import LineViz from "../Charts/LineViz";
import ExplorerGridItem from "../ExplorerGrid/ExplorerGridItem";
import PinButton from "../ExplorerGrid/PinButton";
import { HALF_WIDTH_GRID_SIZE } from "../../library/constants";
import { shouldAutoChart } from "../../library/chartSeries";
import { chartSubtitle, chartTitle, seriesLabels } from "../../library/chartTitles";
import type { DateWindow } from "../../library/dates";
import type { BarValue, ChartOrigin } from "../../library/explorerItems";
import type { ChartPrice } from "../../library/types";

type Props = {
  /** The page's result as shown, at the series level the charts draw. */
  prices: ChartPrice[],
  /** The view's `history` at the same level, for pins. */
  history: () => ChartPrice[],
  origin: ChartOrigin,
  colors: Map<string, string>,
  /** The dates shown (the view's `dateWindow`). */
  dateWindow: DateWindow,
};

/**
 * A search's bar and line auto charts, as half-width grid items, when the result is small
 * enough to chart (`shouldAutoChart`). They're derived from the result on every change; pinning
 * one keeps a copy.
 */
export default function AutoCharts({ prices, history, origin, colors, dateWindow }: Props) {
  const [barValue, setBarValue] = useState<BarValue>("latest");
  if (!shouldAutoChart(prices)) return null;

  const labels = seriesLabels(prices);
  const barTitle = chartTitle("bar", origin.searchLabel, origin.seriesKind, labels);
  const lineTitle = chartTitle("line", origin.searchLabel, origin.seriesKind, labels);
  const subtitle = chartSubtitle(labels.length, origin.seriesKind, dateWindow, prices);

  return (<>
    <Grid size={HALF_WIDTH_GRID_SIZE}>
      <ExplorerGridItem
        fill
        title={barTitle}
        subtitle={subtitle}
        actions={<PinButton
          title={barTitle} chartType="bar" prices={prices} history={history} origin={origin} dateWindow={dateWindow}
          colors={colors} barValue={barValue}
        />}
      >
        <BarViz
          nadacPrices={prices}
          title={barTitle}
          colors={colors}
          dateWindow={dateWindow}
          barValue={barValue}
          onBarValueChange={setBarValue}
        />
      </ExplorerGridItem>
    </Grid>
    <Grid size={HALF_WIDTH_GRID_SIZE}>
      <ExplorerGridItem
        title={lineTitle}
        subtitle={subtitle}
        actions={<PinButton
          title={lineTitle} chartType="line" prices={prices} history={history} origin={origin} dateWindow={dateWindow}
          colors={colors}
        />}
      >
        <LineViz nadacPrices={prices} title={lineTitle} colors={colors} dateWindow={dateWindow} />
      </ExplorerGridItem>
    </Grid>
  </>);
}
