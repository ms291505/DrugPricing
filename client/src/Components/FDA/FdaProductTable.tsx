import { DATA_GRID_PAGE_SIZES, DEFAULT_DATA_GRID_PAGE_SIZE } from "../../library/constants";
import { DataGrid, type GridInitialState, } from "@mui/x-data-grid";
import useFdaSearch from "../../hooks/useFdaSearch";
import { applyFdaResultFilter, } from "../../library/types";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import { Paper } from "@mui/material";
import { FDA_PRODUCT_TABLE_COLUMNS } from "./FdaProductTableColumns";


export default function FdaProductTable() {

  const fdaSearch = useFdaSearch();

  const { fdaResultFilter, selectedRows, setSelectedRows } = useFdaSearchContext();

  const data = fdaSearch.data ?? { products: [] };

  const rows = applyFdaResultFilter(data, fdaResultFilter).products;

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
        sx={{
          border: 0,
          '& .MuiDataGrid-row.Mui-selected': {
            backgroundColor: 'transparent', // remove default blue tint
          },
          '& .MuiDataGrid-row.Mui-selected:hover': {
            backgroundColor: 'action.hover',
          },
          '& .row-dimmed': {
            opacity: 0.5,
            color: 'text.disabled',
          },
          '& .row-dimmed:hover': {
            opacity: 0.75, // slight lift on hover so it's still interactive-feeling
          },
        }}
        checkboxSelection
        rows={rows}
        columns={FDA_PRODUCT_TABLE_COLUMNS}
        loading={fdaSearch.isLoading}
        initialState={initialState}
        pageSizeOptions={DATA_GRID_PAGE_SIZES}
        getRowId={(fdaProduct) => fdaProduct.productNdc}
        rowSelectionModel={selectedRows}
        onRowSelectionModelChange={(model) => setSelectedRows(model)}
        disableRowSelectionExcludeModel
      />
    </Paper>
  )
}
