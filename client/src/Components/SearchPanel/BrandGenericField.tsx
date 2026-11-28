import type { BrandGeneric } from "../../library/searchCriteria";
import ChoiceField from "./ChoiceField";

const OPTIONS: { value: BrandGeneric, label: string }[] = [
  { value: "all", label: "All" },
  { value: "brand", label: "Brand" },
  { value: "generic", label: "Generic" },
];

/**
 * Brand / generic, by NADAC's class of each NDC's latest price (`matchesBrandGeneric`): the same
 * field on both search pages, in the panel's `refine` slot. It applies at once.
 */
export default function BrandGenericField({ value, onChange }: { value: BrandGeneric, onChange: (value: BrandGeneric) => void }) {
  return <ChoiceField stacked label="Brand / generic" value={value} options={OPTIONS} onChange={onChange} />;
}
