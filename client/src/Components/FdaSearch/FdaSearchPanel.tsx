import type { ReactNode } from "react";
import { useState } from "react";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import useFdaSearch, { type FdaResultView } from "../../hooks/useFdaSearch";
import useRenameAfterSearch, { useRestoreTitleAfterClear } from "../../hooks/useRenameAfterSearch";
import {
  clearFdaRefine, exclusionCount, FDA_INCLUDE_KEYS, FDA_LIST_KEYS, fdaActiveFilterCount, fdaTabTitle, isValidFdaSearch,
  type FdaCriteria, type FdaListKey, type FdaTerms,
} from "../../library/searchCriteria";
import type { LabelerChoice } from "../../library/labelers";
import { activityCategoryLabel, isActivityCategory } from "../../library/priceActivity";
import { includeLabel } from "../../library/searchToasts";
import SearchPanel, { ExclusionSelect, type SearchPanelLayout } from "../SearchPanel";

type ListField = { key: FdaListKey, label: string, noun: string, optionLabel?: (value: string) => string };

/** The "More filters" groups and their from-results lists, in order. */
const LIST_GROUPS: { label: string, lists: ListField[] }[] = [
  {
    label: "Drug details",
    lists: [
      { key: "excludedProductNdcs", label: "Product NDC", noun: "products" },
      { key: "excludedDosageForms", label: "Dosage form", noun: "dosage forms" },
      { key: "excludedStrengths", label: "Strength", noun: "strengths" },
      { key: "excludedRoutes", label: "Route", noun: "routes" },
      // Not "Labeler": that's the search field's name, and two controls shouldn't share one.
      { key: "excludedLabelers", label: "Labeler in results", noun: "labelers" },
    ],
  },
  {
    label: "Pricing",
    lists: [
      { key: "excludedActivities", label: "Price activity", noun: "activity types", optionLabel: activityCategoryLabel },
      { key: "excludedUnits", label: "Pricing unit", noun: "units" },
    ],
  },
];

/** The criteria with a list's exclusions set. Price activity's values are its categories. */
const withExcluded = (criteria: FdaCriteria, key: FdaListKey, excluded: string[]): FdaCriteria =>
  key === "excludedActivities"
    ? { ...criteria, excludedActivities: excluded.filter(isActivityCategory) }
    : { ...criteria, [key]: excluded };

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
 * and Labeler picks included, writes the applied criteria at once. Search is disabled while the draft is the search
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
  const terms: FdaTerms = { proprietaryName: proprietaryName.trim(), nonProprietaryName: nonProprietaryName.trim() };
  const changed = terms.proprietaryName !== criteria.proprietaryName || terms.nonProprietaryName !== criteria.nonProprietaryName;

  // The title the search on screen gave the tab, which the next search or a clear may replace.
  const applied = criteria.proprietaryName !== "" || criteria.nonProprietaryName !== "";
  const appliedTitle = applied ? fdaTabTitle(criteria) : null;

  const handleSearch = () => {
    // The search on screen failed: applying the same name changes nothing, so run it again.
    if (!changed) return void refetch();
    renameAfterSearch(fdaTabTitle({ ...terms, labelers: criteria.labelers }), appliedTitle);
    search(terms);
  };

  // Picks apply at once, like Dates; a tab named after its search follows them.
  const handleLabelersChange = (labelers: LabelerChoice[]) => {
    if (applied) renameAfterSearch(fdaTabTitle({ ...criteria, labelers }), appliedTitle);
    setCriteria(prev => ({ ...prev, labelers }));
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
      description="Search the FDA directory by brand or generic name, narrowed to labelers if you like, to see products, packages and NADAC prices."
      onSearch={handleSearch}
      canSearch={isValidFdaSearch(proprietaryName, nonProprietaryName) && (changed || isError)}
      busy={isLoading || waiting}
      onClearSearch={handleClearSearch}
      canClearSearch={applied || proprietaryName !== "" || nonProprietaryName !== "" || criteria.labelers.length > 0}
      terms={[
        { id: "proprietaryName", label: "Brand name", placeholder: "e.g. Eliquis", value: proprietaryName, onChange: setProprietaryName },
        { id: "nonProprietaryName", label: "Generic name", placeholder: "e.g. apixaban", value: nonProprietaryName, onChange: setNonProprietaryName },
        {
          kind: "labelers", id: "labelers", label: "Labeler", placeholder: "e.g. Pfizer",
          value: criteria.labelers, onChange: handleLabelersChange,
          includeOtc: criteria.includeOtc, includeWithoutPrices: criteria.includeResultsWithoutPrices,
        },
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
      moreFilters={LIST_GROUPS.map(group => ({
        label: group.label,
        fields: group.lists.map(({ key, label, noun, optionLabel }) => (
          <ExclusionSelect
            key={key}
            label={label}
            noun={noun}
            options={view.options[key]}
            optionLabel={optionLabel}
            excluded={criteria[key]}
            onChange={excluded => setCriteria(prev => withExcluded(prev, key, excluded))}
          />
        )),
      }))}
      moreFilterCount={exclusionCount(criteria, FDA_LIST_KEYS)}
      canClear={fdaActiveFilterCount(criteria) > 0}
      onClear={() => setCriteria(clearFdaRefine)}
    />
  );
}
