import { Paper } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { useMemo } from "react";
import useFdaSearch from "../../hooks/useFdaSearch";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import { applyFdaResultFilter, isFdaProductOtc, type FdaProductDetail } from "../../library/types";
import { fdaProductsToNadacPrices } from "../../library/fdaDataToNadacPrices";
import { summarizeByUnit } from "../../library/prices";
import ResultTable from "./ResultTable";
import { createPriceColumns, type PricedRow } from "./priceColumns";

type FdaProductRow = FdaProductDetail & PricedRow;

const PRICE_COLUMNS = createPriceColumns<FdaProductRow>("Switch Detail Level to Package to see each package's price.");

const COLUMNS: GridColDef<FdaProductRow>[] = [
  {
    field: "productNdc",
    headerName: "Product NDC",
    width: 110
  },
  PRICE_COLUMNS.latest,
  {
    field: "proprietaryName",
    headerName: "Brand Name",
    width: 150
  },
  ...PRICE_COLUMNS.history,
  {
    field: "nonProprietaryName",
    headerName: "Generic Name",
    width: 150,
    valueGetter: (_, product) => (product.nonProprietaryName.join(", "))
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
      product.strengthNumber.map((s, i) => (s + " " + product.strengthUnit[i])).join(", ")
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
  {
    field: "packageCount",
    headerName: "Packages",
    valueGetter: (_, product) => (
      product.fdaPackageDetails.length
    )
  }
];

// Product NDC: the `ndc` of product-level prices.
const getRowId = (row: FdaProductRow) => row.productNdc;
const EMPTY_ROWS: FdaProductRow[] = [];

/** The FDA search's results at product level: one row per product. */
export default function FdaProductResultTable() {
  const fdaSearch = useFdaSearch();
  const { fdaResultFilter, selectedRows, setSelectedRows } = useFdaSearchContext();

  // Prices come from the product's chart series (its packages averaged per date), after the page
  // filter, so the table agrees with the product-level charts.
  const rows = useMemo(() => fdaSearch.data
    ? applyFdaResultFilter(fdaSearch.data, fdaResultFilter).products.map(product => ({
      ...product,
      priceSummaries: summarizeByUnit(fdaProductsToNadacPrices([product], "product")).get(product.productNdc) ?? [],
    }))
    : EMPTY_ROWS,
    [fdaSearch.data, fdaResultFilter]);

  return (
    <Paper elevation={3}>
      <ResultTable
        rows={rows}
        columns={COLUMNS}
        getRowId={getRowId}
        rowNoun="product"
        loading={fdaSearch.isLoading}
        selection={selectedRows}
        onSelectionChange={setSelectedRows}
      />
    </Paper>
  );
}
