import { Paper } from "@mui/material";
import { useRefinedFdaSearch } from "../../hooks/useFdaSearch";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import { type FdaProductDetail } from "../../library/types";
import { FdaPackageResultTable, FdaProductResultTable } from "../ResultTables";

const EMPTY_PRODUCTS: FdaProductDetail[] = [];

export default function FdaSearchResults() {
  const { query, refined } = useRefinedFdaSearch();
  const { fdaResultDetailLevel } = useFdaSearchContext();
  // `refined` is memoized: this re-renders on every selection change, and a new list rebuilds
  // the table's rows.
  const products = refined?.products ?? EMPTY_PRODUCTS;

  return (
    <Paper elevation={3}>
      {fdaResultDetailLevel === "product"
        ? <FdaProductResultTable products={products} loading={query.isLoading} />
        : <FdaPackageResultTable products={products} loading={query.isLoading} />}
    </Paper>
  );
}
