import { Paper } from "@mui/material";
import { useMemo } from "react";
import useFdaSearch from "../../hooks/useFdaSearch";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import { applyFdaResultFilter, type FdaProductDetail } from "../../library/types";
import { FdaPackageResultTable, FdaProductResultTable } from "../ResultTables";

const EMPTY_PRODUCTS: FdaProductDetail[] = [];

export default function FdaSearchResults() {
  const fdaSearch = useFdaSearch();
  const { fdaResultDetailLevel, fdaResultFilter } = useFdaSearchContext();

  // Memoized: this re-renders on every selection change, and a new list rebuilds the table's rows.
  const products = useMemo(() => fdaSearch.data
    ? applyFdaResultFilter(fdaSearch.data, fdaResultFilter).products
    : EMPTY_PRODUCTS,
    [fdaSearch.data, fdaResultFilter]);

  return (
    <Paper elevation={3}>
      {fdaResultDetailLevel === "product"
        ? <FdaProductResultTable products={products} loading={fdaSearch.isLoading} />
        : <FdaPackageResultTable products={products} loading={fdaSearch.isLoading} />}
    </Paper>
  );
}
