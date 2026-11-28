import { DEFAULT_NADAC_SEARCH_MONTHS, MIN_NDC_DESCRIPTION_LENGTH } from "./constants";
import { clipToWindow, windowEndingAt, type ChartDates, type DateWindow } from "./dates";
import { isValidNadacSearch } from "./nadacSearch";
import { ACTIVITY_CATEGORIES, packageActivity, type ActivityCategory } from "./priceActivity";
import { compareStrength, strengthLabel } from "./strength";
import { labelerCodes, matchesLabelerCodes, type LabelerChoice } from "./labelers";
import {
  isFdaProductOtc,
  type FdaPackageDetail, type FdaProductDetail, type FdaProductSearchResult, type FdaResultDetailLevel,
  type NadacClassification, type NadacPrice,
} from "./types";

/*
 * One criteria object per search type holds every field of its search panel. Each field is in
 * one of two groups, and the group alone decides whether changing it fetches:
 *
 * - Load fields (the text terms and Dates) go to the server.
 * - Refine fields narrow what loaded, in the client.
 *
 * The user is never asked to know which is which: only the text terms wait for the Search
 * button, and every other field, Dates included, applies at once.
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
  nonProprietaryName: string,
  /**
   * Picked from the Labeler field: they narrow the name search to these labelers. They apply at
   * once, like Dates: a load that already holds them is filtered in the client (`fdaLoadHolds`),
   * else the search sends their codes (`labelerCodes`). Without a name they don't search.
   */
  labelers: LabelerChoice[],
  dates: ChartDates,
  // Refine
  includeOtc: boolean,
  includeSamplePackages: boolean,
  includeResultsWithoutPrices: boolean,
  /**
   * Price activity categories to hide (`PriceActivity.category`). A fixed refine field, like the
   * Include boxes: its values don't come from a result, so a new search keeps it.
   */
  excludedActivities: ActivityCategory[],
  excludedProductNdcs: string[],
  excludedDosageForms: string[],
  excludedStrengths: string[],
  excludedRoutes: string[],
  excludedLabelers: string[],
  excludedUnits: string[],
};

/** The text terms: the fields the Search button applies. */
export type NadacTerms = Pick<NadacCriteria, "ndcDescription" | "ndc">;
export type FdaTerms = Pick<FdaCriteria, "proprietaryName" | "nonProprietaryName">;
/** What FDA's labels name: the names, and the picks narrowing them. */
type FdaLabelTerms = FdaTerms & { labelers?: LabelerChoice[] };

/** An exclusion-list field: a multi-select whose options come from the loaded result. */
export type NadacExclusionKey = "excludedNdcDescriptions" | "excludedUnits";
export type FdaExclusionKey =
  "excludedProductNdcs" | "excludedDosageForms" | "excludedStrengths" | "excludedRoutes" | "excludedLabelers" | "excludedUnits";
/** Every list in FDA's More filters: the from-results lists and Price activity. */
export type FdaListKey = FdaExclusionKey | "excludedActivities";

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
  nonProprietaryName: "",
  labelers: [],
  dates: DEFAULT_SEARCH_DATES,
  includeOtc: false,
  includeSamplePackages: false,
  includeResultsWithoutPrices: false,
  excludedActivities: [],
  excludedProductNdcs: [],
  excludedDosageForms: [],
  excludedStrengths: [],
  excludedRoutes: [],
  excludedLabelers: [],
  excludedUnits: [],
});

export const NADAC_EXCLUSION_KEYS: readonly NadacExclusionKey[] = ["excludedNdcDescriptions", "excludedUnits"];
export const FDA_EXCLUSION_KEYS: readonly FdaExclusionKey[] =
  ["excludedProductNdcs", "excludedDosageForms", "excludedStrengths", "excludedRoutes", "excludedLabelers", "excludedUnits"];
export const FDA_LIST_KEYS: readonly FdaListKey[] = ["excludedActivities", ...FDA_EXCLUSION_KEYS];

