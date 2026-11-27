/*
 * The Labeler field's matching. The server sends every labeler group once (`getFdaLabelers`), and
 * the field matches typed text against it here, misspellings included, so suggestions are instant
 * and what's typed never leaves the browser.
 */

/** A labeler: one company's spellings and labeler codes (server `LabelerGroups`). */
export type LabelerGroup = {
  /** The spelling with the most products. */
  name: string,
  /** The first segments of its product NDCs, sorted. */
  codes: string[],
  /** Its other spellings, one per normalized form. */
  spellings: string[],
  productCount: number,
  hasRx: boolean,
  hasPrices: boolean,
  hasRxPrices: boolean,
};

/** A picked labeler, as criteria store it: the chip's name and the codes the search sends. */
export type LabelerChoice = { name: string, codes: string[] };

/** The page's Include boxes, which decide the labelers offered. */
export type LabelerFlags = { includeOtc: boolean, includeWithoutPrices: boolean };

const CORPORATE_WORDS = new Set(["inc", "llc", "lp", "ltd", "limited", "corp", "corporation", "co", "company", "plc", "sa", "ag", "gmbh"]);

/**
 * A labeler name in the form spellings are compared in: lower case, apostrophes (and the
 * mis-encoded ones FDA's data has) deleted, other punctuation as spaces, and trailing corporate
 * words dropped, never the first word. Mirrors the server's `LabelerGroups.Normalize`; change both.
 */
export function normalizeLabeler(name: string): string {
  const words = name.toLowerCase()
    .replace(/['’`\u0092¿]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter(Boolean);
  while (words.length > 1 && CORPORATE_WORDS.has(words.at(-1)!)) words.pop();
  return words.join(" ");
}

/** Where a vocabulary entry occurs: a group, and one of its spellings (0 is its name). */
type Occurrence = { group: number, spelling: number };

export type LabelerIndex = {
  groups: LabelerGroup[],
  /** Each group's normalized spellings, its name's first. */
  spellings: string[][],
  /** Each word of a spelling, to the spellings it's in. */
  words: Map<string, Occurrence[]>,
  /** Each join of 2 or 3 adjacent words ("glaxosmithkline"), to the spellings it's in. */
  joins: Map<string, Occurrence[]>,
};

const addOccurrence = (map: Map<string, Occurrence[]>, key: string, occurrence: Occurrence) => {
  const list = map.get(key);
  if (list) list.push(occurrence); else map.set(key, [occurrence]);
};

/** Indexes a labeler list for `matchLabelers`. Run once per list. */
export function buildLabelerIndex(groups: LabelerGroup[]): LabelerIndex {
  const words = new Map<string, Occurrence[]>();
  const joins = new Map<string, Occurrence[]>();
  const spellings = groups.map((group, g) => {
    const forms = [...new Set([group.name, ...group.spellings].map(normalizeLabeler))];
    forms.forEach((form, s) => {
      const parts = form.split(" ").filter(Boolean);
      for (const part of new Set(parts)) addOccurrence(words, part, { group: g, spelling: s });
      for (let i = 0; i < parts.length; i++) {
        for (const size of [2, 3]) {
          if (i + size <= parts.length) addOccurrence(joins, parts.slice(i, i + size).join(""), { group: g, spelling: s });
        }
      }
    });
    return forms;
  });
  return { groups, spellings, words, joins };
}

/**
 * Optimal string alignment distance (Damerau–Levenshtein without repeated edits of one
 * substring), stopping early once it passes `max`.
 */
export function osaDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) value = Math.min(value, prev2[j - 2] + 1);
      row.push(value);
      rowMin = Math.min(rowMin, value);
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = row;
  }
  return prev[b.length];
}

/** The edits a typed word may be from a word it matches: none below 4 letters, 1 to 7, then 2. */
const allowedEdits = (word: string) => word.length >= 8 ? 2 : word.length >= 4 ? 1 : 0;

