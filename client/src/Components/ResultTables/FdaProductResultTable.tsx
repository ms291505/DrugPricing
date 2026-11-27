import type { DateWindow } from "../../library/dates";
import type { GridColDef } from "@mui/x-data-grid";
import { useMemo } from "react";
import { useAsOfReference } from "../../hooks/useAppInit";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import { isFdaProductOtc, type FdaProductDetail } from "../../library/types";
import { fdaProductRows, type FdaProductRow } from "../../library/resultRows";
import { formatStrength } from "../../library/strength";
import { activityColumn } from "./activityColumn";
import ResultTable from "./ResultTable";
import { createPriceColumns } from "./priceColumns";

const PRICE_COLUMNS = createPriceColumns<FdaProductRow>({
  mixedUnitsHint: "Switch Detail Level to Package to see each package's price.",
  averagesPackages: true,
});

const COLUMNS: GridColDef<FdaProductRow>[] = [
  {
    field: "productNdc",
    headerName: "Product NDC",
    cellClassName: "ndc-cell"
  },
  PRICE_COLUMNS.latest,
  {
    field: "proprietaryName",
    headerName: "Brand Name",
  },
  {
    field: "strengthNumber",
    headerName: "Strength",
    valueGetter: (_, product) => formatStrength(product)
  },
  activityColumn<FdaProductRow>(),
  {
    field: "dosageFormName",
    headerName: "Form",
    valueGetter: (_, product) => (product.dosageFormName.replace(", ", ": "))
  },
  PRICE_COLUMNS.latestDate,
  ...PRICE_COLUMNS.range,
  {
    field: "nonProprietaryName",
    headerName: "Generic Name",
    valueGetter: (_, product) => (product.nonProprietaryName.join(", "))
  },
  {
    field: "routeName",
    headerName: "Route",
    valueGetter: (_, product) => (product.routeName.join(", "))
  },
  {
    field: "labelerName",
    headerName: "Labeler",
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

type Props = {
  /** The search's products after the page filter. */
  products: FdaProductDetail[],
  loading: boolean,
  dateWindow: DateWindow,
}

/** The FDA search's results at product level: one row per product. */
export default function FdaProductResultTable({ products, loading, dateWindow }: Props) {
  const { selectedRows, setSelectedRows } = useFdaSearchContext();
  const reference = useAsOfReference(dateWindow);
  const rows = useMemo(() => fdaProductRows(products, reference), [products, reference]);

  return (
    <ResultTable
      dateWindow={dateWindow}
      tableType="fdaProduct"
      rows={rows}
      columns={COLUMNS}
      getRowId={getRowId}
      rowNoun="product"
      loading={loading}
      selection={selectedRows}
      onSelectionChange={setSelectedRows}
    />
  );
}
