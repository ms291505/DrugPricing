import { useSearchContext } from "../Context/NadacSearchContext";
import { useQuery } from "@tanstack/react-query";
import { getNadacSearchResults } from "../api/nadacEndpoints";
import { CONSTANT } from "../library/constants";

/** The tab's loaded NADAC result: everything `loaded` asked for, before it's clipped or refined. */
export function useNadacSearch() {
  const { loaded, searchEnabled } = useSearchContext();
  return useQuery({
    queryKey: ["nadacSearch", loaded],
    queryFn: async () => getNadacSearchResults(loaded!),
    enabled: loaded !== null && searchEnabled,
    staleTime: CONSTANT.staleTime,
  });
}
