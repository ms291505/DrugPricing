import { useId } from "react";
import toast from "react-hot-toast";
import { Box, Button, ButtonGroup, Typography } from "@mui/material";
import BarChartIcon from "@mui/icons-material/BarChart";
import SsidChartIcon from "@mui/icons-material/SsidChart";
import { usePinActions } from "../../Context/pinnedItemsContexts";
import { useSettings } from "../../Context/SettingsContext";
import { createChartItems, withLoadedDates, type ChartSource, type ChartType } from "../../library/explorerItems";
import { addedChartMessage, chartTitle, seriesLabels } from "../../library/chartTitles";
import { chartControlLabel, countSeries, manySeries, manySeriesWarning, overSeriesLimit } from "../../library/chartSeries";
import { splitByPricingUnit } from "../../library/prices";
import type { ChartPrice } from "../../library/types";
import type { AddedCharts } from "../../hooks/useAddedCharts";

type Props = {
  /** At the table's level: a pin keeps its loaded dates, origin and colors. */
  source: ChartSource,
  /** The shown prices of the selected rows (`selectedChartPrices`): what Line and Bar chart. */
  chartPrices: ChartPrice[],
  /** The rows checked, shown or hidden: the label names the hidden ones. */
  selectedCount: number,
  charts: AddedCharts,
  /** The results' narrow tier: the label goes above the buttons, which are touch-sized. */
  compact: boolean,
};

const CHART_TYPES: Array<{ type: ChartType, label: string, Icon: typeof BarChartIcon }> = [
  { type: "line", label: "Line", Icon: SsidChartIcon },
  { type: "bar", label: "Bar", Icon: BarChartIcon },
];

/**
 * The results toolbar's label and Line / Bar. Each press adds a card of the selected rows that are
 * shown (`AddedChartCard`), as Scan adds a list: the card keeps those rows while the selection
 * changes, and the status line under the toolbar reports it (`ResultsReport`). The selection
 * stays, so Bar can chart the same rows. With Pin charts when you make them on, each add also pins
 * a copy.
 */
export default function ChartControl({ source, chartPrices, selectedCount, charts, compact }: Props) {
  const { loadedPrices, origin, dateWindow, colors } = source;
  const { addItems } = usePinActions();
  const { settings } = useSettings();
  // At the table's level a shown row is one series, so this is also the shown selected rows.
  const seriesCount = countSeries(chartPrices);
  const hiddenCount = selectedCount - seriesCount;
  // Nothing to draw, or too much.
  const cantAdd = seriesCount === 0 || overSeriesLimit(seriesCount);
  const labelId = useId();

  const pin = (chartType: ChartType) => {
    const items = createChartItems({
      chartType,
      prices: withLoadedDates(chartPrices, loadedPrices()),
      defaultTitle: chartTitle(chartType, origin.searchLabel, origin.seriesKind, seriesLabels(chartPrices)),
      origin,
      dateWindow,
      colors,
    }, unitPrices => chartTitle(chartType, origin.searchLabel, origin.seriesKind, seriesLabels(unitPrices)));
    addItems(items);
    if (items.length > 1) toast.success(`Pinned ${items.length} ${chartType} charts, one per pricing unit (${items.map(item => item.series[0].unit).join(", ")}).`);
    else if (items.length === 1) toast.success(`Pinned a ${chartType} chart.`);
  };

  // Like a scan's card, the new card neither scrolls into view nor takes focus: the status line
  // says what was added, and its Show goes there.
  const add = (chartType: ChartType) => {
    const labels = seriesLabels(chartPrices);
    const ndcs = [...new Set(chartPrices.map(price => price.ndc))];
    const pricingUnits = splitByPricingUnit(chartPrices).map(group => group.pricingUnit);
    charts.add({ chartType, ndcs, labels, seriesKind: origin.seriesKind, pricingUnits },
      addedChartMessage(chartType, ndcs.length, origin.seriesKind, pricingUnits.length));
    if (manySeries(seriesCount)) toast(manySeriesWarning(seriesCount));
    if (settings.autoPinCharts) pin(chartType);
  };

  return (
    // Narrow: the label is a caption above Line and Bar, so they and Scan fit one line on a phone.
    // The two make one block, as wide as the wider, so the caption reads as the buttons' own.
    <Box sx={compact
      ? { display: "flex", flexDirection: "column", alignItems: "stretch", gap: 0.25 }
      : { display: "flex", alignItems: "center", gap: 1 }}>
      <Typography id={labelId} variant={compact ? "caption" : "body2"} color={cantAdd ? "text.secondary" : "text.primary"}>
        {chartControlLabel(seriesCount, hiddenCount)}
      </Typography>
      <ButtonGroup size="small" variant="outlined" fullWidth={compact} aria-labelledby={labelId}>
        {CHART_TYPES.map(({ type, label, Icon }) => (
          <Button key={type} startIcon={<Icon />} disabled={cantAdd}
            aria-label={`${label} chart of ${seriesCount} selected`} onClick={() => add(type)}
            sx={compact ? { minHeight: 44 } : undefined}>
            {label}
          </Button>
        ))}
      </ButtonGroup>
    </Box>
  );
}
