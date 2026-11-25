import type { ReactNode } from "react";
import { Box } from "@mui/material";
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
  /** The rows checked, shown or hidden. */
  selectedCount: number,
  charts: LiveCharts,
  /** The page's scans (`usePriceChangeScans`), over its package prices. */
  scans: PriceChangeScans,
  /** Last in the row: FDA's detail level. */
  end?: ReactNode,
  /** The results' narrow tier: touch-sized targets, and Scan shows only its icon. */
  compact: boolean,
};

/**
 * Every way to act on the results, in the heading row: the chart label and Line / Bar, Scan price
 * changes, and on FDA the detail level. It's one item of that row, so when the heading and the
 * toolbar don't fit one line, the heading takes its own line above and the toolbar keeps its
 * line; only then does the toolbar wrap, and the label stays with Line and Bar. The scan's report
 * is under the row (`ScanReport`).
 */
export default function ResultsToolbar({ source, chartPrices, selectedCount, charts, scans, end, compact }: Props) {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: compact ? 1 : 2, rowGap: 1, minWidth: 0 }}>
      <ChartControl source={source} chartPrices={chartPrices} selectedCount={selectedCount} charts={charts} compact={compact} />
      <ScanControl onScan={scans.runScan} compact={compact} />
      {end}
    </Box>
  );
}
