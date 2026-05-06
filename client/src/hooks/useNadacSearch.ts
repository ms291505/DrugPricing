import { useSearchContext } from "../Context/SearchContext";
import { useQuery } from "@tanstack/react-query";
import { getNadacSearchResults } from "../api/nadacEndpoints";

export function useNadacSearch() {
  const { searchParams } = useSearchContext();
  return useQuery({
    queryKey: ["nadacSearch", searchParams],
    queryFn: async () => getNadacSearchResults(
      searchParams!.ndcDescription,
      searchParams!.ndc,
      new Date(searchParams!.minDate),
      new Date(searchParams!.maxDate)
    ),
    enabled: searchParams !== null
  });
}
