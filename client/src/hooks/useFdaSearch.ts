import { getFdaSearchResults } from "../api/fdaEndpoints";
import { useFdaSearchContext } from "../Context/FdaSearchContext";
import { useQuery } from "@tanstack/react-query";

export default function useFdaSearch() {
  const { fdaSearchParams } = useFdaSearchContext();
  return useQuery({
    queryKey: ["fdaSearch", fdaSearchParams],
    queryFn: async () => getFdaSearchResults(
      fdaSearchParams!.propreitaryName
    ),
    enabled: fdaSearchParams !== null
  });
}
