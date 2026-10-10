import { useSearchContext } from "../Context/SearchContext";
import type { ExplorerItemSource } from "../library/explorerItems";

/** Provenance for items pinned from a NADAC search tab, as of right now. */
export default function useNadacItemSource(): Omit<ExplorerItemSource, "seriesCount"> {
  const { searchParams, ndcDescriptions, selectedNdcDescriptions } = useSearchContext();

  const searchLabel = searchParams?.ndcDescription
    || (searchParams?.ndc ? `NDC ${searchParams.ndc}` : "search");

  return {
    searchLabel,
    seriesLabel: "NDCs",
    filtered: selectedNdcDescriptions.length < ndcDescriptions.length,
  };
}