/** An "Include ..." checkbox: a refine field that hides something by default. */
export type IncludeKey = "includeOtc" | "includeSamplePackages" | "includeResultsWithoutPrices";

// --- Load ---------------------------------------------------------------------------------

/** What a search asks the server for. Its dates are fixed (presets resolved); a null end is open. */
export type NadacLoad = { ndcDescription: string, ndc: string, dates: DateWindow };
/** An FDA load sends the picks' codes, sorted, so the order they were picked in doesn't matter. */
export type FdaLoad = { proprietaryName: string, nonProprietaryName: string, labelerCodes: string[], dates: DateWindow };

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

/**
 * Either name can supply the minimum length; every supplied term, Labeler picks included,
 * narrows the match. Picks alone are not a search (decided 2026-11-27). Mirrors the server's
 * check in `FdaProductEndpoints`.
 */
export const isValidFdaSearch = (proprietaryName: string, nonProprietaryName: string) =>
  [proprietaryName, nonProprietaryName].some(name => name.trim().length >= MIN_NDC_DESCRIPTION_LENGTH);

/** The names searched on, trimmed, brand first. */
const fdaNames = (terms: FdaTerms) => [terms.proprietaryName.trim(), terms.nonProprietaryName.trim()].filter(Boolean);

/** The picked labelers in a label: the first one's name, and "+2" for two more. */
const labelerLabel = (labelers: LabelerChoice[] = []) =>
  labelers.length === 0 ? null : labelers[0].name + (labelers.length > 1 ? ` +${labelers.length - 1}` : "");

/** Shared wording for chart provenance and a new tab's title. The picks follow the names they narrow. */
export const fdaSearchLabel = (terms: FdaLabelTerms) => {
  const names = fdaNames(terms);
  return names.length === 0 ? "search" : [...names, labelerLabel(terms.labelers)].filter(Boolean).join(" / ");
};

/** The title a search gives its tab (`useRenameAfterSearch`) and a workspace copy of it. */
export const fdaTabTitle = (terms: FdaLabelTerms) => fdaSearchLabel(terms).toUpperCase();

/** Text in quotes, to mark it as what the user typed and not the app's wording. */
export const quoted = (text: string) => `\u201c${text}\u201d`;

/** The results heading's wording: `fdaSearchLabel` with each typed name in quotes; a labeler was picked, not typed. */
export const fdaResultsLabel = (terms: FdaLabelTerms) => {
  const names = fdaNames(terms);
  return names.length === 0 ? "search" : [...names.map(quoted), labelerLabel(terms.labelers)].filter(Boolean).join(" / ");
};

/** Shared wording for chart provenance: the description, or else the NDC (in its stored form). */
export const nadacSearchLabel = (terms: NadacTerms) =>
  terms.ndcDescription.trim() || (terms.ndc ? `NDC ${terms.ndc}` : "search");

/** The results heading's wording: `nadacSearchLabel` with a description in quotes. */
export const nadacResultsLabel = (terms: NadacTerms) =>
  terms.ndcDescription.trim() ? quoted(terms.ndcDescription.trim()) : nadacSearchLabel(terms);

