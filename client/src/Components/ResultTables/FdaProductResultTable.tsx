import type { GridColDef } from "@mui/x-data-grid";
import { useMemo } from "react";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import { isFdaProductOtc, type FdaProductDetail } from "../../library/types";
import { fdaProductRows, type FdaProductRow } from "../../library/resultRows";
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

type Props = {
  /** The search's products after the page filter. */
  products: FdaProductDetail[],
  loading: boolean,
}

/** The FDA search's results at product level: one row per product. */
export default function FdaProductResultTable({ products, loading }: Props) {
  const { selectedRows, setSelectedRows } = useFdaSearchContext();
  const rows = useMemo(() => fdaProductRows(products), [products]);

  return (
    <ResultTable
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
