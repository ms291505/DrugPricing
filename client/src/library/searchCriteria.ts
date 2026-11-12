import { DEFAULT_NADAC_SEARCH_MONTHS, MIN_NDC_DESCRIPTION_LENGTH } from "./constants";
import { clipToWindow, windowEndingAt, type ChartDates, type DateWindow } from "./dates";
import { isValidNadacSearch } from "./nadacSearch";
import {
  isFdaProductOtc,
  type FdaPackageDetail, type FdaProductDetail, type FdaProductSearchResult, type NadacClassification, type NadacPrice,
} from "./types";

/*
 * One criteria object per search type holds every field of its search panel (plan:
 * plans/search-filters.md). Each field is in one of two groups, and the group alone decides
 * whether changing it fetches:
 *
 * - Load fields (the text terms and Dates) go to the server, and wait for the Search button.
 * - Refine fields narrow what loaded, in the client, and apply at once.
 *
 * A tab holds the applied criteria and the request it `loaded`. `loadRequest` turns criteria into
 * a request, `nextLoad` decides whether a new request needs a fetch, and `refine` is what every
 * consumer of the result reads.
 *
 * "From results" fields (the exclusion lists) store what the user *excluded*, so values that are
 * new since the filter was set show, and nothing needs resetting when results arrive.
 */

/** NADAC's brand/generic choice; `classificationForRateSetting` decides which an NDC is. */
export type BrandGeneric = "all" | "brand" | "generic";

export type NadacCriteria = {
  // Load
  ndcDescription: string,
  /** In NADAC's stored form (`toStoredNadacNdc`). */
  ndc: string,
  dates: ChartDates,
  // Refine
  includeOtc: boolean,
  brandGeneric: BrandGeneric,
  excludedNdcDescriptions: string[],
  excludedUnits: string[],
};

export type FdaCriteria = {
  // Load
  proprietaryName: string,
  dates: ChartDates,
  // Refine
  includeOtc: boolean,
  includeSamplePackages: boolean,
  includeResultsWithoutPrices: boolean,
  excludedProductNdcs: string[],
  excludedDosageForms: string[],
  excludedRoutes: string[],
  excludedLabelers: string[],
  excludedUnits: string[],
};

/** The fields the Search button applies. */
export type NadacLoadFields = Pick<NadacCriteria, "ndcDescription" | "ndc" | "dates">;
export type FdaLoadFields = Pick<FdaCriteria, "proprietaryName" | "dates">;

/** An exclusion-list field: a multi-select whose options come from the loaded result. */
export type NadacExclusionKey = "excludedNdcDescriptions" | "excludedUnits";
export type FdaExclusionKey =
  "excludedProductNdcs" | "excludedDosageForms" | "excludedRoutes" | "excludedLabelers" | "excludedUnits";

/** The dates a new search covers: the last `DEFAULT_NADAC_SEARCH_MONTHS`, on both pages. */
export const DEFAULT_SEARCH_DATES: ChartDates = { kind: "recent", months: DEFAULT_NADAC_SEARCH_MONTHS };

export const createNadacCriteria = (): NadacCriteria => ({
  ndcDescription: "",
  ndc: "",
  dates: DEFAULT_SEARCH_DATES,
  includeOtc: false,
  brandGeneric: "all",
  excludedNdcDescriptions: [],
  excludedUnits: [],
});

export const createFdaCriteria = (): FdaCriteria => ({
  proprietaryName: "",
  dates: DEFAULT_SEARCH_DATES,
  includeOtc: false,
  includeSamplePackages: false,
  includeResultsWithoutPrices: false,
  excludedProductNdcs: [],
  excludedDosageForms: [],
  excludedRoutes: [],
  excludedLabelers: [],
  excludedUnits: [],
});

const NADAC_EXCLUSION_KEYS: readonly NadacExclusionKey[] = ["excludedNdcDescriptions", "excludedUnits"];
const FDA_EXCLUSION_KEYS: readonly FdaExclusionKey[] =
  ["excludedProductNdcs", "excludedDosageForms", "excludedRoutes", "excludedLabelers", "excludedUnits"];

// --- Load ---------------------------------------------------------------------------------