/** The FDA request the criteria ask for, or null when its terms aren't enough to search on. */
export function fdaLoadRequest(criteria: FdaCriteria, lastAsOfDate: number): FdaLoad | null {
  if (!isValidFdaSearch(criteria.proprietaryName, criteria.nonProprietaryName)) return null;
  return {
    proprietaryName: criteria.proprietaryName,
    nonProprietaryName: criteria.nonProprietaryName,
    labelerCodes: labelerCodes(criteria.labelers),
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

/** The default `holds`: the same terms, and dates that cover the requested ones. */
export const loadHolds = <T extends { dates: DateWindow }>(loaded: T, requested: T) =>
  sameTerms(loaded, requested) && windowCovers(loaded.dates, requested.dates);

/**
 * Whether a load's labeler codes hold the requested ones: a load without codes holds every
 * labeler for its names, and one with codes holds any non-empty subset of them.
 */
export function labelerCodesHold(loaded: string[], requested: string[]): boolean {
  if (loaded.length === 0) return true;
  const codes = new Set(loaded);
  return requested.length > 0 && requested.every(code => codes.has(code));
}

/**
 * FDA's `holds`: the same names, dates that cover the requested ones, and labeler codes that
 * hold the requested ones (`labelerCodesHold`), so picks narrowing what's loaded filter it in
 * the client (`refineFda`) instead of fetching.
 */
export const fdaLoadHolds = (loaded: FdaLoad, requested: FdaLoad) =>
  loaded.proprietaryName === requested.proprietaryName && loaded.nonProprietaryName === requested.nonProprietaryName
  && windowCovers(loaded.dates, requested.dates) && labelerCodesHold(loaded.labelerCodes, requested.labelerCodes);

/**
 * The "narrowing doesn't fetch" rule: keeps what is loaded when it holds the request (`holds`,
 * by default the same terms and dates that cover the requested ones), so the client clips or
 * filters instead of fetching. Anything else (new terms, or dates reaching outside what is
 * loaded) is a new load, and so is any request after the server refused `loaded` as too large
 * (`loadedRefused`, `isTooManyRows`): shortening the Dates, or picking a labeler, is the fix.
 */
export function nextLoad<T extends { dates: DateWindow }>(
  loaded: T | null,
  requested: T | null,
  loadedRefused = false,
  holds: (loaded: T, requested: T) => boolean = loadHolds,
): T | null {
  if (loaded === null || requested === null) return requested;
  // A load the server refused as too large holds nothing, so any narrowing must fetch.
  if (loadedRefused) return requested;
  return holds(loaded, requested) ? loaded : requested;
}

/**
 * The applied criteria after Search: the terms from the form, and every other field kept.
 * A search for new terms clears the exclusion lists, which name values from the old result; the
 * fixed refine fields (the Include checkboxes, brand/generic) carry over.
 */
export function applyNadacSearch(applied: NadacCriteria, fields: NadacTerms): NadacCriteria {
  const next = { ...applied, ...fields };
  if (fields.ndcDescription === applied.ndcDescription && fields.ndc === applied.ndc) return next;
  return { ...next, ...clearedExclusions(NADAC_EXCLUSION_KEYS) };
}

export function applyFdaSearch(applied: FdaCriteria, fields: FdaTerms): FdaCriteria {
  const next = { ...applied, ...fields };
  if (fields.proprietaryName === applied.proprietaryName && fields.nonProprietaryName === applied.nonProprietaryName) return next;
  return { ...next, ...clearedExclusions(FDA_EXCLUSION_KEYS) };
}

const clearedExclusions = <K extends string>(keys: readonly K[]) =>
  Object.fromEntries(keys.map(key => [key, []])) as unknown as Record<K, never[]>;

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

/** Days between NADAC as-of dates: weekly (all 249 gaps in the data were 7 days, 2026-11). */
const AS_OF_INTERVAL_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
/** The furthest a date snaps: to an as-of date less than one interval away. */
const SNAP_REACH = (AS_OF_INTERVAL_DAYS - 1) * DAY_MS;

/**
 * The window moved out to the as-of dates of these prices, as the NADAC server snaps a search's
 * dates: the start down to the last as-of date at or before it (the price in effect on that day),
 * the end up to the first at or after it. Only as-of dates less than one interval away count, as
 * the server snaps to the dates loaded for every NDC: an NDC last priced months before the start
 * doesn't pull it back. A date with no as-of date in reach stays.
 */
export function snapToAsOfDates(dates: DateWindow, prices: NadacPrice[]): DateWindow {
  let start: number | null = null;
  let end: number | null = null;
  for (const price of prices) {
    const time = price.asOfDate.getTime();
    if (dates.start !== null && time <= dates.start && time >= dates.start - SNAP_REACH
      && (start === null || time > start)) start = time;
    if (dates.end !== null && time >= dates.end && time <= dates.end + SNAP_REACH
      && (end === null || time < end)) end = time;
  }
  return { start: start ?? dates.start, end: end ?? dates.end };
}

/**
 * The dates to ask a server for when it filters prices strictly, as FDA's does: each end moved
 * out by `snapToAsOfDates`'s reach, so the result holds the as-of dates it snaps to. The client
 * then clips it as NADAC's server would have.
 */
export const widenToAsOfDates = (dates: DateWindow): DateWindow => ({
  start: dates.start === null ? null : dates.start - SNAP_REACH,
  end: dates.end === null ? null : dates.end + SNAP_REACH,
});

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

/*
 * From-results lists take their options from the result the page could show: after the clip and
 * the fixed refine fields (the Include boxes, brand/generic) but before any exclusion. So
 * excluding a value doesn't remove it from its list, and a value the page can't show (an OTC-only
 * drug while OTC is hidden, a drug only outside narrowed dates) isn't listed.
 */

/** The options of NADAC's from-results lists, keyed by the exclusion each one sets. */
export function nadacFilterOptions(prices: NadacPrice[], criteria: NadacCriteria, dates: DateWindow): Record<NadacExclusionKey, string[]> {
  const shown = refineNadac(prices, { ...criteria, ...clearedExclusions(NADAC_EXCLUSION_KEYS) }, dates);
  return {
    excludedNdcDescriptions: uniqueSorted(shown.map(price => price.ndcDescription)),
    excludedUnits: uniqueSorted(shown.map(price => price.pricingUnit)),
  };
}

/**
 * What the refine fields hide, in rows of the results table (NDCs on NADAC; products or packages
 * on FDA, by detail level). `byInclude` has, for each of the page's Include boxes, the rows
 * ticking it would add (0 while it's ticked); `byClearing`, the rows that "Clear filters" (every
 * refine field back to its default) would add; `total`, the rows that showing everything would add.
 */
export type HiddenCounts = {
  byInclude: Partial<Record<IncludeKey, number>>,
  byClearing: number,
  total: number,
};

/** Every refine field set to show everything: the empty result's "Show all". */
export const showAllNadac = (criteria: NadacCriteria): NadacCriteria =>
  ({ ...criteria, includeOtc: true, brandGeneric: "all", ...clearedExclusions(NADAC_EXCLUSION_KEYS) });

/** @param refined - `refineNadac(prices, criteria, dates)`, which the caller already has */
export function nadacHiddenCounts(prices: NadacPrice[], refined: NadacPrice[], criteria: NadacCriteria, dates: DateWindow): HiddenCounts {
  const shown = ndcCount(refined);
  const added = (wider: NadacCriteria) => ndcCount(refineNadac(prices, wider, dates)) - shown;
  return {
    byInclude: { includeOtc: criteria.includeOtc ? 0 : added({ ...criteria, includeOtc: true }) },
    byClearing: added(clearNadacRefine(criteria)),
    total: added(showAllNadac(criteria)),
  };
}

/** What the empty table offers when the refine fields hide every result. */
export type HiddenResultsHint =
  /** One Include box would show them all. */
  | { kind: "include", key: IncludeKey, count: number }
  /** Fields the user set hide them: "Clear filters" shows the `count` the defaults show. */
  | { kind: "clear", count: number }
  /** The defaults hide them too: "Show all" sets every refine field to show everything. */
  | { kind: "all", count: number };

/**
 * The hint for a page that shows nothing, or null when nothing is hidden either. Clearing comes
 * before showing everything, so a filter the user set doesn't bring back what the defaults hide
 * (OTC) along with what it hid.
 */
export function hiddenResultsHint(hidden: HiddenCounts): HiddenResultsHint | null {
  if (hidden.total === 0) return null;
  const key = (Object.keys(hidden.byInclude) as IncludeKey[]).find(k => hidden.byInclude[k] === hidden.total);
  if (key) return { kind: "include", key, count: hidden.total };
  if (hidden.byClearing > 0) return { kind: "clear", count: hidden.byClearing };
  return { kind: "all", count: hidden.total };
}

/*
 * A package's activity category is costly (`packageActivity`), and the page refines several times
 * per change (`fdaHiddenCounts`). It depends only on the loaded package, the shown dates and the
 * excluded units, so it's cached per loaded package under those, a few entries each.
 */
const categoryCache = new WeakMap<FdaPackageDetail, Map<string, ActivityCategory | null>>();
const CATEGORY_CACHE_ENTRIES = 4;

/** The prices a package shows in `dates`: clipped, and without excluded units. */
function shownPrices(pkg: FdaPackageDetail, dates: DateWindow, excludedUnits: Set<string>): NadacPrice[] {
  const clipped = clipToWindow(pkg.nadacPrices, dates);
  return excludedUnits.size === 0 ? clipped : clipped.filter(price => !excludedUnits.has(price.pricingUnit));
}

/**
 * @param pkg - the loaded package, the cache's key
 * @param prices - `shownPrices(pkg, dates, excludedUnits)`
 */
function packageCategory(pkg: FdaPackageDetail, dates: DateWindow, excludedUnits: Set<string>, prices: NadacPrice[]) {
  const key = JSON.stringify([dates.start, dates.end, [...excludedUnits].sort()]);
  let entries = categoryCache.get(pkg);
  if (!entries) categoryCache.set(pkg, entries = new Map<string, ActivityCategory | null>());
  if (entries.has(key)) return entries.get(key)!;
  const { category } = packageActivity(prices);
  if (entries.size >= CATEGORY_CACHE_ENTRIES) entries.clear();
  entries.set(key, category);
  return category;
}

/**
 * A package as the page shows it, or null when it's hidden: its prices clipped to the dates and
 * without excluded units. A package whose only prices were in excluded units is hidden, not
 * shown as a package without prices. A package with prices in `activityDates` is hidden when
 * its activity over them is an excluded category, which is the activity its row shows. Packages
 * without prices are the Include box's, and a package with no category (two units) is the
 * Pricing unit list's.
 */
function refinePackage(
  pkg: FdaPackageDetail, criteria: FdaCriteria, dates: DateWindow, activityDates: DateWindow,
  excludedUnits: Set<string>, excludedActivities: Set<ActivityCategory>,
): FdaPackageDetail | null {
  if (!criteria.includeSamplePackages && pkg.samplePackage) return null;
  const clipped = clipToWindow(pkg.nadacPrices, dates);
  const nadacPrices = excludedUnits.size === 0 ? clipped : clipped.filter(price => !excludedUnits.has(price.pricingUnit));
  if (clipped.length > 0 && nadacPrices.length === 0) return null;
  if (!criteria.includeResultsWithoutPrices && nadacPrices.length === 0) return null;
  // Activity is the costly part of refining, so it's skipped while nothing is excluded.
  if (excludedActivities.size > 0) {
    const activityPrices = activityDates === dates ? nadacPrices : shownPrices(pkg, activityDates, excludedUnits);
    const category = activityPrices.length > 0 ? packageCategory(pkg, activityDates, excludedUnits, activityPrices) : null;
    if (category !== null && excludedActivities.has(category)) return null;
  }
  return nadacPrices === pkg.nadacPrices ? pkg : { ...pkg, nadacPrices };
}

const fdaPrices = (result: FdaProductSearchResult) =>
  result.products.flatMap(product => product.fdaPackageDetails.flatMap(pkg => pkg.nadacPrices));

/**
 * The dates an FDA result shows: the search's, snapped to as-of dates as NADAC's server snaps
 * them (`snapToAsOfDates`), so both pages start on the price in effect on the start date. The
 * request is widened to hold those dates (`widenToAsOfDates`).
 */
export const fdaShownDates = (result: FdaProductSearchResult, dates: DateWindow): DateWindow =>
  snapToAsOfDates(dates, fdaPrices(result));

/**
 * An FDA result as the page shows it: narrowed to the Labeler picks first (`narrowToLabelers`),
 * as a fetch with those picks would have loaded it, then each package's prices clipped to the
 * dates (snapped, `fdaShownDates`, over the narrowed products, so a reused broad load snaps as a
 * narrowed fetch does), then narrowed by the refine fields. "Without prices" means without prices in these dates. A product whose
 * packages are all hidden is hidden too.
 *
 * @param dates - the dates the applied criteria asked for (the requested load's)
 * @param activityDates - the dates Price activity judges packages by, when they aren't `dates`:
 *   the page's, when this refines over every loaded date (`loadedPrices`), so that keeps the
 *   packages the page shows
 */
export function refineFda(
  result: FdaProductSearchResult, criteria: FdaCriteria, dates: DateWindow, activityDates: DateWindow = dates,
): FdaProductSearchResult {
  const narrowed = narrowToLabelers(result, criteria.labelers);
  const shownDates = fdaShownDates(narrowed, dates);
  const shownActivityDates = activityDates === dates ? shownDates : fdaShownDates(narrowed, activityDates);
  const excludedUnits = new Set(criteria.excludedUnits);
  const excludedActivities = new Set(criteria.excludedActivities);
  const showsProduct = (p: FdaProductDetail) =>
    !criteria.excludedProductNdcs.includes(p.productNdc)
    && !criteria.excludedDosageForms.includes(p.dosageFormName)
    && (criteria.excludedStrengths.length === 0 || !criteria.excludedStrengths.includes(strengthLabel(p)))
    // A product shows while any of its routes is still included.
    && (p.routeName.length === 0 || p.routeName.some(r => !criteria.excludedRoutes.includes(r)))
    && !criteria.excludedLabelers.includes(p.labelerName)
    && (criteria.includeOtc || !isFdaProductOtc(p.productTypeName));

  const products: FdaProductDetail[] = [];
  for (const product of narrowed.products) {
    if (!showsProduct(product)) continue;
    const packages = product.fdaPackageDetails
      .map(pkg => refinePackage(pkg, criteria, shownDates, shownActivityDates, excludedUnits, excludedActivities))
      .filter(pkg => pkg !== null);
    // A product with no packages at all has no prices either.
    const shown = product.fdaPackageDetails.length === 0 ? criteria.includeResultsWithoutPrices : packages.length > 0;
    if (shown) products.push({ ...product, fdaPackageDetails: packages });
  }
  return { ...result, products };
}

/** Price activity's options: all five categories, in the column's order, as for the Include boxes. */
const ACTIVITY_OPTIONS: string[] = ACTIVITY_CATEGORIES.map(category => category.key);

/**
 * The loaded result narrowed to the picks, as the server would have loaded it: the load's
 * narrowing only, without the refine fields. What reads the loaded result to say what a search
 * found (`NadacHandoffNotice`) reads this, so a load filtered in the client says what a
 * narrowed fetch would. The same result without picks.
 */
export function narrowToLabelers(result: FdaProductSearchResult, labelers: LabelerChoice[]): FdaProductSearchResult {
  const codes = labelerCodes(labelers);
  if (codes.length === 0) return result;
  return { ...result, products: result.products.filter(product => matchesLabelerCodes(product.productNdc, codes)) };
}

/**
 * The options of FDA's More filters lists, keyed by the exclusion each one sets. Price activity
 * is a fixed set kept across searches, so it always lists every category: a category absent from
 * this result can still be excluded and seen. Strength sorts by number (`compareStrength`); the
 * other from-results lists are alphabetical.
 */
export function fdaFilterOptions(result: FdaProductSearchResult, criteria: FdaCriteria, dates: DateWindow): Record<FdaListKey, string[]> {
  const { products } = refineFda(result, { ...criteria, ...clearedExclusions(FDA_LIST_KEYS) }, dates);
  return {
    excludedActivities: ACTIVITY_OPTIONS,
    excludedProductNdcs: uniqueSorted(products.map(product => product.productNdc)),
    excludedDosageForms: uniqueSorted(products.map(product => product.dosageFormName)),
    excludedStrengths: [...new Set(products.map(strengthLabel))].sort(compareStrength),
    excludedRoutes: uniqueSorted(products.flatMap(product => product.routeName)),
    excludedLabelers: uniqueSorted(products.map(product => product.labelerName)),
    excludedUnits: uniqueSorted(products.flatMap(product =>
      product.fdaPackageDetails.flatMap(pkg => pkg.nadacPrices.map(price => price.pricingUnit)))),
  };
}

export const showAllFda = (criteria: FdaCriteria): FdaCriteria => ({
  ...criteria,
  includeOtc: true,
  includeSamplePackages: true,
  includeResultsWithoutPrices: true,
  ...clearedExclusions(FDA_LIST_KEYS),
});

/** The table's rows at a detail level: products, or their packages. */
export const fdaRowCount = (result: FdaProductSearchResult, level: FdaResultDetailLevel): number =>
  level === "product"
    ? result.products.length
    : result.products.reduce((count, product) => count + product.fdaPackageDetails.length, 0);

/** FDA's Include boxes, in the panel's order. */
export const FDA_INCLUDE_KEYS: readonly IncludeKey[] = ["includeOtc", "includeSamplePackages", "includeResultsWithoutPrices"];

/** @param refined - `refineFda(result, criteria, dates)`, which the caller already has */
export function fdaHiddenCounts(
  result: FdaProductSearchResult, refined: FdaProductSearchResult, criteria: FdaCriteria, dates: DateWindow,
  level: FdaResultDetailLevel,
): HiddenCounts {
  const shown = fdaRowCount(refined, level);
  const added = (wider: FdaCriteria) => fdaRowCount(refineFda(result, wider, dates), level) - shown;
  return {
    byInclude: Object.fromEntries(FDA_INCLUDE_KEYS.map(key =>
      [key, criteria[key] ? 0 : added({ ...criteria, [key]: true })])),
    byClearing: added(clearFdaRefine(criteria)),
    total: added(showAllFda(criteria)),
  };
}

// --- Filter state -------------------------------------------------------------------------

const NADAC_DEFAULTS = createNadacCriteria();
const FDA_DEFAULTS = createFdaCriteria();

/** How many of the exclusion lists exclude something: the "More filters (2)" count. */
export const exclusionCount = <C extends Record<K, string[]>, K extends string>(criteria: C, keys: readonly K[]) =>
  keys.filter(key => criteria[key].length > 0).length;

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
    + FDA_LIST_KEYS.filter(key => criteria[key].length > 0).length;
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
  nonProprietaryName: criteria.nonProprietaryName,
  labelers: criteria.labelers,
  dates: criteria.dates,
});

/** The empty table's fix (`hiddenResultsHint`): tick its Include box, clear the filters, or show everything. */
export function revealNadac(criteria: NadacCriteria, hint: HiddenResultsHint): NadacCriteria {
  if (hint.kind === "include") return { ...criteria, [hint.key]: true };
  return hint.kind === "clear" ? clearNadacRefine(criteria) : showAllNadac(criteria);
}

export function revealFda(criteria: FdaCriteria, hint: HiddenResultsHint): FdaCriteria {
  if (hint.kind === "include") return { ...criteria, [hint.key]: true };
  return hint.kind === "clear" ? clearFdaRefine(criteria) : showAllFda(criteria);
}
