import { useGridApiRef, GridFooter, GridFooterContainer, ColumnsPanelTrigger, Toolbar, ToolbarButton, DataGrid, GRID_CHECKBOX_SELECTION_COL_DEF, GridCellCheckboxRenderer, type GridColDef, type GridInitialState, type GridRenderCellParams, type GridRowId, type GridRowParams, type GridRowSelectionModel } from "@mui/x-data-grid";
import { Button, Tooltip, Typography } from "@mui/material";
import { useMemo } from "react";
import { DATA_GRID_PAGE_SIZES, DEFAULT_DATA_GRID_PAGE_SIZE } from "../../library/constants";
import AutosizeColumns from "./AutosizeColumns";
import useWidthTier from "../../hooks/useWidthTier";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import { useSettings } from "../../Context/SettingsContext";
import { columnVisibilityModel, columnOverridesFromModel, DEFAULT_HIDDEN_COLUMNS, type ResultTableType } from "../../library/settings";
import { orderColumns } from "../../library/columnOrder";
import { applyColumnBounds } from "../../library/columnBounds";
import { activityCounts } from "../../library/priceActivity";
import { formatWindow, type DateWindow } from "../../library/dates";
import type { PricedRow } from "../../library/resultRows";

type Props<R extends PricedRow> = {
  rows: R[],
  tableType: ResultTableType,
  /** The table's own columns; the selection checkboxes come first. Keep it stable (a module constant). */
  columns: GridColDef<R>[],
  /**
   * Field names to show first, in this order, when the table itself is narrow (below `sm`); the
   * other columns follow in `columns` order. Keep it stable (a module constant).
   */
  narrowOrder?: readonly string[],
  /** A row's id is the `ndc` of its chart prices, which Add Chart filters the selection on. */
  getRowId: (row: R) => GridRowId,
  /** What a row is, for the checkbox tooltip of a row without prices: "product", "package". */
  rowNoun: string,
  loading: boolean,
  dateWindow?: DateWindow,
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
export default function ResultTable<R extends PricedRow>({ rows, tableType, columns, narrowOrder, getRowId, rowNoun, loading, selection, onSelectionChange, dateWindow }: Props<R>) {
  const apiRef = useGridApiRef();
  const { settings, updateColumnOverrides } = useSettings();
  const overrides = settings.columnOverrides[tableType];
  const visibility = useMemo(() => columnVisibilityModel(DEFAULT_HIDDEN_COLUMNS[tableType], overrides), [overrides, tableType]);
  const [tableRef, widthTier] = useWidthTier<HTMLDivElement>();
  // The same column objects while the tier and narrow order stay: the grid keeps its sort, page,
  // selection and visibility. A new array (a tier flip changes the bounds; the narrow order flips
  // the order) resets dragged widths, and the columns are measured again anyway.
  const narrow = narrowOrder !== undefined && widthTier === "narrow";
  const tierColumns = useMemo(() => applyColumnBounds(columns, widthTier), [columns, widthTier]);
  const allColumns = useMemo(
    () => [checkboxColumn<R>(rowNoun), ...(narrow && narrowOrder ? orderColumns(tierColumns, narrowOrder) : tierColumns)],
    [rowNoun, tierColumns, narrow, narrowOrder],
  );

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 0.5 }}>
        {rows.length} {rowNoun}{rows.length === 1 ? "" : "s"}: {activityCounts(rows.map(row => row.priceActivity))}
        {dateWindow ? ` · ${formatWindow(dateWindow, null)}` : ""}
      </Typography>
      <DataGrid
        apiRef={apiRef}
        ref={tableRef}
        rowHeight={widthTier === "narrow" ? 44 : 52}
        columnHeaderHeight={widthTier === "narrow" ? 44 : 56}
        sx={theme => ({
          border: 0,
          width: "100%",
          minWidth: 0,
          "--DataGrid-rowBorderColor": theme.palette.divider,
          "& .MuiDataGrid-columnSeparator": { color: "divider" },
          "& .MuiDataGrid-withBorderColor": { borderColor: "divider" },
          "& .ndc-cell": { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" },
          "& .MuiTablePagination-toolbar": { minHeight: 44, px: 1 },
        })}
        checkboxSelection
        rows={rows}
        columns={allColumns}
        getRowId={getRowId}
        loading={loading}
        initialState={INITIAL_STATE}
        columnVisibilityModel={visibility}
        onColumnVisibilityModelChange={model => updateColumnOverrides(tableType, columnOverridesFromModel(DEFAULT_HIDDEN_COLUMNS[tableType], model))}
        slots={{ footer: ResultFooter }}
        slotProps={{
          footer: { resultTableType: tableType, compact: widthTier === "narrow" },
          columnsManagement: {
            // MUI's Reset returns to the mount-time saved choices, not the app defaults.
            // The footer's Reset columns owns that action instead.
            disableResetButton: true,
            getTogglableColumns: columns => columns.filter(column => column.field !== GRID_CHECKBOX_SELECTION_COL_DEF.field).map(column => column.field),
          },
        }}
        hideFooterSelectedRowCount={widthTier === "narrow"}
        pageSizeOptions={DATA_GRID_PAGE_SIZES}
        isRowSelectable={isRowSelectable}
        rowSelectionModel={selection}
        onRowSelectionModelChange={onSelectionChange}
        disableRowSelectionExcludeModel
      />
      <AutosizeColumns apiRef={apiRef} rows={rows} visibility={visibility} columns={allColumns} />
    </>
  );
}

