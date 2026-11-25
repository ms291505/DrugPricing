import { useMemo, useState } from "react";
import { Grid } from "@mui/material";
import BarViz from "../Charts/BarViz";
import LineViz from "../Charts/LineViz";
import ExplorerGridItem from "../ExplorerGrid/ExplorerGridItem";
import PinButton from "../ExplorerGrid/PinButton";
import { HALF_WIDTH_GRID_SIZE } from "../../library/constants";
import { chartSubtitle, chartTitle, seriesLabels } from "../../library/chartTitles";
import type { BarValue, ChartSource, ChartType } from "../../library/explorerItems";
import { pricingUnitLabel, splitByPricingUnit } from "../../library/prices";
import type { ChartPrice } from "../../library/types";

type Props = {
  /** At the table's level: its loaded prices, origin, colors and dates. */
  source: ChartSource,
  /** The shown prices of the selected rows (`selectedChartPrices`): what the cards draw. */
  chartPrices: ChartPrice[],
  /** Which cards the toolbar's Line and Bar toggles have on (`useLiveCharts`). */
  on: Record<ChartType, boolean>,
};

/**
 * The live cards of the selected rows, one line and one bar card per pricing unit while their
 * toggles are on. They follow the selection, dates and filters, and are never stored; Pin keeps a
 * copy. Each card's grid item carries `data-live-chart` (its chart type), which the toolbar
 * scrolls to.
 */
export default function SelectionCharts({ source, chartPrices, on }: Props) {
  const groups = useMemo(() => splitByPricingUnit(chartPrices), [chartPrices]);
  if (!on.line && !on.bar) return null;
  return groups.map(group => (
    <UnitCharts key={group.pricingUnit}
      source={{ ...source, prices: group.nadacPrices }}
      unitSuffix={groups.length > 1 ? ` · per ${pricingUnitLabel(group.pricingUnit)}` : ""}
      on={on}
    />
  ));
}

type UnitProps = {
  /** One pricing unit's share of the page's source. */
  source: ChartSource,
  unitSuffix: string,
  on: Record<ChartType, boolean>,
};

function UnitCharts({ source, unitSuffix, on }: UnitProps) {
  const { prices, loadedPrices, origin, colors, dateWindow } = source;
  const [barValue, setBarValue] = useState<BarValue>("latest");
  const labels = seriesLabels(prices);
  const barTitle = chartTitle("bar", origin.searchLabel, origin.seriesKind, labels) + unitSuffix;
  const lineTitle = chartTitle("line", origin.searchLabel, origin.seriesKind, labels) + unitSuffix;
  const subtitle = chartSubtitle(labels.length, origin.seriesKind, dateWindow, prices);

  return (
    <>
      {on.line && <Grid size={HALF_WIDTH_GRID_SIZE} data-live-chart="line">
        <ExplorerGridItem
          title={lineTitle}
          subtitle={subtitle}
          actions={<PinButton
            title={lineTitle} chartType="line" prices={prices} loadedPrices={loadedPrices} origin={origin} dateWindow={dateWindow}
            colors={colors}
          />}
        >
          <LineViz seriesKind={origin.seriesKind} nadacPrices={prices} title={lineTitle} colors={colors} dateWindow={dateWindow} />
        </ExplorerGridItem>
      </Grid>}
      {on.bar && <Grid size={HALF_WIDTH_GRID_SIZE} data-live-chart="bar">
        <ExplorerGridItem
          title={barTitle}
          subtitle={subtitle}
          actions={<PinButton
            title={barTitle} chartType="bar" prices={prices} loadedPrices={loadedPrices} origin={origin} dateWindow={dateWindow}
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
    </>
  );
}
