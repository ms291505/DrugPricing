import { DataGrid, GRID_CHECKBOX_SELECTION_COL_DEF, GridCellCheckboxRenderer, type GridColDef, type GridInitialState, type GridRenderCellParams, type GridRowId, type GridRowParams, type GridRowSelectionModel } from "@mui/x-data-grid";
import { Tooltip } from "@mui/material";
import { useMemo } from "react";
import { DATA_GRID_PAGE_SIZES, DEFAULT_DATA_GRID_PAGE_SIZE } from "../../library/constants";
import type { PricedRow } from "../../library/resultRows";

type Props<R extends PricedRow> = {
  rows: R[],
  /** The table's own columns; the selection checkboxes come first. Keep it stable (a module constant). */
  columns: GridColDef<R>[],
  /** A row's id is the `ndc` of its chart prices, which Add Chart filters the selection on. */
  getRowId: (row: R) => GridRowId,
  /** What a row is, for the checkbox tooltip of a row without prices: "product", "package". */
  rowNoun: string,
  loading: boolean,
  /** The rows picked for Add Chart. */
  selection: GridRowSelectionModel,
  onSelectionChange: (selection: GridRowSelectionModel) => void,
}

const INITIAL_STATE: GridInitialState = {
  pagination: { paginationModel: { pageSize: DEFAULT_DATA_GRID_PAGE_SIZE } },
};

const hasPrices = (row: PricedRow) => row.priceSummaries.length > 0;
const isRowSelectable = (params: GridRowParams<PricedRow>) => hasPrices(params.row);

/**
 * The results table of a search page: one row per series, with the shared price columns
 * (`createPriceColumns`) and checkboxes that pick rows for Add Chart. A row without prices can't
 * be charted, so it can't be selected, and its checkbox says why.
 */
export default function ResultTable<R extends PricedRow>({ rows, columns, getRowId, rowNoun, loading, selection, onSelectionChange }: Props<R>) {
  const allColumns = useMemo(() => [checkboxColumn<R>(rowNoun), ...columns], [rowNoun, columns]);

  return (
    <DataGrid
      sx={{ border: 0 }}
      checkboxSelection
      rows={rows}
      columns={allColumns}
      getRowId={getRowId}
      loading={loading}
      initialState={INITIAL_STATE}
      pageSizeOptions={DATA_GRID_PAGE_SIZES}
      isRowSelectable={isRowSelectable}
      rowSelectionModel={selection}
      onRowSelectionModelChange={onSelectionChange}
      disableRowSelectionExcludeModel
    />
  );
}

/** The selection column, with a tooltip on the checkbox of a row that has no prices. */
function checkboxColumn<R extends PricedRow>(rowNoun: string): GridColDef<R> {
  return {
    ...GRID_CHECKBOX_SELECTION_COL_DEF,
    renderCell: (params: GridRenderCellParams<R>) =>
      hasPrices(params.row) ? (
        <GridCellCheckboxRenderer {...params} />
      ) : (
        <Tooltip title={`No NADAC prices available for this ${rowNoun}`}>
          <span>
            <GridCellCheckboxRenderer {...params} />
          </span>
        </Tooltip>
      ),
  };
}