/** The selection column, with a tooltip on the checkbox of a row that has no prices. */
function checkboxColumn<R extends PricedRow>(rowNoun: string): GridColDef<R> {
  return {
    ...GRID_CHECKBOX_SELECTION_COL_DEF,
    hideable: false,
    width: 44,
    minWidth: 44,
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

declare module "@mui/x-data-grid" {
  interface FooterPropsOverrides {
    resultTableType: ResultTableType;
    compact: boolean;
  }
}

function ResultFooter({ resultTableType, compact }: { resultTableType: ResultTableType, compact: boolean }) {
  const { settings, updateColumnOverrides } = useSettings();
  const defaults = DEFAULT_HIDDEN_COLUMNS[resultTableType];
  const visibility = columnVisibilityModel(defaults, settings.columnOverrides[resultTableType]);
  const canReset = Object.keys(columnOverridesFromModel(defaults, visibility)).length > 0;
  return (
    <GridFooterContainer sx={{ minHeight: 44 }}>
      <Toolbar aria-label="Results columns" style={{ justifyContent: "flex-start", flex: "0 0 auto", borderBottom: 0, minHeight: 44, padding: "0 4px", gap: 8 }}>
        <ColumnsPanelTrigger render={<ToolbarButton render={<Button size="small" variant="outlined" color="inherit" sx={{ color: "text.secondary", ...(compact && { minWidth: 0, px: 0.5 }) }} startIcon={<ViewColumnIcon />} />} />}>
          Columns
        </ColumnsPanelTrigger>
        {!compact && <ToolbarButton disabled={!canReset} render={<Button size="small" variant="outlined" color="inherit" sx={{ color: "text.secondary" }} />} onClick={() => updateColumnOverrides(resultTableType, {})}>
          Reset columns
        </ToolbarButton>}
      </Toolbar>
      <GridFooter sx={{
        border: 0, flex: "1 1 auto", minWidth: 0, minHeight: 44,
        ...(compact && {
          "& .MuiTablePagination-selectLabel, & .MuiTablePagination-input": { display: "none" },
          "& .MuiTablePagination-toolbar": { p: 0 },
          "& .MuiTablePagination-actions": { ml: 0 },
          "& .MuiTablePagination-displayedRows": { m: 0 },
        }),
      }} />
    </GridFooterContainer>
  );
}