/** What a search asks the server for. Its dates are fixed (presets resolved); a null end is open. */
export type NadacLoad = { ndcDescription: string, ndc: string, dates: DateWindow };
export type FdaLoad = { proprietaryName: string, dates: DateWindow };

/**
 * The dates a setting means for a search: presets count back from the last loaded as-of date
 * (`app-init`'s, or today when it failed).
 */
export function resolveSearchDates(dates: ChartDates, lastAsOfDate: number): DateWindow {
  return dates.kind === "recent" ? windowEndingAt(lastAsOfDate, dates.months) : dates.dateWindow;
}

/** The NADAC request the criteria ask for, or null when its terms aren't enough to search on. */
export function nadacLoadRequest(criteria: NadacCriteria, lastAsOfDate: number): NadacLoad | null {
  if (!isValidNadacSearch(criteria.ndcDescription, criteria.ndc)) return null;
  return {
    ndcDescription: criteria.ndcDescription,
    ndc: criteria.ndc,
    dates: resolveSearchDates(criteria.dates, lastAsOfDate),
  };
}

export const isValidFdaSearch = (proprietaryName: string) =>
  proprietaryName.trim().length >= MIN_NDC_DESCRIPTION_LENGTH;

/** The FDA request the criteria ask for, or null when its terms aren't enough to search on. */
export function fdaLoadRequest(criteria: FdaCriteria, lastAsOfDate: number): FdaLoad | null {
  if (!isValidFdaSearch(criteria.proprietaryName)) return null;
  return {
    proprietaryName: criteria.proprietaryName,
    dates: resolveSearchDates(criteria.dates, lastAsOfDate),
  };
}

/** Whether `outer` holds every date of `inner`. An open end holds everything on its side. */
export function windowCovers(outer: DateWindow, inner: DateWindow): boolean {
  const startCovered = outer.start === null || (inner.start !== null && inner.start >= outer.start);
  const endCovered = outer.end === null || (inner.end !== null && inner.end <= outer.end);
  return startCovered && endCovered;
}

function sameTerms<T extends { dates: DateWindow }>(a: T, b: T): boolean {
  const { dates: _a, ...termsA } = a;
  const { dates: _b, ...termsB } = b;
  return JSON.stringify(termsA) === JSON.stringify(termsB);
}

/**
 * The "narrowing doesn't fetch" rule: keeps what is loaded when the terms are the same and its
 * dates cover the requested ones, so the client clips to the new dates instead of fetching.
 * Anything else (new terms, or dates reaching outside what is loaded) is a new load.
 */
export function nextLoad<T extends { dates: DateWindow }>(loaded: T | null, requested: T | null): T | null {
  if (loaded === null || requested === null) return requested;
  return sameTerms(loaded, requested) && windowCovers(loaded.dates, requested.dates) ? loaded : requested;
}

/**
 * The applied criteria after Search: the load fields from the form, and the refine fields kept.
 * A search for new terms clears the exclusion lists, which name values from the old result; the
 * fixed refine fields (the Include checkboxes, brand/generic) carry over.
 */
export function applyNadacSearch(applied: NadacCriteria, fields: NadacLoadFields): NadacCriteria {
  const next = { ...applied, ...fields };
  if (fields.ndcDescription === applied.ndcDescription && fields.ndc === applied.ndc) return next;
  return { ...next, ...clearedExclusions(NADAC_EXCLUSION_KEYS) };
}

export function applyFdaSearch(applied: FdaCriteria, fields: FdaLoadFields): FdaCriteria {
  const next = { ...applied, ...fields };
  if (fields.proprietaryName === applied.proprietaryName) return next;
  return { ...next, ...clearedExclusions(FDA_EXCLUSION_KEYS) };
}

const clearedExclusions = <K extends string>(keys: readonly K[]) =>
  Object.fromEntries(keys.map(key => [key, []])) as unknown as Record<K, string[]>;

// --- Refine -------------------------------------------------------------------------------

const BRAND_CLASSIFICATIONS: ReadonlySet<NadacClassification> = new Set(["B", "B_ANDA", "B_BIO"]);
const isBrand = (price: NadacPrice) => BRAND_CLASSIFICATIONS.has(price.classificationForRateSetting);

