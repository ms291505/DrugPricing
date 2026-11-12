import { useState, type ChangeEvent } from "react";
import TextField from "@mui/material/TextField";
import { useNadacSearchContext } from "../../Context/NadacSearchContext.tsx";
import { useNadacSearch, type NadacResultView } from "../../hooks/useNadacSearch.ts";
import useMobile from "../../hooks/useMobile.ts";
import useRenameAfterSearch from "../../hooks/useRenameAfterSearch.ts";
import { toStoredNadacNdc } from "../../library/ndc.ts";
import { isValidNadacSearch, nadacTabTitle } from "../../library/nadacSearch.ts";
import {
  clearNadacRefine, exclusionCount, nadacActiveFilterCount, NADAC_EXCLUSION_KEYS, type BrandGeneric,
} from "../../library/searchCriteria.ts";
import { INCLUDE_LABELS } from "../../library/searchToasts.ts";
import SearchPanel, { ChoiceField, DatesField, ExclusionSelect, IncludeCheckbox } from "../SearchPanel";

const BRAND_GENERIC_OPTIONS: { value: BrandGeneric, label: string }[] = [
  { value: "all", label: "All" },
  { value: "brand", label: "Brand" },
  { value: "generic", label: "Generic" },
];

type Props = {
  /** The result as the page shows it: the lists' options and the hidden counts. */
  view: NadacResultView,
};

/**
 * The NADAC search panel. Description and NDC are a draft that Search applies; every other field,
 * Dates included, writes the applied criteria at once. Search is disabled while the draft is the
 * search on screen, so it lights up when there is something to run. The tab is named after its
 * first search.
 */
export default function NadacSearchPanel({ view }: Props) {
  const { criteria, setCriteria, search, waiting } = useNadacSearchContext();
  const { isLoading, isError, refetch } = useNadacSearch();
  const renameAfterSearch = useRenameAfterSearch();
  const isMobile = useMobile();

  // A restored tab shows the search it re-ran. Its NDC is the stored (converted) form.
  const [ndcDescription, setNdcDescription] = useState(criteria.ndcDescription);
  const [ndc, setNdc] = useState(criteria.ndc);

  // The server matches NDCs in NADAC's stored form, so convert what the user typed
  // ("00003089321", "0003-0893-21", "11788-037-60") before searching.
  const searchNdc = toStoredNadacNdc(ndc);

  // Trimmed, as the validity check and the tab title are: " eliquis" would miss descriptions
  // that start with ELIQUIS.
  const terms = { ndcDescription: ndcDescription.trim(), ndc: searchNdc };
  const changed = terms.ndcDescription !== criteria.ndcDescription || terms.ndc !== criteria.ndc;

  const handleSearch = () => {
    // The search on screen failed: applying the same terms changes nothing, so run it again.
    if (!changed) return void refetch();
    renameAfterSearch(nadacTabTitle(ndcDescription, searchNdc));
    search(terms);
  };

  const handleNdcChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Keep dashes: they say which segment of a 4-4-2, 5-3-2, or 5-4-1 code is short.
    setNdc(e.target.value.replace(/[^\d-]/g, ""));
  };

  const textSize = isMobile ? "small" : "medium";

  return (
    <SearchPanel
      label="NADAC search"
      onSearch={handleSearch}
      canSearch={isValidNadacSearch(ndcDescription, searchNdc) && (changed || isError)}
      busy={isLoading || waiting}
      terms={<>
        <TextField size={textSize} id="ndcDescription" name="ndcDescription" label="Description"
          value={ndcDescription} onChange={(e) => setNdcDescription(e.target.value)} sx={{ flex: 2, minWidth: 0 }} />
        <TextField size={textSize} id="ndc" name="ndc" label="NDC"
          value={ndc} onChange={handleNdcChange} sx={{ flex: 1, minWidth: 0 }} />
      </>}
      dates={<DatesField value={criteria.dates} onChange={dates => setCriteria(prev => ({ ...prev, dates }))} />}
      refine={<>
        <IncludeCheckbox
          label={INCLUDE_LABELS.includeOtc}
          checked={criteria.includeOtc}
          onChange={includeOtc => setCriteria(prev => ({ ...prev, includeOtc }))}
          hiddenCount={view.hidden.byInclude.includeOtc ?? 0}
        />
        <ChoiceField
          label="Brand / generic"
          value={criteria.brandGeneric}
          options={BRAND_GENERIC_OPTIONS}
          onChange={brandGeneric => setCriteria(prev => ({ ...prev, brandGeneric }))}
        />
      </>}
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
