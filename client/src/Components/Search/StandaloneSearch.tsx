import { memo } from "react";
import { StandaloneFdaProvider, StandaloneNadacProvider } from "../../Context/StandaloneSearchProviders";
import { NadacOfferContext, type NadacOffer } from "../../Context/searchNavigation";
import { type SearchSource } from "../../library/persist";
import FdaSearch from "../FdaSearch";
import NadacSearch from "../NadacSearch";
import SearchSourceSelect from "./SearchSourceSelect";

export default memo(function StandaloneSearch({ source, offer }: {
  source: SearchSource,
  offer: NadacOffer | null,
}) {
  if (source === "fda") return <StandaloneFdaProvider>
    <FdaSearch searchNavigation={<SearchSourceSelect source={source} />} pinnedSection={null} />
  </StandaloneFdaProvider>;
  return <StandaloneNadacProvider>
    <NadacOfferContext value={offer}>
      <NadacSearch searchNavigation={<SearchSourceSelect source={source} />} pinnedSection={null} />
    </NadacOfferContext>
  </StandaloneNadacProvider>;
});
