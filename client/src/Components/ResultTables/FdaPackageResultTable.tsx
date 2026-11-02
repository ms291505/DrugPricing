import type { GridColDef } from "@mui/x-data-grid";
import { useMemo } from "react";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import type { FdaProductDetail } from "../../library/types";
import { fdaPackageRows, type FdaPackageRow } from "../../library/resultRows";
import ResultTable from "./ResultTable";
import { createPriceColumns } from "./priceColumns";

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

type Props = {
  /** The search's products after the page filter. */
  products: FdaProductDetail[],
  loading: boolean,
}

/** The FDA search's results at package level: one row per package. */
export default function FdaPackageResultTable({ products, loading }: Props) {
  const { selectedRows, setSelectedRows } = useFdaSearchContext();
  const rows = useMemo(() => fdaPackageRows(products), [products]);

  return (
    <ResultTable
      rows={rows}
      columns={COLUMNS}
      getRowId={getRowId}
      rowNoun="package"
      loading={loading}
      selection={selectedRows}
      onSelectionChange={setSelectedRows}
    />
  );
}
