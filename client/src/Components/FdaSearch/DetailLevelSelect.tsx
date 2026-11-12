import useFdaSearch from "../../hooks/useFdaSearch";
import { useFdaSearchContext } from "../../Context/FdaSearchContext";
import type { FdaResultDetailLevel } from "../../library/types";
import { ChoiceField } from "../SearchPanel";

const LEVELS: { value: FdaResultDetailLevel, label: string }[] = [
  { value: "product", label: "Products" },
  { value: "package", label: "Packages" },
];

/** The FDA results' detail level: a row per product or per package. */
export default function DetailLevelSelect() {
  const { isLoading, data } = useFdaSearch();
  const { fdaResultDetailLevel, setFdaResultDetailLevel } = useFdaSearchContext();
  return (
    <ChoiceField
      label="Show"
      value={fdaResultDetailLevel}
      options={LEVELS}
      onChange={setFdaResultDetailLevel}
      disabled={isLoading || !data || data.products.length === 0}
    />
  );
}
