import { getAdvancedFdaSearchReqults, } from "../api/fdaEndpoints";
import { useFdaSearchContext } from "../Context/FdaSearchContext";
import { useQuery } from "@tanstack/react-query";
import type { FdaProductSearchResult } from "../library/types";
import { CONSTANT } from "../library/constants";
import toast from "react-hot-toast";

export default function useFdaSearch<TData = FdaProductSearchResult>(
  select?: (data: FdaProductSearchResult) => TData,
) {
  const { fdaSearchParams, searchEnabled } = useFdaSearchContext();

  if (fdaSearchParams === undefined)
    throw new Error("useFdaSearch must be called within FdaSearchContext Provider.")

  return useQuery({
    queryKey: ["fdaSearch", fdaSearchParams],
    queryFn: async () =>
      toast.promise(
        getAdvancedFdaSearchReqults(fdaSearchParams!),
        {
          loading: "Searching FDA products…",
          success: (r) => `${r.products.length} products found`,
          error: (e: Error) => e.message,
        })
    ,
    enabled: fdaSearchParams !== null && searchEnabled,
    staleTime: CONSTANT.staleTime,
    select
  });
}
