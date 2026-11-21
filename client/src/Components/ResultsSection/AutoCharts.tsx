import { useId, useMemo, useRef, useState, type FormEvent } from "react";
import { Button, Grid, Popover, Stack, TextField, Typography } from "@mui/material";
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
import type { BarValue, ChartSource } from "../../library/explorerItems";
import { pricingUnitLabel, splitByPricingUnit } from "../../library/prices";
import type { PriceChangeScans } from "../../hooks/usePriceChangeScans";

type Props = {
  /** At the series level the charts draw: the table's. */
  source: ChartSource,
  /** The page's scans (`usePriceChangeScans`): the Scan price changes control runs them. */
  scans: PriceChangeScans,
};

type ScanProps = {
  /** Scans the page's package prices at a percent (`usePriceChangeScans`). */
  onScan: (thresholdPercent: number) => void,
  /** Why the last scan found nothing, or null. */
  scanMessage: string | null,
};

/**
 * Opt-in live comparisons. Toggle choices survive searches while mounted, but are never saved.
 * The total series cap applies before splitting into one card per pricing unit.
 */
export default function AutoCharts({ source, scans }: Props) {
  const { prices } = source;
  const [showLatest, setShowLatest] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const groups = useMemo(() => splitByPricingUnit(prices), [prices]);
  const canCompare = shouldAutoChart(prices);
  if (!prices.length) return null;
  return (
    <>
      <Grid size={12}>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
          <Button size="small" variant={showLatest ? "contained" : "outlined"} disabled={!canCompare} aria-pressed={showLatest}
            startIcon={<BarChartIcon />} onClick={() => setShowLatest(value => !value)}>Chart latest prices</Button>
          <Button size="small" variant={showHistory ? "contained" : "outlined"} disabled={!canCompare} aria-pressed={showHistory}
            startIcon={<ShowChartIcon />} onClick={() => setShowHistory(value => !value)}>Chart price histories</Button>
          {!canCompare && <Typography variant="body2" color="text.secondary">
            Chart up to {MAX_AUTO_CHART_SERIES} series. Select rows and use Line or Bar to chart a smaller group.
          </Typography>}
          <ScanControl onScan={scans.runScan} scanMessage={scans.emptyMessage} />
        </Stack>
      </Grid>
      {canCompare && groups.map(group => (
        <UnitAutoCharts key={group.pricingUnit}
          source={{ ...source, prices: group.nadacPrices }}
          unitSuffix={groups.length > 1 ? ` · per ${pricingUnitLabel(group.pricingUnit)}` : ""}
          showLatest={showLatest} showHistory={showHistory}
        />
      ))}
    </>
  );
}

const SCAN_PRESETS = [PRICE_CHANGE_SCAN_MIN_PERCENT, PRICE_CHANGE_SCAN_DEFAULT_PERCENT, 20];

function ScanControl({ onScan, scanMessage }: ScanProps) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [lastPercent, setLastPercent] = useState(PRICE_CHANGE_SCAN_DEFAULT_PERCENT);
  const [text, setText] = useState(String(lastPercent));
  const [error, setError] = useState<string | null>(null);
  const dialogId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const updateText = (value: string) => {
    setText(value);
    setError(null);
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseScanThreshold(text);
    if ("error" in parsed) return setError(parsed.error);
    setLastPercent(parsed.percent);
    setAnchor(null);
    onScan(parsed.percent);
  };

  return (
    <>
      <Button size="small" variant="outlined" startIcon={<TroubleshootIcon />}
        aria-haspopup="dialog" aria-expanded={Boolean(anchor)} aria-controls={anchor ? dialogId : undefined}
        onClick={event => { updateText(String(lastPercent)); setAnchor(event.currentTarget); }}>
        Scan price changes
      </Button>
      {anchor && <Popover open anchorEl={anchor} onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{
          paper: { id: dialogId, role: "dialog", "aria-modal": true, "aria-label": "Scan price changes", sx: { p: 2, width: 280 } },
          transition: { onEntered: () => inputRef.current?.focus() },
        }}>
        <Stack component="form" noValidate onSubmit={submit} spacing={1.5}>
          <TextField inputRef={inputRef} size="small" label="Minimum change (%)" type="number" value={text}
            error={error !== null} helperText={error}
            onChange={event => updateText(event.target.value)}
            slotProps={{ htmlInput: { min: PRICE_CHANGE_SCAN_MIN_PERCENT, step: 0.1, inputMode: "decimal" } }} />
          <Stack direction="row" spacing={1} role="group" aria-label="Recommended thresholds">
            {SCAN_PRESETS.map(percent => {
              const selected = text !== "" && Number(text) === percent;
              return (
                <Button key={percent} type="button" size="small" variant={selected ? "contained" : "outlined"}
                  aria-pressed={selected} onClick={() => { updateText(String(percent)); inputRef.current?.focus(); }}>
                  {percent}%
                </Button>
              );
            })}
          </Stack>
          <Button type="submit" size="small" variant="contained" sx={{ alignSelf: "flex-end" }}>Scan</Button>
        </Stack>
      </Popover>}
      <Typography role="status" variant="body2" color="text.secondary">{scanMessage}</Typography>
    </>
  );
}

type UnitProps = {
  /** One pricing unit's share of the page's source. */
  source: ChartSource,
  unitSuffix: string,
  showLatest: boolean,
  showHistory: boolean,
};

function UnitAutoCharts({ source, unitSuffix, showLatest, showHistory }: UnitProps) {
  const { prices, loadedPrices, origin, colors, dateWindow } = source;
  const [barValue, setBarValue] = useState<BarValue>("latest");
  const labels = seriesLabels(prices);
  const barTitle = chartTitle("bar", origin.searchLabel, origin.seriesKind, labels) + unitSuffix;
  const lineTitle = chartTitle("line", origin.searchLabel, origin.seriesKind, labels) + unitSuffix;
  const subtitle = chartSubtitle(labels.length, origin.seriesKind, dateWindow, prices);

  return (
    <>
      {showLatest && <Grid size={HALF_WIDTH_GRID_SIZE}>
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
      {showHistory && <Grid size={HALF_WIDTH_GRID_SIZE}>
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
    </>
  );
}
