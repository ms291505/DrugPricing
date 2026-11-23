import { Box } from "@mui/material";
import useWidthTier from "../../hooks/useWidthTier";
import type { LiveCharts } from "../../hooks/useLiveCharts";
import type { PriceChangeScans } from "../../hooks/usePriceChangeScans";
import type { ChartSource } from "../../library/explorerItems";
import type { ChartPrice } from "../../library/types";
import ChartControl from "./ChartControl";
import ScanControl from "./ScanControl";

type Props = {
  /** At the table's level: Line and Bar chart from it. */
  source: ChartSource,
  /** The shown prices of the selected rows (`selectedChartPrices`). */
  chartPrices: ChartPrice[],
  /** The rows checked, shown or not. */
  selectedCount: number,
  charts: LiveCharts,
  /** The page's scans (`usePriceChangeScans`), over its package prices. */
  scans: PriceChangeScans,
};

/**
 * Every way to act on the results, above the table: the chart label and Line / Bar, then Scan
 * price changes with its status line and Show. It wraps, but the label stays with Line and Bar.
 * Its own width tier, which is the table's, makes it touch-sized and Scan icon-only when narrow.
 */
export default function ResultsToolbar({ source, chartPrices, selectedCount, charts, scans }: Props) {
  const [ref, widthTier] = useWidthTier<HTMLDivElement>();
  const compact = widthTier === "narrow";
  return (
    <Box ref={ref} sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: compact ? 1 : 2, rowGap: 1, px: { xs: 1, md: 0 } }}>
      <ChartControl source={source} chartPrices={chartPrices} selectedCount={selectedCount} charts={charts} compact={compact} />
      {/* Scan, its status line and Show are the row's own items, so a long report wraps on its
          own and doesn't take Scan off the first row. */}
      <ScanControl onScan={scans.runScan} report={scans.report} scans={scans.scans} compact={compact} />
    </Box>
  );
}
