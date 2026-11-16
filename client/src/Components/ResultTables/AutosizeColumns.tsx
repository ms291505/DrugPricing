import { useEffect, useRef, type RefObject } from "react";
import { GRID_CHECKBOX_SELECTION_COL_DEF, type GridApi, type GridAutosizeOptions } from "@mui/x-data-grid";
import { usePageVisible } from "../../Context/pageVisibility";
import type { PricedRow } from "../../library/resultRows";

// Each column ends up as wide as its widest rendered cell or its header, between its own
// `minWidth` and `maxWidth` (`library/columnBounds.ts`).
const OPTIONS: GridAutosizeOptions = {
  includeHeaders: true,
  includeOutliers: true,
  expand: false,
};

/**
 * Sizes every visible data column to its content (never the checkbox column, and never one the
 * user dragged since the columns last changed). Only this small observer re-renders when a kept
 * page is shown; the table stays untouched. The grid measures the rows it has rendered, so the
 * widths follow the page on screen.
 */
export default function AutosizeColumns({ apiRef, rows, visibility, columns }: {
  apiRef: RefObject<GridApi | null>,
  rows: PricedRow[],
  visibility: Record<string, boolean>,
  /** The table's columns: a new array (the narrow/wide order flipped, or a new tier's bounds) is measured again. */
  columns: unknown,
}) {
  const visible = usePageVisible();
  // A new `columns` array resets the grid's widths, dragged ones too.
  const dragged = useRef(new Set<string>());
  useEffect(() => { dragged.current.clear(); }, [columns]);

  useEffect(() => {
    if (!visible) return;
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      // Wait until the new page/rows are rendered before measuring them.
      frame = requestAnimationFrame(() => {
        const api = apiRef.current;
        if (!api) return;
        const fields = api.getAllColumns().map(column => column.field)
          .filter(field => field !== GRID_CHECKBOX_SELECTION_COL_DEF.field && !dragged.current.has(field));
        void api.autosizeColumns({ ...OPTIONS, columns: fields });
      });
    };
    schedule();
    const api = apiRef.current;
    const unsubscribe = [
      api?.subscribeEvent("paginationModelChange", schedule),
      api?.subscribeEvent("sortModelChange", schedule),
      api?.subscribeEvent("filterModelChange", schedule),
      // Published only while the user drags a column's edge, never by autosizing or a double-click.
      api?.subscribeEvent("columnResize", ({ colDef }) => { dragged.current.add(colDef.field); }),
    ];
    return () => {
      cancelAnimationFrame(frame);
      unsubscribe.forEach(stop => stop?.());
    };
  }, [apiRef, rows, visibility, columns, visible]);
  return null;
}
