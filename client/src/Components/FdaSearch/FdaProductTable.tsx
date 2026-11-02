import { DATA_GRID_PAGE_SIZES, DEFAULT_DATA_GRID_PAGE_SIZE } from "../../library/constants";
import { DataGrid, type GridInitialState } from "@mui/x-data-grid";
import useFdaSearch from "../../hooks/useFdaSearch";
import { applyFdaResultFilter, type FdaProductDetail, } from "../../library/types";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import { Paper } from "@mui/material";
import { FDA_PRODUCT_TABLE_COLUMNS, type FdaProductRow } from "./FdaProductTableColumns";
import { fdaProductHasNadacPrices, fdaProductsToNadacPrices } from "../../library/fdaDataToNadacPrices";
import { summarizeByUnit } from "../../library/prices";
import { useMemo } from "react";
import { createPriceGatedCheckboxColumn } from "./createPriceGatedCheckboxColumn";

const getRowId = (p: FdaProductDetail) => p.productNdc;
const EMPTY_ROWS: FdaProductRow[] = [];
const CHECKBOX_COLUMN = createPriceGatedCheckboxColumn<FdaProductRow>(fdaProductHasNadacPrices, "product");
const COLUMNS = [CHECKBOX_COLUMN, ...FDA_PRODUCT_TABLE_COLUMNS];

export default function FdaProductTable() {

  const fdaSearch = useFdaSearch();

  const { fdaResultFilter, selectedRows, setSelectedRows } = useFdaSearchContext();

  // Prices are summarized from the product's chart series (its packages averaged per date),
  // after the page filter, so the table agrees with the product-level charts.
  const rows = useMemo(() => fdaSearch.data
    ? applyFdaResultFilter(fdaSearch.data, fdaResultFilter).products.map(product => ({
      ...product,
      priceSummaries: summarizeByUnit(fdaProductsToNadacPrices([product], "product")),
    }))
    : EMPTY_ROWS,
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
        columns={COLUMNS}
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
