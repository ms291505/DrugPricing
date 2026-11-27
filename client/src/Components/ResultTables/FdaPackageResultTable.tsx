import type { DateWindow } from "../../library/dates";
import type { GridColDef } from "@mui/x-data-grid";
import { useMemo } from "react";
import { useAsOfReference } from "../../hooks/useAppInit";
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
  },
  {
    field: "ndcPackageCode",
    headerName: "Package NDC",
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
    cellClassName: "ndc-cell"
  },
  {
    field: "nonProprietaryName",
    headerName: "Generic Name",
    valueGetter: (_, row) => (row.nonProprietaryName.join(", "))
  },
  {
    field: "samplePackage",
    headerName: "Sample",
    valueGetter: (_, row) => (row.samplePackage ? "Yes" : "No"),
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
  },
];

// The order on a narrow table (a phone): the NDC and Latest Price lead, so the price shows without
// scrolling (checkbox 44 + NDC 120 + price up to 145 with a stale marker = 309px). Wider tables use
// COLUMNS' own order.
const NARROW_ORDER = ["ndcPackageCode", "latestPrice", "proprietaryName", "strengthNumber", "packageDescription", "priceActivity", "latestPriceDate"];

// Package NDC: the `ndc` of package-level prices.
const getRowId = (row: FdaPackageRow) => row.ndcPackageCode;

type Props = {
  /** The search's products after the page filter. */
  products: FdaProductDetail[],
  loading: boolean,
  dateWindow: DateWindow,
}

/** The FDA search's results at package level: one row per package. */
export default function FdaPackageResultTable({ products, loading, dateWindow }: Props) {
  const { selectedRows, setSelectedRows } = useFdaSearchContext();
  const reference = useAsOfReference(dateWindow);
  const rows = useMemo(() => fdaPackageRows(products, reference), [products, reference]);

  return (
    <ResultTable
      dateWindow={dateWindow}
      tableType="fdaPackage"
      rows={rows}
      columns={COLUMNS}
      narrowOrder={NARROW_ORDER}
      getRowId={getRowId}
      rowNoun="package"
      loading={loading}
      selection={selectedRows}
      onSelectionChange={setSelectedRows}
    />
  );
}
