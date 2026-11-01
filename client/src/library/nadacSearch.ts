import { MIN_NDC_DESCRIPTION_LENGTH, MIN_NDC_LENGTH } from "./constants";

/**
 * Whether a NADAC search has enough to go on: a description or an NDC of the minimum length.
 * Spaces around the description don't count toward it.
 *
 * @param storedNdc - the NDC in NADAC's stored form (`toStoredNadacNdc`)
 */
export const isValidNadacSearch = (description: string, storedNdc: string) =>
  description.trim().length >= MIN_NDC_DESCRIPTION_LENGTH || storedNdc.length >= MIN_NDC_LENGTH;

/**
 * The title a NADAC tab takes from its first search: the description when it is long enough to
 * search on (it wins when both fields are filled), otherwise the NDC in its stored form
 * ("NDC 3089321"). Null when the search isn't valid.
 *
 * @param storedNdc - the NDC in NADAC's stored form (`toStoredNadacNdc`)
 */
export function nadacTabTitle(description: string, storedNdc: string): string | null {
  const trimmed = description.trim();
  if (trimmed.length >= MIN_NDC_DESCRIPTION_LENGTH) return trimmed.toUpperCase();
  if (storedNdc.length >= MIN_NDC_LENGTH) return `NDC ${storedNdc}`;
  return null;
}
