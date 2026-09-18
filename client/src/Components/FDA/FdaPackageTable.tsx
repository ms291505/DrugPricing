import { DataGrid, type GridColDef, type GridInitialState } from "@mui/x-data-grid";
import useFdaSearch from "../../hooks/useFdaSearch";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import { applyFdaResultFilter, type FdaPackageResultInfo } from "../../library/types";
import { DATA_GRID_PAGE_SIZES, DEFAULT_DATA_GRID_PAGE_SIZE } from "../../library/constants";
import { Paper } from "@mui/material";
import { createFdaPackageTableColumns } from "./FdaPackageTableColumns";

export default function FdaPackageTable() {

  const { fdaResultFilter } = useFdaSearchContext();

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
        rows={rows}
        columns={columns}
        loading={fdaSearch.isLoading}
        initialState={initialState}
        pageSizeOptions={DATA_GRID_PAGE_SIZES}
        getRowId={r => r.id}
      />
    </Paper>
  )
}
