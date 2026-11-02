import { Paper } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import { useMemo } from "react";
import useFdaSearch from "../../hooks/useFdaSearch";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import { applyFdaResultFilter, type FdaPackageDetail } from "../../library/types";
import { summarizeByUnit } from "../../library/prices";
import ResultTable from "./ResultTable";
import { createPriceColumns, type PricedRow } from "./priceColumns";

/** A package with the product fields its columns show. */
type FdaPackageRow = FdaPackageDetail & PricedRow & {
  productNdc: string,
  proprietaryName: string,
  nonProprietaryName: string[],
  dosageFormName: string,
  routeName: string[],
  labelerName: string,
};

const PRICE_COLUMNS = createPriceColumns<FdaPackageRow>();

const COLUMNS: GridColDef<FdaPackageRow>[] = [
  // The full code, so a phone fits it and the latest price without scrolling.
  {
    field: "ndcPackageCode",
    headerName: "Package NDC",
    width: 125
  },
  PRICE_COLUMNS.latest,
  {
    field: "proprietaryName",
    headerName: "Brand Name",
    width: 150,
  },
  ...PRICE_COLUMNS.history,
  {
    field: "productNdc",
    headerName: "Product NDC"
  },
  {
    field: "nonProprietaryName",
    headerName: "Generic Name",
    width: 150,
    valueGetter: (_, row) => (row.nonProprietaryName.join(", "))
  },
  {
    field: "samplePackage",
    headerName: "Sample",
    valueGetter: (_, row) => (row.samplePackage ? "Yes" : "No"),
    width: 75
  },
  {
    field: "packageDescription",
    headerName: "Package Description",
    width: 250,
  },
  {
    field: "dosageFormName",
    headerName: "Form",
    valueGetter: (_, row) => (row.dosageFormName.replace(", ", ": "))
  },
  {
    field: "routeName",
    headerName: "Route",
    valueGetter: (_, row) => (row.routeName.join(", "))
  },
  {
    field: "labelerName",
    headerName: "Labeler",
    width: 150
  },
];

// Package NDC: the `ndc` of package-level prices.
const getRowId = (row: FdaPackageRow) => row.ndcPackageCode;
const EMPTY_ROWS: FdaPackageRow[] = [];

/** The FDA search's results at package level: one row per package. */
export default function FdaPackageResultTable() {
  const fdaSearch = useFdaSearch();
  const { fdaResultFilter, selectedRows, setSelectedRows } = useFdaSearchContext();

  // Memoized: the table re-renders on every selection change. A package's own prices are keyed by
  // its stripped code, the NADAC join key.
  const rows = useMemo(() => fdaSearch.data
    ? applyFdaResultFilter(fdaSearch.data, fdaResultFilter).products.flatMap(product =>
      product.fdaPackageDetails.map((fdaPackage): FdaPackageRow => ({
        ...fdaPackage,
        productNdc: product.productNdc,
        proprietaryName: product.proprietaryName,
        nonProprietaryName: product.nonProprietaryName,
        dosageFormName: product.dosageFormName,
        routeName: product.routeName,
        labelerName: product.labelerName,
        priceSummaries: summarizeByUnit(fdaPackage.nadacPrices).get(fdaPackage.ndcPackageCodeStripped) ?? [],
      }))
    )
    : EMPTY_ROWS,
    [fdaSearch.data, fdaResultFilter]);

  return (
    <Paper elevation={3}>
      <ResultTable
        rows={rows}
        columns={COLUMNS}
        getRowId={getRowId}
        rowNoun="package"
        loading={fdaSearch.isLoading}
        selection={selectedRows}
        onSelectionChange={setSelectedRows}
      />
    </Paper>
  );
}
