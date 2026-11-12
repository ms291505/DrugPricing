import { useState } from "react";
import TextField from "@mui/material/TextField";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import useFdaSearch, { type FdaResultView } from "../../hooks/useFdaSearch";
import useMobile from "../../hooks/useMobile";
import useRenameAfterSearch from "../../hooks/useRenameAfterSearch";
import type { ChartDates } from "../../library/dates";
import {
  clearFdaRefine, exclusionCount, FDA_EXCLUSION_KEYS, FDA_INCLUDE_KEYS, fdaActiveFilterCount, isValidFdaSearch,
  type FdaExclusionKey,
} from "../../library/searchCriteria";
import { INCLUDE_LABELS } from "../../library/searchToasts";
import SearchPanel, { DatesField, ExclusionSelect, IncludeCheckbox } from "../SearchPanel";

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
 * The FDA search panel. Brand name and Dates are a draft that Search applies; the other fields
 * write the applied criteria at once. The tab is named after its first search.
 */
export default function FdaSearchPanel({ view }: Props) {
  const { criteria, setCriteria, search, waiting } = useFdaSearchContext();
  const { isLoading } = useFdaSearch();
  const renameAfterSearch = useRenameAfterSearch();
  const isMobile = useMobile();

  // A restored tab shows the search it re-ran.
  const [proprietaryName, setProprietaryName] = useState(criteria.proprietaryName);
  const [dates, setDates] = useState<ChartDates>(criteria.dates);

  const handleSearch = () => {
    const name = proprietaryName.trim();
    renameAfterSearch(name.toUpperCase());
    search({ proprietaryName: name, dates });
  };

  return (
    <SearchPanel
      label="FDA search"
      onSearch={handleSearch}
      canSearch={isValidFdaSearch(proprietaryName)}
      busy={isLoading || waiting}
      terms={
        <TextField size={isMobile ? "small" : "medium"} id="proprietaryName" name="proprietaryName" label="Brand name"
          value={proprietaryName} onChange={(e) => setProprietaryName(e.target.value)} sx={{ flex: 1, minWidth: 0 }} />
      }
      dates={<DatesField value={dates} onChange={setDates} />}
      refine={FDA_INCLUDE_KEYS.map(key => (
        <IncludeCheckbox
          key={key}
          label={INCLUDE_LABELS[key]}
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
