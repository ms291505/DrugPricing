import { useId, useMemo, useState, type FormEvent } from "react";
import { Box, Button, FormHelperText, Grid, Stack, TextField, Typography } from "@mui/material";
import BarChartIcon from "@mui/icons-material/BarChart";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import TroubleshootIcon from "@mui/icons-material/Troubleshoot";
import BarViz from "../Charts/BarViz";
import LineViz from "../Charts/LineViz";
import ExplorerGridItem from "../ExplorerGrid/ExplorerGridItem";
import PinButton from "../ExplorerGrid/PinButton";
import {
  HALF_WIDTH_GRID_SIZE, MAX_AUTO_CHART_SERIES, PRICE_CHANGE_SCAN_DEFAULT_PERCENT, PRICE_CHANGE_SCAN_MIN_PERCENT,
} from "../../library/constants";
import { parseScanThreshold } from "../../library/priceActivity";
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

type ScanProps = {
  /** Scans the page's package prices at a percent (`usePriceChangeScans`). */
  onScan: (thresholdPercent: number) => void,
  /** Why the last scan found nothing, or null. */
  scanMessage: string | null,
  /** The percent was edited: the last scan's message no longer applies. */
  onScanInputChange: () => void,
};

/**
 * Opt-in live comparisons. Toggle choices survive searches while mounted, but are never saved.
 * The total series cap applies before splitting into one card per pricing unit.
 */
export default function AutoCharts({ prices, history, origin, colors, dateWindow, onScan, scanMessage, onScanInputChange }: Props & ScanProps) {
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
        <ScanControl onScan={onScan} scanMessage={scanMessage} onScanInputChange={onScanInputChange} />
      </Stack>
    </Grid>
    {canCompare && groups.map(group => <UnitAutoCharts key={group.pricingUnit}
      prices={group.nadacPrices} history={history} origin={origin} colors={colors} dateWindow={dateWindow}
      unitSuffix={groups.length > 1 ? ` · per ${pricingUnitLabel(group.pricingUnit)}` : ""}
      showLatest={showLatest} showHistory={showHistory}
    />)}
  </>;
}

/**
 * A percent and Scan price changes, which adds a card of package changes of at least that percent.
 * A form, so Enter scans. Stays enabled when the comparisons are not: it lists, it doesn't chart.
 */
function ScanControl({ onScan, scanMessage, onScanInputChange }: ScanProps) {
  const [text, setText] = useState(String(PRICE_CHANGE_SCAN_DEFAULT_PERCENT));
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseScanThreshold(text);
    if ("error" in parsed) return setError(parsed.error);
    setError(null);
    onScan(parsed.percent);
  };
  return <>
    {/* `noValidate`: the field explains its own rule rather than the browser's step message. */}
    <Box component="form" noValidate onSubmit={submit} sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 1 }}>
      <TextField size="small" label="Change %" type="number" value={text} error={error !== null} sx={{ width: "7rem" }}
        onChange={event => { setText(event.target.value); setError(null); onScanInputChange(); }}
        slotProps={{ htmlInput: {
          min: PRICE_CHANGE_SCAN_MIN_PERCENT, step: 0.1, inputMode: "decimal",
          "aria-invalid": error !== null, "aria-describedby": error ? errorId : undefined,
        } }} />
      <Button type="submit" size="small" variant="outlined" startIcon={<TroubleshootIcon />}>Scan price changes</Button>
      {/* Under the whole control: the 7rem field is too narrow to hold the rule. */}
      {error && <FormHelperText id={errorId} error sx={{ flexBasis: "100%", mx: 0 }}>{error}</FormHelperText>}
    </Box>
    <Typography role="status" variant="body2" color="text.secondary">{scanMessage}</Typography>
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
