import { getFdaSearchResults } from "../api/fdaEndpoints";
import { useFdaSearchContext } from "../Context/FdaSearchContext";
import { useQuery } from "@tanstack/react-query";
import type { FdaProductSearchResult } from "../types";
import { CONSTANT } from "../library/constants";

export default function useFdaSearch<TData = FdaProductSearchResult>(
  select?: (data: FdaProductSearchResult) => TData
) {
  const { fdaSearchParams } = useFdaSearchContext();
  return useQuery({
    queryKey: ["fdaSearch", fdaSearchParams],
    queryFn: async () => getFdaSearchResults(
      fdaSearchParams!.propreitaryName
    ),
    enabled: fdaSearchParams !== null,
    staleTime: CONSTANT.staleTime,
    select
  });
}
