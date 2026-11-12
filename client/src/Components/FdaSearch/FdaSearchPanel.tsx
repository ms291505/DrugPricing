import { useState } from "react";
import TextField from "@mui/material/TextField";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import useFdaSearch, { type FdaResultView } from "../../hooks/useFdaSearch";
import useMobile from "../../hooks/useMobile";
import useRenameAfterSearch from "../../hooks/useRenameAfterSearch";
import {
  clearFdaRefine, exclusionCount, FDA_EXCLUSION_KEYS, FDA_INCLUDE_KEYS, fdaActiveFilterCount, fdaSearchLabel, isValidFdaSearch,
  type FdaExclusionKey,
} from "../../library/searchCriteria";
import SearchPanel, { DatesField, ExclusionSelect, IncludeCheckbox } from "../SearchPanel";

const INCLUDE_OPTIONS = {
  includeOtc: "OTC drugs",
  includeSamplePackages: "Sample packages",
  includeResultsWithoutPrices: "Results without prices",
};

/** The "More filters" lists, in order. */
const LISTS: { key: FdaExclusionKey, label: string, noun: string }[] = [
  { key: "excludedProductNdcs", label: "Product NDC", noun: "products" },
  { key: "excludedDosageForms", label: "Dosage form", noun: "dosage forms" },
  { key: "excludedRoutes", label: "Route", noun: "routes" },
  { key: "excludedLabelers", label: "Labeler", noun: "labelers" },
  { key: "excludedUnits", label: "Pricing unit", noun: "units" },
];

type Props = {
  /** The result as the page shows it: the lists' options and the hidden counts. */
  view: FdaResultView,
};

/**
 * The FDA search panel. Brand and generic names are drafts that Search applies; every other field, Dates
 * included, writes the applied criteria at once. Search is disabled while the draft is the search
 * on screen, so it lights up when there is something to run. The tab is named after its first
 * search.
 */
export default function FdaSearchPanel({ view }: Props) {
  const { criteria, setCriteria, search, waiting } = useFdaSearchContext();
  const { isLoading, isError, refetch } = useFdaSearch();
  const renameAfterSearch = useRenameAfterSearch();
  const isMobile = useMobile();

  // A restored tab shows the search it re-ran.
  const [proprietaryName, setProprietaryName] = useState(criteria.proprietaryName);

  const [nonProprietaryName, setNonProprietaryName] = useState(criteria.nonProprietaryName);
  const terms = { proprietaryName: proprietaryName.trim(), nonProprietaryName: nonProprietaryName.trim() };
  const changed = terms.proprietaryName !== criteria.proprietaryName || terms.nonProprietaryName !== criteria.nonProprietaryName;

  const handleSearch = () => {
    // The search on screen failed: applying the same name changes nothing, so run it again.
    if (!changed) return void refetch();
    renameAfterSearch(fdaSearchLabel(terms).toUpperCase());
    search(terms);
  };

  return (
    <SearchPanel
      label="FDA search"
      compact
      heading="Find a drug"
      description="Search the FDA directory to explore products, packages, and NADAC prices."
      termsHint="Enter either name. Use both to narrow your search."
      refineLabel="Include:"
      onSearch={handleSearch}
      canSearch={isValidFdaSearch(proprietaryName, nonProprietaryName) && (changed || isError)}
      busy={isLoading || waiting}
      terms={<>
        <TextField size={isMobile ? "small" : "medium"} id="proprietaryName" name="proprietaryName" label="Brand name" placeholder="e.g. Lipitor"
          value={proprietaryName} onChange={(e) => setProprietaryName(e.target.value)} sx={{ flex: 1, minWidth: 0 }} />
        <TextField size={isMobile ? "small" : "medium"} id="nonProprietaryName" name="nonProprietaryName"
          label="Generic name" placeholder="e.g. atorvastatin"
          value={nonProprietaryName} onChange={(e) => setNonProprietaryName(e.target.value)} sx={{ flex: 1, minWidth: 0 }} />
      </>}
      dates={<DatesField label="Price dates" value={criteria.dates} onChange={dates => setCriteria(prev => ({ ...prev, dates }))} />}
      refine={FDA_INCLUDE_KEYS.map(key => (
        <IncludeCheckbox
          key={key}
          label={INCLUDE_OPTIONS[key]}
          checked={criteria[key]}
          onChange={checked => setCriteria(prev => ({ ...prev, [key]: checked }))}
          hiddenCount={view.hidden.byInclude[key] ?? 0}
        />
      ))}
      moreFilters={LISTS.map(({ key, label, noun }) => (
        <ExclusionSelect
          key={key}
          label={label}
          noun={noun}
          options={view.options[key]}
          excluded={criteria[key]}
          onChange={excluded => setCriteria(prev => ({ ...prev, [key]: excluded }))}
        />
      ))}
      moreFilterCount={exclusionCount(criteria, FDA_EXCLUSION_KEYS)}
      canClear={fdaActiveFilterCount(criteria) > 0}
      onClear={() => setCriteria(clearFdaRefine)}
    />
  );
}
