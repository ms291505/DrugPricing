import type { ReactNode } from "react";
import { Box } from "@mui/material";
import type { AddedCharts } from "../../hooks/useAddedCharts";
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
  /** The page's added charts (`useAddedCharts`), which Line and Bar add to. */
  charts: AddedCharts,
  /** The page's scans (`usePriceChangeScans`), over its package prices. */
  scans: PriceChangeScans,
  /** Last in the row: FDA's detail level. */
  end?: ReactNode,
  /** The results' narrow tier: captions above the buttons, and touch-sized targets. */
  compact: boolean,
};

/**
 * Every way to act on the results, in the heading row: the chart label and Line / Bar, Scan price
 * changes, and on FDA the detail level. It's one item of that row, so when the heading and the
 * toolbar don't fit one line, the heading takes its own line above and the toolbar keeps its
 * line; only then does the toolbar wrap, and the label stays with Line and Bar. On the narrow tier
 * the label and a "Price changes" caption sit above their buttons. The scan's report is under the
 * row (`ResultsReport`). On the narrow tier the detail level comes first, on its own line.
 */
export default function ResultsToolbar({ source, chartPrices, selectedCount, charts, scans, end, compact }: Props) {
  return (
    // Narrow: the captioned controls line up by their buttons, with more space between groups than
    // between a caption and its buttons.
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: compact ? "flex-end" : "center", columnGap: 2, rowGap: compact ? 1.5 : 1, minWidth: 0 }}>
      {/* Narrow: first, on a line of its own under the heading. It changes what the table shows,
          and the captioned actions then sit together just above the table. First in the DOM too,
          so the focus order matches. */}
      {compact && end && <Box sx={{ flexBasis: "100%" }}>{end}</Box>}
      <ChartControl source={source} chartPrices={chartPrices} selectedCount={selectedCount} charts={charts} compact={compact} />
      <ScanControl onScan={scans.runScan} compact={compact} />
      {!compact && end}
    </Box>
  );
}
