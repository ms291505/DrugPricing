import { useState, type MouseEvent } from "react";
import { Box, Button, Typography } from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import { priceChangeListTitle } from "../../library/chartTitles";
import type { PriceChangeScans } from "../../hooks/usePriceChangeScans";
import type { AddedCharts } from "../../hooks/useAddedCharts";
import { fromKeyboard, nearestVisible } from "../ui/focus";

type Props = {
  /** The page's scans (`usePriceChangeScans`): the last report, and the cards still open. */
  scans: PriceChangeScans,
  /** The page's added charts (`useAddedCharts`): the last report, and the cards still open. */
  charts: AddedCharts,
  /** The results' narrow tier: Show is 44px tall. */
  compact: boolean,
};

/**
 * What the toolbar's last action made, under the results heading row: the newer of the last scan's
 * report and the last added chart's, with Show to go to its card while it's open. A new card
 * neither scrolls nor takes focus; Show does. Empty, the row takes no space.
 *
 * A live region speaks only when its text changes, and a second scan at the same percent or a
 * second chart of the same rows repeats the message. So the visible line is hidden from screen
 * readers, and two always-mounted, visually hidden status regions take turns: each report goes
 * into the one that was empty, so it is announced every time.
 */
export default function ResultsReport({ scans, charts, compact }: Props) {
  const scanReport = scans.report;
  const chartReport = charts.report;
  const chartIsNewer = chartReport !== null && (scanReport === null || chartReport.order > scanReport.order);
  const report = chartIsNewer ? chartReport : scanReport;
  // Which status region speaks the current report: it changes with every new report.
  const [slot, setSlot] = useState<{ order: number | undefined, index: 0 | 1 }>({ order: report?.order, index: 0 });
  if (slot.order !== report?.order) setSlot({ order: report?.order, index: slot.index === 0 ? 1 : 0 });

  // The card Show goes to, and its name for Show's label, while it's still open.
  const target = chartIsNewer
    ? (() => {
      const chart = charts.charts.find(c => c.id === chartReport.chartId);
      return chart && { selector: `[data-added-chart="${chart.id}"]`, name: `the added ${chart.chartType} chart` };
    })()
    : (() => {
      const scan = scanReport?.scanId ? scans.scans.find(s => s.id === scanReport.scanId) : undefined;
      return scan && { selector: `[data-price-change-list="${scan.id}"]`, name: priceChangeListTitle(scan.thresholdPercent) };
    })();

  // Show goes somewhere: it scrolls to the card for everyone and focuses its heading only from
  // the keyboard, so a tap leaves no ring.
  const show = (event: MouseEvent<HTMLElement>) => {
    if (!target) return;
    const card = nearestVisible(event.currentTarget, target.selector);
    if (!card) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // The card's top, not its center: a long list is taller than the window, and centering it
    // would leave its heading above the top. `scroll-padding-top` keeps it clear of the app bar.
    card.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
    if (fromKeyboard(event)) card.querySelector<HTMLElement>("[data-card-heading]")?.focus({ preventScroll: true });
  };

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 1, px: { xs: 1, md: 0 }, mt: report ? 1 : 0 }}>
      <Typography aria-hidden variant="body2" color="text.secondary">{report?.message}</Typography>
      <Box sx={visuallyHidden}>
        <span role="status">{slot.index === 0 ? report?.message : ""}</span>
        <span role="status">{slot.index === 1 ? report?.message : ""}</span>
      </Box>
      {target && <Button size="small" aria-label={`Show ${target.name}`} onClick={show}
        sx={compact ? { minHeight: 44 } : undefined}>Show</Button>}
    </Box>
  );
}
