import { useMemo } from "react";
import { useFdaSearchContext } from "../Context/FdaSearchContext";
import { applyFdaResultFilter } from "../library/types";
import type { ExplorerItemSource } from "../library/explorerItems";
import useFdaSearch from "./useFdaSearch";

const countPackages = (products: { fdaPackageDetails: unknown[] }[]) =>
  products.reduce((sum, product) => sum + product.fdaPackageDetails.length, 0);

/** Provenance for items pinned from an FDA search tab, as of right now. */
export default function useFdaItemSource(): Omit<ExplorerItemSource, "seriesCount"> {
  const { fdaSearchParams, fdaResultFilter, fdaResultDetailLevel } = useFdaSearchContext();
  const { data } = useFdaSearch();

  const filtered = useMemo(() => {
    if (!data) return false;
    const kept = applyFdaResultFilter(data, fdaResultFilter).products;
    return kept.length < data.products.length || countPackages(kept) < countPackages(data.products);
  }, [data, fdaResultFilter]);

  const searchLabel = fdaSearchParams?.proprietaryName
    || fdaSearchParams?.nonProprietaryName
    || fdaSearchParams?.productNdc
    || "search";

  return {
    searchLabel,
    seriesLabel: fdaResultDetailLevel === "product" ? "Products" : "Packages",
    filtered,
  };
}
