import { useEffect, type RefObject } from "react";
import type { GridApi, GridAutosizeOptions } from "@mui/x-data-grid";
import { usePageVisible } from "../../Context/pageVisibility";
import type { PricedRow } from "../../library/resultRows";

const OPTIONS: GridAutosizeOptions = {
  columns: ["latestPrice", "minPrice", "maxPrice"],
  includeHeaders: true,
  includeOutliers: true,
  expand: false,
};

/** Only this small observer re-renders when a kept page is shown; the table stays untouched. */
export default function AutosizePriceColumns({ apiRef, rows, visibility }: {
  apiRef: RefObject<GridApi | null>,
  rows: PricedRow[],
  visibility: Record<string, boolean>,
}) {
  const visible = usePageVisible();
  useEffect(() => {
    if (!visible) return;
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      // Wait until the new page/rows are rendered before measuring their formatted prices.
      frame = requestAnimationFrame(() => { void apiRef.current?.autosizeColumns(OPTIONS); });
    };
    schedule();
    const api = apiRef.current;
    const unsubscribe = [
      api?.subscribeEvent("paginationModelChange", schedule),
      api?.subscribeEvent("sortModelChange", schedule),
      api?.subscribeEvent("filterModelChange", schedule),
    ];
    return () => {
      cancelAnimationFrame(frame);
      unsubscribe.forEach(stop => stop?.());
    };
  }, [apiRef, rows, visibility, visible]);
  return null;
}
