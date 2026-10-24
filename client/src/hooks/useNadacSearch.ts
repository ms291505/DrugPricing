import { useSearchContext } from "../Context/NadacSearchContext";
import { useQuery } from "@tanstack/react-query";
import { getNadacSearchResults } from "../api/nadacEndpoints";
import { CONSTANT } from "../library/constants";

export function useNadacSearch() {
  const { searchParams, searchEnabled } = useSearchContext();
  return useQuery({
    queryKey: ["nadacSearch", searchParams],
    queryFn: async () => getNadacSearchResults(
      searchParams!.ndcDescription,
      searchParams!.ndc,
      new Date(searchParams!.minDate),
      new Date(searchParams!.maxDate)
    ),
    enabled: searchParams !== null && searchEnabled,
    staleTime: CONSTANT.staleTime,
  });
}
