import { DATA_GRID_PAGE_SIZES, DEFAULT_DATA_GRID_PAGE_SIZE } from "../../library/constants";
import { DataGrid, type GridColDef, type GridInitialState } from "@mui/x-data-grid";
import useFdaSearch from "../../hooks/useFdaSearch";
import { applyFdaResultFilter, isFdaProductOtc, type FdaProductDetail } from "../../types";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import { Typography, Paper } from "@mui/material";

export default function FdaProductTable() {

  const { fdaResultFilter } = useFdaSearchContext();

  const fdaSearch = useFdaSearch();

  const data = fdaSearch.data ?? { products: [] };

  const rows = applyFdaResultFilter(data, fdaResultFilter).products;

  const columns: GridColDef<FdaProductDetail>[] = [
    {
      field: "productNdc",
      headerName: "Product NDC",
      width: 125
    },
    {
      field: "proprietaryName",
      headerName: "Brand Name",
      width: 150
    },
    {
      field: "nonProprietaryName",
      headerName: "Generic Name",
      width: 150,
      valueGetter: (_, product: FdaProductDetail) => (product.nonProprietaryName.join(", "))
    },
    {
      field: "dosageFormName",
      headerName: "Form",
      valueGetter: (_, product) => (product.dosageFormName.replace(", ", ": "))
    },
    {
      field: "routeName",
      headerName: "Route",
      valueGetter: (_, product) => (product.routeName.join(", "))
    },
    {
      field: "strengthNumber",
      headerName: "Strength",
      valueGetter: (_, product) => (
        product.strengthNumber.map((s, i) => (s + " " + product.strengthUnit[i]))
      )
    },
    {
      field: "labelerName",
      headerName: "Labeler",
      width: 150
    },
    {
      field: "productTypeName",
      headerName: "OTC Drug",
      valueGetter: (_, product) => (
        isFdaProductOtc(product.productTypeName) ? "Yes" : "No"
      )
    },
  ]

  const initialState: GridInitialState = {
    pagination: {
      paginationModel: {
        pageSize: DEFAULT_DATA_GRID_PAGE_SIZE,
      },
    },
  }

  return (<>
    <Paper sx={{ p: 1, display: "flex", flexDirection: "column", alignItems: "center" }} elevation={3} component="div">
      <Typography variant="h6">Products</Typography>
    </Paper>
    <DataGrid
      sx={{ border: 0 }}
      rows={rows}
      columns={columns}
      loading={fdaSearch.isLoading}
      initialState={initialState}
      pageSizeOptions={DATA_GRID_PAGE_SIZES}
    />
  </>)
}
