import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFdaLabelers } from "../api/fdaEndpoints";
import { buildLabelerIndex, type LabelerIndex } from "../library/labelers";

/**
 * The labeler list and its match index, fetched once the Labeler field is first used (`enabled`)
 * and kept for the session: the FDA load changes it at most once a day, and a restored tab shows
 * its picks from their stored names without it.
 */
export default function useFdaLabelers(enabled: boolean): { index: LabelerIndex | null, isLoading: boolean, isError: boolean } {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["fdaLabelers"],
    queryFn: ({ signal }) => getFdaLabelers(signal),
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const index = useMemo(() => data ? buildLabelerIndex(data) : null, [data]);
  return { index, isLoading, isError };
}
