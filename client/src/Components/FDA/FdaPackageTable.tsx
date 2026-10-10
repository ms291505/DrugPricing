import { DataGrid, type GridColDef, type GridInitialState } from "@mui/x-data-grid";
import useFdaSearch from "../../hooks/useFdaSearch";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import { applyFdaResultFilter, type FdaPackageResultInfo } from "../../library/types";
import { DATA_GRID_PAGE_SIZES, DEFAULT_DATA_GRID_PAGE_SIZE } from "../../library/constants";
import { Paper } from "@mui/material";
import { createFdaPackageTableColumns } from "./FdaPackageTableColumns";
import { createPriceGatedCheckboxColumn } from "./createPriceGatedCheckboxColumn";
import { useMemo } from "react";

// Rows are keyed by package NDC so the selection matches the `ndc` of package-level prices.
const getRowId = (p: FdaPackageResultInfo) => p.ndcPackageCode;
const packageHasNadacPrices = (p: FdaPackageResultInfo) => p.nadacPrices.length > 0;
const CHECKBOX_COLUMN = createPriceGatedCheckboxColumn(packageHasNadacPrices, "package");
const EMPTY_RESULT = { products: [] };

export default function FdaPackageTable() {

  const { fdaResultFilter, selectedRows, setSelectedRows } = useFdaSearchContext();

  const fdaSearch = useFdaSearch();

  const data = fdaSearch.data ?? EMPTY_RESULT;

  // Memoized like the product table's rows: this table re-renders on every selection change.
  const rows: FdaPackageResultInfo[] = useMemo(() =>
    applyFdaResultFilter(data, fdaResultFilter)
      .products.flatMap(product =>
        product.fdaPackageDetails.map(fdaPackage =>
        ({
          ...fdaPackage,
          productNdc: product.productNdc,
          dosageFormName: product.dosageFormName,
          routeName: [...product.routeName],
          labelerName: product.labelerName,
        }))
      ),
    [data, fdaResultFilter]);

  const columns: GridColDef<FdaPackageResultInfo>[] = useMemo(
    () => [CHECKBOX_COLUMN, ...createFdaPackageTableColumns(data.products)],
    [data]);

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
        columns={columns}
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
