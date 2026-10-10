import { GRID_CHECKBOX_SELECTION_COL_DEF, GridCellCheckboxRenderer, type GridColDef, type GridRenderCellParams, type GridValidRowModel } from "@mui/x-data-grid";
import { Tooltip } from "@mui/material";

/**
 * Selection checkbox column for the FDA result tables. Rows without NADAC prices can't be
 * charted, so the table marks them unselectable (`isRowSelectable`) and this column explains why.
 */
export function createPriceGatedCheckboxColumn<R extends GridValidRowModel>(
  hasPrices: (row: R) => boolean,
  noun: "product" | "package",
): GridColDef<R> {
  return {
    ...GRID_CHECKBOX_SELECTION_COL_DEF,
    renderCell: (params: GridRenderCellParams<R>) =>
      hasPrices(params.row) ? (
        <GridCellCheckboxRenderer {...params} />
      ) : (
        <Tooltip title={`No NADAC prices available for this ${noun}`}>
          <span>
            <GridCellCheckboxRenderer {...params} />
          </span>
        </Tooltip>
      ),
  };
}