/** Each NDC's latest price: what its OTC flag and brand/generic class are read from. */
function latestByNdc(prices: NadacPrice[]): Map<string, NadacPrice> {
  const latest = new Map<string, NadacPrice>();
  for (const price of prices) {
    const current = latest.get(price.ndc);
    if (!current || price.asOfDate.getTime() > current.asOfDate.getTime()) latest.set(price.ndc, price);
  }
  return latest;
}

/**
 * The window moved out to the as-of dates of these prices, as the NADAC server snaps a search's
 * dates: the start down to the last as-of date at or before it (the price in effect on that day),
 * the end up to the first at or after it. A date with no as-of date on its side stays.
 */
export function snapToAsOfDates(dates: DateWindow, prices: NadacPrice[]): DateWindow {
  let start: number | null = null;
  let end: number | null = null;
  for (const price of prices) {
    const time = price.asOfDate.getTime();
    if (dates.start !== null && time <= dates.start && (start === null || time > start)) start = time;
    if (dates.end !== null && time >= dates.end && (end === null || time < end)) end = time;
  }
  return { start: start ?? dates.start, end: end ?? dates.end };
}

/**
 * A NADAC result clipped to a search's dates, the way the server would have answered that search,
 * so a narrowing that didn't fetch shows the same weeks as one that did.
 */
export const clipNadacToSearchDates = (prices: NadacPrice[], dates: DateWindow): NadacPrice[] =>
  clipToWindow(prices, snapToAsOfDates(dates, prices));

/**
 * A NADAC result as the page shows it: clipped to the search's dates (`clipNadacToSearchDates`),
 * then narrowed by the refine
 * fields. OTC and brand/generic go by each NDC's latest price in those dates, so an NDC is shown
 * or hidden whole; the Drug and unit lists match each price.
 *
 * @param dates - the dates the applied criteria asked for (the requested load's)
 */
export function refineNadac(prices: NadacPrice[], criteria: NadacCriteria, dates: DateWindow): NadacPrice[] {
  const clipped = clipNadacToSearchDates(prices, dates);
  const excludedDescriptions = new Set(criteria.excludedNdcDescriptions);
  const excludedUnits = new Set(criteria.excludedUnits);
  const latest = latestByNdc(clipped);
  const hiddenNdcs = new Set([...latest.values()]
    .filter(price =>
      (!criteria.includeOtc && price.isOtc)
      || (criteria.brandGeneric === "brand" && !isBrand(price))
      || (criteria.brandGeneric === "generic" && price.classificationForRateSetting !== "G"))
    .map(price => price.ndc));
  if (hiddenNdcs.size === 0 && excludedDescriptions.size === 0 && excludedUnits.size === 0) return clipped;
  return clipped.filter(price =>
    !hiddenNdcs.has(price.ndc)
    && !excludedDescriptions.has(price.ndcDescription)
    && !excludedUnits.has(price.pricingUnit));
}

const uniqueSorted = (values: string[]) => [...new Set(values)].sort();
const ndcCount = (prices: NadacPrice[]) => new Set(prices.map(price => price.ndc)).size;

/**
 * The options of NADAC's from-results lists: the values of the result the page could show, after
 * the clip and the fixed refine fields (Include OTC, brand/generic) but before any exclusion. So
 * excluding a value doesn't remove it from its list, and a value the page can't show (an OTC-only
 * drug while OTC is hidden, a drug only outside narrowed dates) isn't listed.
 */
export function nadacFilterOptions(prices: NadacPrice[], criteria: NadacCriteria, dates: DateWindow): Record<"ndcDescriptions" | "units", string[]> {
  const shown = refineNadac(prices, { ...criteria, ...clearedExclusions(NADAC_EXCLUSION_KEYS) }, dates);
  return {
    ndcDescriptions: uniqueSorted(shown.map(price => price.ndcDescription)),
    units: uniqueSorted(shown.map(price => price.pricingUnit)),
  };
}

/**
 * How many NDCs ticking Include OTC would add to the NADAC page: the OTC NDCs that the other
 * refine fields would show. Zero while OTC is included.
 */
export function nadacHiddenOtcCount(prices: NadacPrice[], criteria: NadacCriteria, dates: DateWindow): number {
  if (criteria.includeOtc) return 0;
  return ndcCount(refineNadac(prices, { ...criteria, includeOtc: true }, dates))
    - ndcCount(refineNadac(prices, criteria, dates));
}

