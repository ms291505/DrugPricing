import { MIN_NDC_DESCRIPTION_LENGTH } from "./constants";
import { inWindow, type DateWindow } from "./dates";
import type { FdaTerms } from "./searchCriteria";
import type { FdaProductSearchResult } from "./types";

/** NADAC matches one contiguous description: prefer a valid brand, then a valid generic name.
 * If neither is long enough, carry one draft term for the user to extend without running it.
 */
export function nadacHandoffTerm(terms: FdaTerms): string {
  const brand = terms.proprietaryName.trim();
  const generic = terms.nonProprietaryName.trim();
  return [brand, generic].find(term => term.length >= MIN_NDC_DESCRIPTION_LENGTH) ?? (brand || generic);
}

/** Use the loaded result before exclusions, within the page's already-snapped date window. */
export function fdaHasPricesInWindow(result: FdaProductSearchResult, dates: DateWindow): boolean {
  return result.products.some(product => product.fdaPackageDetails.some(pkg =>
    pkg.nadacPrices.some(price => inWindow(price.asOfDate.getTime(), dates))));
}
