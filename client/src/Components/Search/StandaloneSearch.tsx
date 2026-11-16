import { memo } from "react";
import { StandaloneFdaProvider, StandaloneNadacProvider } from "../../Context/StandaloneSearchProviders";
import { NadacOfferContext, type NadacOffer } from "../../Context/searchNavigation";
import { type SearchSource } from "../../library/persist";
import FdaSearch from "../FdaSearch";
import NadacSearch from "../NadacSearch";
import { AddFdaSearchToWorkspace, AddNadacSearchToWorkspace } from "./AddSearchToWorkspace";
import SearchSourceTabs from "./SearchSourceTabs";

export default memo(function StandaloneSearch({ source, offer }: {
  source: SearchSource,
  offer: NadacOffer | null,
}) {
  if (source === "fda") return <StandaloneFdaProvider>
    <FdaSearch searchAction={<AddFdaSearchToWorkspace />} searchNavigation={<SearchSourceTabs source={source} />} pinnedSection={null} />
  </StandaloneFdaProvider>;
  return <StandaloneNadacProvider>
    <NadacOfferContext value={offer}>
      <NadacSearch searchAction={<AddNadacSearchToWorkspace />} searchNavigation={<SearchSourceTabs source={source} />} pinnedSection={null} />
    </NadacOfferContext>
  </StandaloneNadacProvider>;
});
