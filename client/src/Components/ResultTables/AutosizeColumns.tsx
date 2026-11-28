import { useEffect, useRef, type RefObject } from "react";
import { GRID_CHECKBOX_SELECTION_COL_DEF, type GridApi, type GridColDef, type GridAutosizeOptions } from "@mui/x-data-grid";
import { usePageVisible } from "../../Context/pageVisibility";
import type { PricedRow } from "../../library/resultRows";

// Each column ends up as wide as its widest rendered cell or its header, between its own
// `minWidth` and its autosize maximum (`library/columnBounds.ts`).
const OPTIONS: GridAutosizeOptions = {
  includeHeaders: true,
  includeOutliers: true,
  expand: false,
};

/**
 * Sizes `fields` to their content, then caps each at its maximum. The columns have no `maxWidth`,
 * so a drag can widen them past it, and the grid's autosize measures without one: the cap is
 * applied in the same task, before the browser paints.
 */
async function autosize(api: GridApi, fields: string[], maxWidths: Readonly<Record<string, number>>) {
  await api.autosizeColumns({ ...OPTIONS, columns: fields });
  const capped = fields.flatMap(field => {
    const column = api.getColumn(field);
    const max = maxWidths[field];
    return column && max !== undefined && column.computedWidth > max
      ? [{ ...column, width: max, computedWidth: max, flex: 0 }]
      : [];
  });
  if (capped.length) api.updateColumns(capped);
}

/**
 * Sizes every visible data column to its content (never the checkbox column, and never one the
 * user dragged since the columns last changed). Only this small observer re-renders when a kept
 * page is shown; the table stays untouched. The grid measures the rows it has rendered, so the
 * widths follow the page on screen. A double-click on a column's edge sizes that column again,
 * within its maximum, and it follows the content from then on. The table turns off the grid's own
 * double-click (`disableAutosize`), which would size it past the maximum.
 */
export default function AutosizeColumns<R extends PricedRow>({ apiRef, rows, visibility, columns, maxWidths }: {
  apiRef: RefObject<GridApi | null>,
  rows: PricedRow[],
  visibility: Record<string, boolean>,
  /** The table's columns: a new array (the narrow/wide order flipped, or a new tier's bounds) is measured again. */
  columns: readonly GridColDef<R>[],
  /** The widest autosizing makes each column, by field (`autosizeMaxWidths`); a drag may go wider. */
  maxWidths: Readonly<Record<string, number>>,
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
        void autosize(api, fields, maxWidths);
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
      api?.subscribeEvent("columnSeparatorDoubleClick", ({ field }, event) => {
        if (event.button !== 0 || field === GRID_CHECKBOX_SELECTION_COL_DEF.field) return;
        dragged.current.delete(field);
        void autosize(api, [field], maxWidths);
      }),
    ];
    return () => {
      cancelAnimationFrame(frame);
      unsubscribe.forEach(stop => stop?.());
    };
  }, [apiRef, rows, visibility, columns, maxWidths, visible]);
  return null;
}
