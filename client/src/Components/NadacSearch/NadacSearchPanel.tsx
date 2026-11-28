import { useContext, useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { NadacOfferContext } from "../../Context/searchNavigation";
import { useNadacSearchContext } from "../../Context/NadacSearchContext.tsx";
import { useNadacSearch, type NadacResultView } from "../../hooks/useNadacSearch.ts";
import useRenameAfterSearch, { useRestoreTitleAfterClear } from "../../hooks/useRenameAfterSearch.ts";
import { toStoredNadacNdc } from "../../library/ndc.ts";
import { isValidNadacSearch, nadacTabTitle } from "../../library/nadacSearch.ts";
import {
  clearNadacRefine, exclusionCount, nadacActiveFilterCount, NADAC_EXCLUSION_KEYS,
} from "../../library/searchCriteria.ts";
import { includeLabel } from "../../library/searchToasts.ts";
import SearchPanel, { BrandGenericField, ExclusionSelect, type SearchPanelLayout } from "../SearchPanel";

type Props = {
  /** The result as the page shows it: the lists' options and the hidden counts. */
  view: NadacResultView,
  /** Forces the panel's layout (default: by its width). */
  layout?: SearchPanelLayout,
  navigation?: ReactNode,
  standaloneAction?: ReactNode,
};

/**
 * The NADAC search panel. Description and NDC are a draft that Search applies; every other field,
 * Dates included, writes the applied criteria at once. Search is disabled while the draft is the
 * search on screen, so it lights up when there is something to run. The tab is named after its
 * search until the user names it (`useRenameAfterSearch`).
 */
export default function NadacSearchPanel({ view, layout, navigation, standaloneAction }: Props) {
  const { criteria, setCriteria, search, clearSearch, waiting } = useNadacSearchContext();
  const { isLoading, isError, refetch } = useNadacSearch();
  const renameAfterSearch = useRenameAfterSearch();
  const restoreTitleAfterClear = useRestoreTitleAfterClear();

  const offer = useContext(NadacOfferContext);
  // A restored tab shows the search it re-ran. Its NDC is the stored (converted) form.
  const [draft, setDraft] = useState(() => ({
    ndcDescription: criteria.ndcDescription,
    ndc: criteria.ndc,
  }));
  const appliedOffer = useRef<typeof offer>(null);
  const applyHandoff = useEffectEvent((description: string) => {
    setDraft({ ndcDescription: description, ndc: "" });
    if (isValidNadacSearch(description, "")) search({ ndcDescription: description, ndc: "" });
  });
  // Only an explicit handoff replaces the draft and runs a search.
  useEffect(() => {
    if (!offer || appliedOffer.current === offer) return;
    appliedOffer.current = offer;
    applyHandoff(offer.description);
  }, [offer]);
  const { ndcDescription, ndc } = draft;
  const setNdcDescription = (ndcDescription: string) => setDraft(prev => ({ ...prev, ndcDescription }));
  const setNdc = (ndc: string) => setDraft(prev => ({ ...prev, ndc }));

  // The server matches NDCs in NADAC's stored form, so convert what the user typed
  // ("00003089321", "0003-0893-21", "11788-037-60") before searching.
  const searchNdc = toStoredNadacNdc(ndc);

  // Trimmed, as the validity check and the tab title are: " eliquis" would miss descriptions
  // that start with ELIQUIS.
  const terms = { ndcDescription: ndcDescription.trim(), ndc: searchNdc };
  const changed = terms.ndcDescription !== criteria.ndcDescription || terms.ndc !== criteria.ndc;

  // The title the search on screen gave the tab, which the next search or a clear may replace.
  const appliedTitle = nadacTabTitle(criteria.ndcDescription, criteria.ndc);

  const handleSearch = () => {
    // The search on screen failed: applying the same terms changes nothing, so run it again.
    if (!changed) return void refetch();
    renameAfterSearch(nadacTabTitle(ndcDescription, searchNdc), appliedTitle);
    search(terms);
  };

  const handleClearSearch = () => {
    restoreTitleAfterClear(appliedTitle);
    setDraft({ ndcDescription: "", ndc: "" });
    clearSearch();
  };

  // Keep dashes: they say which segment of a 4-4-2, 5-3-2, or 5-4-1 code is short.
  const handleNdcChange = (text: string) => setNdc(text.replace(/[^\d-]/g, ""));

  return (
    <SearchPanel
      label="NADAC search"
      layout={layout}
      navigation={navigation}
      standaloneAction={standaloneAction}
      heading="Find a drug"
      description="Search NADAC prices by drug description or NDC."
      onSearch={handleSearch}
      canSearch={isValidNadacSearch(ndcDescription, searchNdc) && (changed || isError)}
      busy={isLoading || waiting}
      onClearSearch={handleClearSearch}
      canClearSearch={criteria.ndcDescription !== "" || criteria.ndc !== "" || ndcDescription !== "" || ndc !== ""}
      terms={[
        { id: "ndcDescription", label: "Description", value: ndcDescription, onChange: setNdcDescription, flex: 2 },
        { id: "ndc", label: "NDC", value: ndc, onChange: handleNdcChange },
      ]}
      dates={criteria.dates}
      onDatesChange={dates => setCriteria(prev => ({ ...prev, dates }))}
      includes={[{
        key: "includeOtc",
        label: includeLabel("includeOtc"),
        checked: criteria.includeOtc,
        onChange: includeOtc => setCriteria(prev => ({ ...prev, includeOtc })),
        hiddenCount: view.hidden.byInclude.includeOtc ?? 0,
      }]}
      refine={
        <BrandGenericField value={criteria.brandGeneric} onChange={brandGeneric => setCriteria(prev => ({ ...prev, brandGeneric }))} />
      }
      moreFilters={<>
        <ExclusionSelect
          label="Drug"
          noun="drugs"
          options={view.options.excludedNdcDescriptions}
          excluded={criteria.excludedNdcDescriptions}
          onChange={excludedNdcDescriptions => setCriteria(prev => ({ ...prev, excludedNdcDescriptions }))}
        />
        <ExclusionSelect
          label="Pricing unit"
          noun="units"
          options={view.options.excludedUnits}
          excluded={criteria.excludedUnits}
          onChange={excludedUnits => setCriteria(prev => ({ ...prev, excludedUnits }))}
        />
      </>}
      moreFilterCount={exclusionCount(criteria, NADAC_EXCLUSION_KEYS)}
      canClear={nadacActiveFilterCount(criteria) > 0}
      onClear={() => setCriteria(clearNadacRefine)}
    />
  );
}
