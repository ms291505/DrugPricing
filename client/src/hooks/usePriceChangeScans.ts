import { useCallback, useState } from "react";
import { scanReportMessage } from "../library/chartTitles";
import { derivePriceEvents, groupPriceEvents, type PriceEventGroup } from "../library/priceActivity";
import type { ChartPrice } from "../library/types";

/**
 * One scan's card: its percent and the groups it found, fixed when it was made, and when that was
 * (`performance.now()`), its place among the page's cards (`madeCardsInOrder`).
 */
export type PriceChangeScan = { id: string, thresholdPercent: number, groups: PriceEventGroup[], order: number };

/** What the last scan found, for the status line beside Scan price changes. */
export type ScanReport = {
  message: string,
  /** The card it made, or null when it found nothing. */
  scanId: string | null,
  /** When it ran (`performance.now()`), so the status line shows the newer of this and an added chart's. */
  order: number,
};

export type PriceChangeScans = {
  /** The user closed Notable price changes. */
  autoClosed: boolean,
  closeAuto: () => void,
  /** Oldest first. */
  scans: PriceChangeScan[],
  /** Scans the prices at a percent: sets `report`, and adds a card when anything changed that much. */
  runScan: (thresholdPercent: number) => void,
  closeScan: (id: string) => void,
  /** What the last scan found; null until the first scan, and again once new prices arrive. */
  report: ScanReport | null,
};

/**
 * The page's price change scans and whether Notable price changes is closed, for the package
 * prices the page shows (`ResultCards`' `packageSource`). New prices (a search, or narrower dates
 * or filters) remove every scan, clear the report and reopen Notable price changes. Nothing here
 * is saved.
 */
export default function usePriceChangeScans(prices: ChartPrice[]): PriceChangeScans {
  const [autoClosed, setAutoClosed] = useState(false);
  const [scans, setScans] = useState<PriceChangeScan[]>([]);
  const [report, setReport] = useState<ScanReport | null>(null);
  const [scansPrices, setScansPrices] = useState(prices);
  if (scansPrices !== prices) {
    setScansPrices(prices);
    setAutoClosed(false);
    setScans([]);
    setReport(null);
  }

  const runScan = useCallback((thresholdPercent: number) => {
    const groups = groupPriceEvents(derivePriceEvents(prices, "package", thresholdPercent));
    const changeCount = groups.reduce((count, group) => count + group.events.length, 0);
    const scanId = groups.length ? crypto.randomUUID() : null;
    const order = performance.now();
    setReport({ message: scanReportMessage(changeCount, thresholdPercent), scanId, order });
    if (scanId) setScans(prev => [...prev, { id: scanId, thresholdPercent, groups, order }]);
  }, [prices]);
  const closeScan = useCallback((id: string) => setScans(prev => prev.filter(scan => scan.id !== id)), []);
  const closeAuto = useCallback(() => setAutoClosed(true), []);

  return { autoClosed, closeAuto, scans, runScan, closeScan, report };
}
