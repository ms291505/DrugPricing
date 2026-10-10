import { DataGrid, GRID_CHECKBOX_SELECTION_COL_DEF, GridCellCheckboxRenderer, type GridColDef, type GridInitialState, type GridRenderCellParams } from "@mui/x-data-grid";
import useFdaSearch from "../../hooks/useFdaSearch";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import { applyFdaResultFilter, type FdaPackageResultInfo } from "../../library/types";
import { DATA_GRID_PAGE_SIZES, DEFAULT_DATA_GRID_PAGE_SIZE } from "../../library/constants";
import { Paper, Tooltip } from "@mui/material";
import { createFdaPackageTableColumns } from "./FdaPackageTableColumns";

// Rows are keyed by package NDC so the selection matches the `ndc` of package-level prices.
const getRowId = (p: FdaPackageResultInfo) => p.ndcPackageCode;
const packageHasNadacPrices = (p: FdaPackageResultInfo) => p.nadacPrices.length > 0;
const CHECKBOX_COLUMN: GridColDef<FdaPackageResultInfo> = {
  ...GRID_CHECKBOX_SELECTION_COL_DEF,
  renderCell: (params: GridRenderCellParams<FdaPackageResultInfo>) =>
    packageHasNadacPrices(params.row) ? (
      <GridCellCheckboxRenderer {...params} />
    ) : (
      <Tooltip title="No NADAC prices available for this package">
        <span>
          <GridCellCheckboxRenderer {...params} />
        </span>
      </Tooltip>
    ),
};

export default function FdaPackageTable() {

  const { fdaResultFilter, selectedRows, setSelectedRows } = useFdaSearchContext();

  const fdaSearch = useFdaSearch();

  const data = fdaSearch.data ?? { products: [] };

  const rows: FdaPackageResultInfo[] = applyFdaResultFilter(data, fdaResultFilter)
    .products.flatMap(product =>
      product.fdaPackageDetails.map(fdaPackage =>
      ({
        ...fdaPackage,
        productNdc: product.productNdc,
        dosageFormName: product.dosageFormName,
        routeName: [...product.routeName],
        labelerName: product.labelerName,
      }))
    );

  const columns: GridColDef<FdaPackageResultInfo>[] = createFdaPackageTableColumns(data.products);

  const initialState: GridInitialState = {
    pagination: {
      paginationModel: {
        pageSize: DEFAULT_DATA_GRID_PAGE_SIZE,
      },
    },
  }

  return (
    <Paper elevation={3}>
      <DataGrid
        sx={{ border: 0 }}
        checkboxSelection
        rows={rows}
        columns={[CHECKBOX_COLUMN, ...columns]}
        loading={fdaSearch.isLoading}
        initialState={initialState}
        pageSizeOptions={DATA_GRID_PAGE_SIZES}
        getRowId={getRowId}
        isRowSelectable={params => packageHasNadacPrices(params.row)}
        rowSelectionModel={selectedRows}
        onRowSelectionModelChange={setSelectedRows}
        disableRowSelectionExcludeModel
      />
    </Paper>
  )
}
