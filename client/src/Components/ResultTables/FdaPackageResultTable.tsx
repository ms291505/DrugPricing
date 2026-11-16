import type { ActivitySelectionRequest } from "../../hooks/useActivitySelection";
import type { DateWindow } from "../../library/dates";
import type { GridColDef } from "@mui/x-data-grid";
import { useMemo } from "react";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import { isFdaProductOtc, type FdaProductDetail } from "../../library/types";
import { formatStrength, fdaPackageRows, type FdaPackageRow } from "../../library/resultRows";
import { activityColumn } from "./activityColumn";
import ResultTable from "./ResultTable";
import { createPriceColumns } from "./priceColumns";

const PRICE_COLUMNS = createPriceColumns<FdaPackageRow>();

const COLUMNS: GridColDef<FdaPackageRow>[] = [
  {
    field: "proprietaryName",
    headerName: "Brand Name",
    width: 150,
  },
  {
    field: "ndcPackageCode",
    headerName: "Package NDC",
    width: 120,
    minWidth: 120,
    cellClassName: "ndc-cell"
  },
  PRICE_COLUMNS.latest,
  PRICE_COLUMNS.latestDate,
  activityColumn<FdaPackageRow>(),
  {
    field: "strengthNumber",
    headerName: "Strength",
    valueGetter: (_, row) => formatStrength(row),
  },
  {
    field: "packageDescription",
    headerName: "Package Description",
    width: 250,
  },
  ...PRICE_COLUMNS.range,
  {
    field: "productTypeName",
    headerName: "OTC Drug",
    valueGetter: (_, row) => isFdaProductOtc(row.productTypeName) ? "Yes" : "No",
  },
  {
    field: "productNdc",
    headerName: "Product NDC",
    width: 120,
    minWidth: 120,
    cellClassName: "ndc-cell"
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
  dateWindow?: DateWindow,
  activitySelection?: ActivitySelectionRequest,
}

/** The FDA search's results at package level: one row per package. */
export default function FdaPackageResultTable({ products, loading, activitySelection, dateWindow }: Props) {
  const { selectedRows, setSelectedRows } = useFdaSearchContext();
  const rows = useMemo(() => fdaPackageRows(products), [products]);

  return (
    <ResultTable
      dateWindow={dateWindow}
      activitySelection={activitySelection}
      tableType="fdaPackage"
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