/** A fuzzy match that is only a word's prefix costs this much more than a whole-word one. */
const PREFIX_COST = 0.5;

/**
 * What matching typed `word` to vocabulary `entry` costs, or null when it doesn't match. A word
 * matches exactly (0), as the entry's prefix when 3+ letters (0.5), or within `allowedEdits` of
 * the whole entry (the edits) or of the entry's prefix of its length (the edits + 0.5).
 */
function wordCost(word: string, entry: string): number | null {
  if (word === entry) return 0;
  const max = allowedEdits(word);
  if (entry.length < word.length - max) return null;
  if (word.length >= 3 && entry.startsWith(word)) return PREFIX_COST;
  if (max === 0) return null;
  let best: number | null = null;
  if (Math.abs(entry.length - word.length) <= max) {
    const edits = osaDistance(word, entry, max);
    if (edits <= max) best = edits;
  }
  if (entry.length > word.length) {
    const edits = osaDistance(word, entry.slice(0, word.length), max);
    if (edits <= max && (best === null || edits + PREFIX_COST < best)) best = edits + PREFIX_COST;
  }
  return best;
}

/**
 * How a group matched, best first: (1) a spelling starts with the term, (2) a word of a spelling
 * does, (3) a spelling holds it, (4) a fuzzy match ("Did you mean").
 */
export type MatchTier = 1 | 2 | 3 | 4;

export type LabelerMatch = {
  group: LabelerGroup,
  tier: MatchTier,
  /** Within a tier, lower is closer; 0 for tiers 1–3. */
  cost: number,
  /** The spelling that matched, when it isn't the group's name ("Listed as Rexall"). */
  listedAs: string | null,
};

export type LabelerMatches = {
  /** At most `MAX_LABELER_MATCHES`, best first. */
  matches: LabelerMatch[],
  /**
   * Whether a spelling or one of its words starts with the term (tier 1 or 2). When it doesn't,
   * the field says the company may be listed under another name.
   */
  wordStart: boolean,
};

export const MAX_LABELER_MATCHES = 20;
/** The fewest characters matched: "3M" is a labeler. */
export const MIN_LABELER_TERM_LENGTH = 2;

/** Which groups the page could show: those with Rx prices unless an Include box widens it. */
function offered(group: LabelerGroup, flags: LabelerFlags): boolean {
  if (flags.includeOtc && flags.includeWithoutPrices) return true;
  if (flags.includeOtc) return group.hasPrices;
  if (flags.includeWithoutPrices) return group.hasRx;
  return group.hasRxPrices;
}

/** Each matched spelling's lowest cost, keyed by group, then spelling. */
type Costs = Map<number, Map<number, number>>;

function setLower(costs: Costs, { group, spelling }: Occurrence, cost: number) {
  let bySpelling = costs.get(group);
  if (!bySpelling) costs.set(group, bySpelling = new Map<number, number>());
  const current = bySpelling.get(spelling);
  if (current === undefined || cost < current) bySpelling.set(spelling, cost);
}

function vocabularyCosts(word: string, vocabulary: Map<string, Occurrence[]>): Costs {
  const costs: Costs = new Map();
  for (const [entry, occurrences] of vocabulary) {
    const cost = wordCost(word, entry);
    if (cost === null) continue;
    for (const occurrence of occurrences) setLower(costs, occurrence, cost);
  }
  return costs;
}

/**
 * Tier 4: every word of the term (corporate words aside) matches a word of one spelling, at the
 * sum of their costs; or the whole term, spaces removed, matches a word or 2–3 adjacent words
 * joined ("glaxo smith kline"). The lowest cost per group, with the spelling it came from.
 */
