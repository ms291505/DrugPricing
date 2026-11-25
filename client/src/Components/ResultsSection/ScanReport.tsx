import type { MouseEvent } from "react";
import { Box, Button, Typography } from "@mui/material";
import { priceChangeListTitle } from "../../library/chartTitles";
import type { PriceChangeScans } from "../../hooks/usePriceChangeScans";
import { fromKeyboard, nearestVisible } from "../ui/focus";

type Props = {
  /** The page's scans (`usePriceChangeScans`): the last report, and the cards still open. */
  scans: PriceChangeScans,
  /** The results' narrow tier: Show is 44px tall. */
  compact: boolean,
};

/**
 * What the last price change scan found, under the results heading row, with Show to go to its
 * card. The `role="status"` line is always mounted, so a screen reader hears each report; empty,
 * the row takes no space.
 */
export default function ScanReport({ scans: { report, scans }, compact }: Props) {
  const shownScan = report?.scanId ? scans.find(scan => scan.id === report.scanId) : undefined;
  const shownTitle = shownScan ? priceChangeListTitle(shownScan.thresholdPercent) : "";

  // Show goes somewhere: it scrolls to the card for everyone and focuses its heading only from
  // the keyboard, so a tap leaves no ring.
  const show = (event: MouseEvent<HTMLElement>) => {
    const card = nearestVisible(event.currentTarget, `[data-price-change-list="${report?.scanId}"]`);
    if (!card) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // The card's top, not its center: a long list is taller than the window, and centering it
    // would leave its heading above the top. `scroll-padding-top` keeps it clear of the app bar.
    card.scrollIntoView({ block: "start", behavior: reduceMotion ? "auto" : "smooth" });
    if (fromKeyboard(event)) card.querySelector<HTMLElement>("[data-card-heading]")?.focus({ preventScroll: true });
  };

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 1, px: { xs: 1, md: 0 }, mt: report ? 1 : 0 }}>
      <Typography role="status" variant="body2" color="text.secondary">{report?.message}</Typography>
      {shownScan && <Button size="small" aria-label={`Show ${shownTitle}`} onClick={show}
        sx={compact ? { minHeight: 44 } : undefined}>Show</Button>}
    </Box>
  );
}
