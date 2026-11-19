import { useMemo, useState } from "react";
import { Button, Grid, Stack, Typography } from "@mui/material";
import BarChartIcon from "@mui/icons-material/BarChart";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import BarViz from "../Charts/BarViz";
import LineViz from "../Charts/LineViz";
import ExplorerGridItem from "../ExplorerGrid/ExplorerGridItem";
import PinButton from "../ExplorerGrid/PinButton";
import { HALF_WIDTH_GRID_SIZE, MAX_AUTO_CHART_SERIES } from "../../library/constants";
import { shouldAutoChart } from "../../library/chartSeries";
import { chartSubtitle, chartTitle, seriesLabels } from "../../library/chartTitles";
import type { DateWindow } from "../../library/dates";
import type { BarValue, ChartOrigin } from "../../library/explorerItems";
import type { ChartPrice } from "../../library/types";

import { pricingUnitLabel, splitByPricingUnit } from "../../library/prices";

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
 * Opt-in live comparisons. Toggle choices survive searches while mounted, but are never saved.
 * The total series cap applies before splitting into one card per pricing unit.
 */
export default function AutoCharts({ prices, history, origin, colors, dateWindow }: Props) {
  const [showLatest, setShowLatest] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const groups = useMemo(() => splitByPricingUnit(prices), [prices]);
  const canCompare = shouldAutoChart(prices);
  if (!prices.length) return null;
  return <>
    <Grid size={12}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
        <Button size="small" variant={showLatest ? "contained" : "outlined"} disabled={!canCompare} aria-pressed={showLatest}
          startIcon={<BarChartIcon />} onClick={() => setShowLatest(value => !value)}>Chart latest prices</Button>
        <Button size="small" variant={showHistory ? "contained" : "outlined"} disabled={!canCompare} aria-pressed={showHistory}
          startIcon={<ShowChartIcon />} onClick={() => setShowHistory(value => !value)}>Chart price histories</Button>
        {!canCompare && <Typography variant="body2" color="text.secondary">
          Chart up to {MAX_AUTO_CHART_SERIES} series. Select rows and use Line or Bar to chart a smaller group.
        </Typography>}
      </Stack>
    </Grid>
    {canCompare && groups.map(group => <UnitAutoCharts key={group.pricingUnit}
      prices={group.nadacPrices} history={history} origin={origin} colors={colors} dateWindow={dateWindow}
      unitSuffix={groups.length > 1 ? ` · per ${pricingUnitLabel(group.pricingUnit)}` : ""}
      showLatest={showLatest} showHistory={showHistory}
    />)}
  </>;
}

function UnitAutoCharts({ prices, history, origin, colors, dateWindow, unitSuffix, showLatest, showHistory }: Props & { unitSuffix: string, showLatest: boolean, showHistory: boolean }) {
  const [barValue, setBarValue] = useState<BarValue>("latest");
  const labels = seriesLabels(prices);
  const barTitle = chartTitle("bar", origin.searchLabel, origin.seriesKind, labels) + unitSuffix;
  const lineTitle = chartTitle("line", origin.searchLabel, origin.seriesKind, labels) + unitSuffix;
  const subtitle = chartSubtitle(labels.length, origin.seriesKind, dateWindow, prices);

  return (<>
    {showLatest && <Grid size={HALF_WIDTH_GRID_SIZE}>
      <ExplorerGridItem
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
    </Grid>}
    {showHistory && <Grid size={HALF_WIDTH_GRID_SIZE}>
      <ExplorerGridItem
        title={lineTitle}
        subtitle={subtitle}
        actions={<PinButton
          title={lineTitle} chartType="line" prices={prices} history={history} origin={origin} dateWindow={dateWindow}
          colors={colors}
        />}
      >
        <LineViz seriesKind={origin.seriesKind} nadacPrices={prices} title={lineTitle} colors={colors} dateWindow={dateWindow} />
      </ExplorerGridItem>
    </Grid>}
  </>);
}