/**
 * A package as the page shows it, or null when it's hidden: its prices clipped to the dates and
 * without excluded units. A package whose only prices were in excluded units is hidden, not
 * shown as a package without prices.
 */
function refinePackage(pkg: FdaPackageDetail, criteria: FdaCriteria, dates: DateWindow, excludedUnits: Set<string>): FdaPackageDetail | null {
  if (!criteria.includeSamplePackages && pkg.samplePackage) return null;
  const clipped = clipToWindow(pkg.nadacPrices, dates);
  const nadacPrices = excludedUnits.size === 0 ? clipped : clipped.filter(price => !excludedUnits.has(price.pricingUnit));
  if (clipped.length > 0 && nadacPrices.length === 0) return null;
  if (!criteria.includeResultsWithoutPrices && nadacPrices.length === 0) return null;
  return nadacPrices === pkg.nadacPrices ? pkg : { ...pkg, nadacPrices };
}

/**
 * An FDA result as the page shows it: each package's prices clipped to the dates, then narrowed
 * by the refine fields. "Without prices" means without prices in these dates. A product whose
 * packages are all hidden is hidden too.
 *
 * @param dates - the dates the applied criteria asked for (the requested load's)
 */
export function refineFda(result: FdaProductSearchResult, criteria: FdaCriteria, dates: DateWindow): FdaProductSearchResult {
  const excludedUnits = new Set(criteria.excludedUnits);
  const showsProduct = (p: FdaProductDetail) =>
    !criteria.excludedProductNdcs.includes(p.productNdc)
    && !criteria.excludedDosageForms.includes(p.dosageFormName)
    // A product shows while any of its routes is still included.
    && (p.routeName.length === 0 || p.routeName.some(r => !criteria.excludedRoutes.includes(r)))
    && !criteria.excludedLabelers.includes(p.labelerName)
    && (criteria.includeOtc || !isFdaProductOtc(p.productTypeName));

  const products: FdaProductDetail[] = [];
  for (const product of result.products) {
    if (!showsProduct(product)) continue;
    const packages = product.fdaPackageDetails
      .map(pkg => refinePackage(pkg, criteria, dates, excludedUnits))
      .filter(pkg => pkg !== null);
    // A product with no packages at all has no prices either.
    const shown = product.fdaPackageDetails.length === 0 ? criteria.includeResultsWithoutPrices : packages.length > 0;
    if (shown) products.push({ ...product, fdaPackageDetails: packages });
  }
  return { ...result, products };
}

// --- Filter state -------------------------------------------------------------------------

const NADAC_DEFAULTS = createNadacCriteria();
const FDA_DEFAULTS = createFdaCriteria();

/** How many refine fields are set away from their defaults. */
export function nadacActiveFilterCount(criteria: NadacCriteria): number {
  return Number(criteria.includeOtc !== NADAC_DEFAULTS.includeOtc)
    + Number(criteria.brandGeneric !== NADAC_DEFAULTS.brandGeneric)
    + NADAC_EXCLUSION_KEYS.filter(key => criteria[key].length > 0).length;
}

export function fdaActiveFilterCount(criteria: FdaCriteria): number {
  return Number(criteria.includeOtc !== FDA_DEFAULTS.includeOtc)
    + Number(criteria.includeSamplePackages !== FDA_DEFAULTS.includeSamplePackages)
    + Number(criteria.includeResultsWithoutPrices !== FDA_DEFAULTS.includeResultsWithoutPrices)
    + FDA_EXCLUSION_KEYS.filter(key => criteria[key].length > 0).length;
}

/** "Clear filters": every refine field back to its default. The search itself stays. */
export const clearNadacRefine = (criteria: NadacCriteria): NadacCriteria => ({
  ...createNadacCriteria(),
  ndcDescription: criteria.ndcDescription,
  ndc: criteria.ndc,
  dates: criteria.dates,
});

export const clearFdaRefine = (criteria: FdaCriteria): FdaCriteria => ({
  ...createFdaCriteria(),
  proprietaryName: criteria.proprietaryName,
  dates: criteria.dates,
});
