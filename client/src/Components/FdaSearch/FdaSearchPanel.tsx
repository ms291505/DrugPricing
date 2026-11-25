import type { ReactNode } from "react";
import { useState } from "react";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import useFdaSearch, { type FdaResultView } from "../../hooks/useFdaSearch";
import useRenameAfterSearch, { useRestoreTitleAfterClear } from "../../hooks/useRenameAfterSearch";
import {
  clearFdaRefine, exclusionCount, FDA_EXCLUSION_KEYS, FDA_INCLUDE_KEYS, fdaActiveFilterCount, fdaTabTitle, isValidFdaSearch,
  type FdaExclusionKey,
} from "../../library/searchCriteria";
import { includeLabel } from "../../library/searchToasts";
import SearchPanel, { ExclusionSelect, type SearchPanelLayout } from "../SearchPanel";

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
  /** Forces the panel's layout (default: by its width). */
  layout?: SearchPanelLayout,
  navigation?: ReactNode,
  standaloneAction?: ReactNode,
};

/**
 * The FDA search panel. Brand and generic names are drafts that Search applies; every other field, Dates
 * included, writes the applied criteria at once. Search is disabled while the draft is the search
 * on screen, so it lights up when there is something to run. The tab is named after its search
 * until the user names it (`useRenameAfterSearch`).
 */
export default function FdaSearchPanel({ view, layout, navigation, standaloneAction }: Props) {
  const { criteria, setCriteria, search, clearSearch, waiting } = useFdaSearchContext();
  const { isLoading, isError, refetch } = useFdaSearch();
  const renameAfterSearch = useRenameAfterSearch();
  const restoreTitleAfterClear = useRestoreTitleAfterClear();

  // A restored tab shows the search it re-ran.
  const [proprietaryName, setProprietaryName] = useState(criteria.proprietaryName);

  const [nonProprietaryName, setNonProprietaryName] = useState(criteria.nonProprietaryName);
  const terms = { proprietaryName: proprietaryName.trim(), nonProprietaryName: nonProprietaryName.trim() };
  const changed = terms.proprietaryName !== criteria.proprietaryName || terms.nonProprietaryName !== criteria.nonProprietaryName;

  // The title the search on screen gave the tab, which the next search or a clear may replace.
  const applied = criteria.proprietaryName !== "" || criteria.nonProprietaryName !== "";
  const appliedTitle = applied ? fdaTabTitle(criteria) : null;

  const handleSearch = () => {
    // The search on screen failed: applying the same name changes nothing, so run it again.
    if (!changed) return void refetch();
    renameAfterSearch(fdaTabTitle(terms), appliedTitle);
    search(terms);
  };

  const handleClearSearch = () => {
    restoreTitleAfterClear(appliedTitle);
    setProprietaryName("");
    setNonProprietaryName("");
    clearSearch();
  };

  return (
    <SearchPanel
      label="FDA search"
      layout={layout}
      navigation={navigation}
      standaloneAction={standaloneAction}
      heading="Find a drug"
      description="Search the FDA directory by brand or generic name to see products, packages and NADAC prices."
      onSearch={handleSearch}
      canSearch={isValidFdaSearch(proprietaryName, nonProprietaryName) && (changed || isError)}
      busy={isLoading || waiting}
      onClearSearch={handleClearSearch}
      canClearSearch={applied || proprietaryName !== "" || nonProprietaryName !== ""}
      terms={[
        { id: "proprietaryName", label: "Brand name", placeholder: "e.g. Eliquis", value: proprietaryName, onChange: setProprietaryName },
        { id: "nonProprietaryName", label: "Generic name", placeholder: "e.g. apixaban", value: nonProprietaryName, onChange: setNonProprietaryName },
      ]}
      dates={criteria.dates}
      onDatesChange={dates => setCriteria(prev => ({ ...prev, dates }))}
      includes={FDA_INCLUDE_KEYS.map(key => ({
        key,
        label: includeLabel(key),
        checked: criteria[key],
        onChange: checked => setCriteria(prev => ({ ...prev, [key]: checked })),
        hiddenCount: view.hidden.byInclude[key] ?? 0,
      }))}
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
