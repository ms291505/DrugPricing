import { DATA_GRID_PAGE_SIZES, DEFAULT_DATA_GRID_PAGE_SIZE } from "../../library/constants";
import { DataGrid, type GridInitialState } from "@mui/x-data-grid";
import useFdaSearch from "../../hooks/useFdaSearch";
import { applyFdaResultFilter, type FdaProductDetail, } from "../../library/types";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import { Paper } from "@mui/material";
import { FDA_PRODUCT_TABLE_COLUMNS } from "./FdaProductTableColumns";
import { fdaProductHasNadacPrices } from "../../library/fdaDataToNadacPrices";
import { useMemo } from "react";
import { createPriceGatedCheckboxColumn } from "./createPriceGatedCheckboxColumn";

const getRowId = (p: FdaProductDetail) => p.productNdc;
const EMPTY_PRODUCTS: FdaProductDetail[] = [];
const CHECKBOX_COLUMN = createPriceGatedCheckboxColumn<FdaProductDetail>(fdaProductHasNadacPrices, "product");

export default function FdaProductTable() {

  const fdaSearch = useFdaSearch();

  const { fdaResultFilter, selectedRows, setSelectedRows } = useFdaSearchContext();

  const rows = useMemo(() => {
    return fdaSearch.data
      ? applyFdaResultFilter(fdaSearch.data, fdaResultFilter).products
      : EMPTY_PRODUCTS
  }
    ,
    [fdaSearch.data, fdaResultFilter]);

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
        }}
        checkboxSelection
        rows={rows}
        columns={[CHECKBOX_COLUMN, ...FDA_PRODUCT_TABLE_COLUMNS]}
        loading={fdaSearch.isLoading}
        initialState={initialState}
        pageSizeOptions={DATA_GRID_PAGE_SIZES}
        getRowId={getRowId}
        isRowSelectable={params => fdaProductHasNadacPrices(params.row)}
        rowSelectionModel={selectedRows}
        onRowSelectionModelChange={setSelectedRows}
        disableRowSelectionExcludeModel
      />
    </Paper>
  )
}
