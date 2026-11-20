import { useCallback, useState } from "react";
import { derivePriceEvents, groupPriceEvents, type PriceEventGroup } from "../library/priceActivity";
import type { ChartPrice } from "../library/types";

/** One scan's card: its percent and the groups it found, fixed when it was made. */
export type PriceChangeScan = { id: string, thresholdPercent: number, groups: PriceEventGroup[] };

export type PriceChangeScans = {
  /** The user closed Notable price changes. */
  autoClosed: boolean,
  closeAuto: () => void,
  /** Oldest first. */
  scans: PriceChangeScan[],
  /** Scans the prices at a percent: adds a card, or sets `emptyMessage` when nothing changed that much. */
  runScan: (thresholdPercent: number) => void,
  closeScan: (id: string) => void,
  /** Why the last scan made no card; null once the user scans again, edits the percent or new prices arrive. */
  emptyMessage: string | null,
  clearEmptyMessage: () => void,
};

/**
 * The page's price change scans and whether Notable price changes is closed, for the package
 * prices the page shows (`PriceChangesSection`'s `prices`). New prices (a search, or narrower dates
 * or filters) remove every scan and reopen Notable price changes. Nothing here is saved.
 */
export default function usePriceChangeScans(prices: ChartPrice[]): PriceChangeScans {
  const [autoClosed, setAutoClosed] = useState(false);
  const [scans, setScans] = useState<PriceChangeScan[]>([]);
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);
  const [scansPrices, setScansPrices] = useState(prices);
  if (scansPrices !== prices) {
    setScansPrices(prices);
    setAutoClosed(false);
    setScans([]);
    setEmptyMessage(null);
  }

  const runScan = useCallback((thresholdPercent: number) => {
    const groups = groupPriceEvents(derivePriceEvents(prices, "package", thresholdPercent));
    if (!groups.length) {
      setEmptyMessage(`No package changes of ${thresholdPercent}% or more in these dates and filters.`);
      return;
    }
    setEmptyMessage(null);
    setScans(prev => [...prev, { id: crypto.randomUUID(), thresholdPercent, groups }]);
  }, [prices]);
  const closeScan = useCallback((id: string) => setScans(prev => prev.filter(scan => scan.id !== id)), []);
  const closeAuto = useCallback(() => setAutoClosed(true), []);
  const clearEmptyMessage = useCallback(() => setEmptyMessage(null), []);

  return { autoClosed, closeAuto, scans, runScan, closeScan, emptyMessage, clearEmptyMessage };
}
