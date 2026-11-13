import type { HiddenResultsHint, IncludeKey } from "./searchCriteria";

/*
 * The wording of what a search says about its result: the toasts when it comes back ("No
 * products found", "12 price changes flagged") and the empty table's hint.
 */

/** Singular and plural, e.g. `["product", "products"]`. */
export type Noun = [string, string];

const nounFor = (count: number, [singular, plural]: Noun) => count === 1 ? singular : plural;

export function countMessage(count: number, noun: Noun, verb: string): string {
  if (count === 0) return `No ${noun[1]} ${verb}`;
  return `${count} ${nounFor(count, noun)} ${verb}`;
}

/** The "N found" toast: what the page shows, and how many the refine fields hide. */
export function foundMessage(shown: number, hidden: number, noun: Noun): string {
  const found = countMessage(shown, noun, "found");
  return hidden > 0 ? `${found} (${hidden} hidden)` : found;
}

/** What each Include box adds, worded to follow "Include". */
const INCLUDED: Record<IncludeKey, string> = {
  includeOtc: "OTC drugs",
  includeSamplePackages: "sample packages",
  includeResultsWithoutPrices: "results without prices",
};

/** An Include box's label, under the panel's "Include" legend: "Sample packages". */
export const includeLabel = (key: IncludeKey) => INCLUDED[key].charAt(0).toUpperCase() + INCLUDED[key].slice(1);

/** The empty table's button that ticks the box: "Include sample packages". */
export const includeAction = (key: IncludeKey) => `Include ${INCLUDED[key]}`;

/** What the hidden results are, by the box that shows them: "12 OTC packages". */
const hiddenPhrase = (key: IncludeKey, count: number, noun: Noun) => {
  const nouns = nounFor(count, noun);
  if (key === "includeOtc") return `${count} OTC ${nouns}`;
  if (key === "includeSamplePackages") return `${count} sample ${nouns}`;
  return `${count} ${nouns} without prices`;
};

/**
 * The empty table's hint: what hid the results, and the button that shows them, e.g.
 * "12 OTC packages hidden." / "Include OTC drugs".
 */
export function hiddenResultsMessage(hint: HiddenResultsHint, noun: Noun): { message: string, action: string } {
  if (hint.kind === "include") {
    return { message: `${hiddenPhrase(hint.key, hint.count, noun)} hidden.`, action: includeAction(hint.key) };
  }
  return {
    message: `${hint.count} ${nounFor(hint.count, noun)} hidden by filters.`,
    action: hint.kind === "clear" ? "Clear filters" : "Show all",
  };
}