function fuzzyMatches(index: LabelerIndex, term: string): Map<number, { cost: number, spelling: number }> {
  const all = term.split(" ");
  const meaningful = all.filter(word => !CORPORATE_WORDS.has(word));
  const words = meaningful.length > 0 ? meaningful : all;
  const best = new Map<number, { cost: number, spelling: number }>();
  const consider = (group: number, spelling: number, cost: number) => {
    const current = best.get(group);
    if (!current || cost < current.cost) best.set(group, { cost, spelling });
  };

  const perWord = words.map(word => vocabularyCosts(word, index.words));
  for (const [group, bySpelling] of perWord[0]) {
    for (const [spelling, firstCost] of bySpelling) {
      let cost = firstCost;
      for (const costs of perWord.slice(1)) {
        const wordCost = costs.get(group)?.get(spelling);
        if (wordCost === undefined) { cost = Infinity; break; }
        cost += wordCost;
      }
      if (cost !== Infinity) consider(group, spelling, cost);
    }
  }

  if (all.length > 1) {
    const joined = all.join("");
    for (const vocabulary of [index.words, index.joins]) {
      for (const [group, bySpelling] of vocabularyCosts(joined, vocabulary)) {
        for (const [spelling, cost] of bySpelling) consider(group, spelling, cost);
      }
    }
  }
  return best;
}

/** The labelers typed text matches, best first, among those the Include boxes offer. */
export function matchLabelers(index: LabelerIndex, typed: string, flags: LabelerFlags): LabelerMatches {
  const term = normalizeLabeler(typed);
  // The normalized term: "a." is one letter.
  if (term.length < MIN_LABELER_TERM_LENGTH) return { matches: [], wordStart: false };

  const matches: LabelerMatch[] = [];
  const matched = new Set<number>();
  const add = (group: number, tier: MatchTier, cost: number, spelling: number) => {
    matched.add(group);
    const { name, spellings } = index.groups[group];
    // Spelling 0 is the name; the others follow the group's spellings, deduplicated in order.
    const listedAs = spelling === 0 ? null
      : spellings.find(original => normalizeLabeler(original) === index.spellings[group][spelling]) ?? null;
    matches.push({ group: index.groups[group], tier, cost, listedAs: listedAs === name ? null : listedAs });
  };

  index.spellings.forEach((forms, g) => {
    if (!offered(index.groups[g], flags)) return;
    let best: MatchTier | null = null;
    let bestSpelling = 0;
    forms.forEach((form, s) => {
      const tier = form.startsWith(term) ? 1 : form.includes(" " + term) ? 2 : form.includes(term) ? 3 : null;
      if (tier !== null && (best === null || tier < best)) {
        best = tier;
        bestSpelling = s;
      }
    });
    if (best !== null) add(g, best, 0, bestSpelling);
  });

  for (const [group, { cost, spelling }] of fuzzyMatches(index, term)) {
    if (!matched.has(group) && offered(index.groups[group], flags)) add(group, 4, cost, spelling);
  }

  matches.sort((a, b) => a.tier - b.tier || a.cost - b.cost
    || b.group.productCount - a.group.productCount || a.group.name.localeCompare(b.group.name));
  return {
    matches: matches.slice(0, MAX_LABELER_MATCHES),
    wordStart: matches.some(match => match.tier <= 2),
  };
}

/** The distinct labeler codes picks search, which `MAX_LABELER_CODES` limits. */
export const labelerCodeCount = (choices: LabelerChoice[]): number =>
  new Set(choices.flatMap(choice => choice.codes)).size;

/** The search's labeler codes: distinct and sorted, so the order of picks doesn't matter. */
export const labelerCodes = (choices: LabelerChoice[]): string[] =>
  [...new Set(choices.flatMap(choice => choice.codes))].sort();

/**
 * Whether a product is one of the labelers' codes: its NDC starts with a code and a dash. The
 * same rule as the server's `ProductNdc LIKE 'code-%'`, so filtering a load in the client shows
 * what a load narrowed by the server would. No codes: every product.
 */
export const matchesLabelerCodes = (productNdc: string, codes: string[]): boolean =>
  codes.length === 0 || codes.some(code => productNdc.startsWith(code + "-"));
