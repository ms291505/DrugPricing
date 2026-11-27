import { describe, expect, it } from "vitest";
import {
  buildLabelerIndex, labelerCodeCount, labelerCodes, matchLabelers, MAX_LABELER_MATCHES, normalizeLabeler, osaDistance,
  type LabelerGroup,
} from "./labelers";
import { LABELER_FIXTURE } from "./labelers.fixture";

const index = buildLabelerIndex(LABELER_FIXTURE);
const RX_PRICED = { includeOtc: false, includeWithoutPrices: false };
const EVERY = { includeOtc: true, includeWithoutPrices: true };
const names = (term: string, flags = RX_PRICED) => matchLabelers(index, term, flags).matches.map(match => match.group.name);

describe("normalizeLabeler", () => {
  it("reads Dr. Reddy's spellings alike, mis-encoded apostrophes included", () => {
    const spellings = [
      "Dr. Reddy's Laboratories Inc.", "Dr. Reddys Laboratories Inc", "Dr. Reddy¿s Laboratories Inc",
      "Dr. Reddy\u0092s Laboratories, Inc.", "DR. REDDY’S LABORATORIES INC", "Dr.Reddy's Laboratories Limited",
    ];
    expect(new Set(spellings.map(normalizeLabeler))).toEqual(new Set(["dr reddys laboratories"]));
  });
  it("drops trailing corporate words but never the first word", () => {
    expect(normalizeLabeler("Sandoz Inc")).toBe("sandoz");
    expect(normalizeLabeler("E.R. Squibb & Sons, L.L.C.")).toBe("e r squibb sons l l c");
    expect(normalizeLabeler("Company")).toBe("company");
    expect(normalizeLabeler("Hansen Pharmaceutical Investment Co., Limited")).toBe("hansen pharmaceutical investment");
  });
});

describe("osaDistance", () => {
  it("counts a swap of neighbors as one edit", () => {
    expect(osaDistance("pfiezr", "pfizer", 2)).toBe(1);
    expect(osaDistance("tiva", "teva", 1)).toBe(1);
    expect(osaDistance("abcd", "abdc", 1)).toBe(1);
    expect(osaDistance("short", "much longer", 2)).toBe(3);
  });
});

describe("matchLabelers", () => {
  // The plan's table, on real names.
  it.each([
    ["pfeizer", "Pfizer Laboratories Div Pfizer Inc"],
    ["pfiser", "Pfizer Laboratories Div Pfizer Inc"],
    ["glaxo smith kline", "GlaxoSmithKline LLC"],
    ["astrazenica", "AstraZeneca Pharmaceuticals LP"],
    ["jansen", "Janssen Pharmaceuticals, Inc."],
    ["merk", "Merck Sharp & Dohme LLC"],
    ["abvie", "AbbVie Inc."],
    ["eli lily", "Eli Lilly and Company"],
    ["tiva", "Teva Pharmaceuticals USA, Inc."],
    ["novo nordisc", "Novo Nordisk"],
    ["sandos", "Sandoz Inc"],
    ["squib", "E.R. Squibb & Sons, L.L.C."],
  ])("finds %s as %s first", (term, expected) => {
    expect(names(term)[0]).toBe(expected);
  });

  it("offers the other Pfizer labelers after Pfizer for a misspelling", () => {
    expect(names("pfeizer").slice(0, 3)).toEqual([
      "Pfizer Laboratories Div Pfizer Inc", "Wyeth Pharmaceuticals LLC, a subsidiary of Pfizer Inc.", "Parke-Davis Div of Pfizer Inc",
    ]);
  });

  it("ranks a spelling's start, then a word's start, then text inside, then fuzzy", () => {
    const { matches } = matchLabelers(index, "sun pharma", RX_PRICED);
    expect(matches[0]).toMatchObject({ tier: 1, group: { name: "Sun Pharmaceutical Industries, Inc." } });
    // Fosun holds "sun pharma" inside a word, not at a word's start.
    expect(matches.find(match => match.group.name === "Fosun Pharma USA Inc.")?.tier).toBe(3);
    const pfizer = matchLabelers(index, "pfizer", RX_PRICED).matches;
    expect(pfizer.map(match => match.tier)).toEqual([...pfizer.map(match => match.tier)].sort());
    expect(pfizer.find(match => match.group.name.startsWith("Wyeth"))?.tier).toBe(2);
    expect(matchLabelers(index, "pfeizer", RX_PRICED).matches.every(match => match.tier === 4)).toBe(true);
  });

  it("doesn't take fosun for a word starting with sun", () => {
    const fosun = matchLabelers(index, "sun", RX_PRICED).matches.find(match => match.group.name.startsWith("Fosun"));
    expect(fosun?.tier).toBe(3);
  });

  it("ranks a whole-word fuzzy match above a fuzzy prefix", () => {
    const merk = matchLabelers(index, "merk", EVERY).matches;
    expect(merk[0].group.name).toBe("Merck Sharp & Dohme LLC");
    // "Mark" is a prefix of "Marketing" one edit away: half a point more.
    const marketing = merk.find(match => match.group.name === "Chain Drug Marketing Association");
    expect(marketing?.cost).toBe(1.5);
    expect(merk[0].cost).toBe(1);
  });

  it("says whether a word starts with the term, for the hint", () => {
    expect(matchLabelers(index, "pfizer", RX_PRICED).wordStart).toBe(true);
    expect(matchLabelers(index, "shire", RX_PRICED).wordStart).toBe(false);
    expect(matchLabelers(index, "pfeizer", RX_PRICED).wordStart).toBe(false);
    expect(names("shire")).toContain("Wilshire Pharmaceuticals, Inc.");
    expect(names("bristol")).toEqual([]);
  });

  it("offers what the Include boxes would show", () => {
    // Rexall's products are OTC, and some of them aren't priced.
    expect(names("rexall")).toEqual([]);
    expect(names("rexall", { includeOtc: true, includeWithoutPrices: false })).toEqual([]);
    expect(names("rexall", EVERY)).toEqual(["Rexall Sundown, LLC", "Dolgencorp, Inc. (DOLLAR GENERAL & REXALL)"]);
    // GlaxoSmithKline Biologicals is Rx without prices.
    expect(names("glaxosmithkline")).toEqual(["GlaxoSmithKline LLC"]);
    expect(names("glaxosmithkline", { includeOtc: false, includeWithoutPrices: true })).toEqual(["GlaxoSmithKline LLC", "GlaxoSmithKline Biologicals SA"]);
    // Chain Drug Marketing is priced, all OTC.
    expect(names("chain drug", { includeOtc: true, includeWithoutPrices: false })).toEqual(["Chain Drug Marketing Association"]);
    expect(names("chain drug")).toEqual([]);
  });

  it("names the spelling that matched when it isn't the labeler's name", () => {
    const rexall = matchLabelers(index, "rexall", EVERY).matches;
    expect(rexall.find(match => match.group.name.startsWith("Dolgencorp"))?.listedAs).toBeNull();
    const taro = matchLabelers(index, "taro", RX_PRICED).matches[0];
    expect(taro).toMatchObject({ group: { name: "Sun Pharmaceutical Industries, Inc." }, listedAs: "TARO PHARMACEUTICALS U.S.A., INC." });
    expect(matchLabelers(index, "sun pharma", RX_PRICED).matches[0].listedAs).toBeNull();
  });

  it("needs two characters", () => {
    expect(names("s")).toEqual([]);
    expect(names("  ")).toEqual([]);
    expect(names("a.")).toEqual([]);
  });

  it("cuts at the limit after sorting, keeping the larger labeler on a tie", () => {
    const group = (name: string, productCount: number): LabelerGroup => ({
      name, codes: [String(10000 + productCount)], spellings: [], productCount, hasRx: true, hasPrices: true, hasRxPrices: true,
    });
    // 21 groups in tier 1 at the same cost; the 21st by name has the most products.
    const groups = Array.from({ length: 21 }, (_, i) => group(`Acme ${String(i).padStart(2, "0")}`, i === 20 ? 50 : 10 - i % 2));
    const { matches } = matchLabelers(buildLabelerIndex(groups), "acme", RX_PRICED);
    expect(matches).toHaveLength(MAX_LABELER_MATCHES);
    expect(matches[0].group.name).toBe("Acme 20");
    expect(matches.map(match => match.group.name)).not.toContain("Acme 19");
  });
});

describe("labeler codes", () => {
  const picks = [{ name: "A", codes: ["0013", "0025"] }, { name: "B", codes: ["0025", "0008"] }];
  it("counts a code shared by two picks once", () => {
    expect(labelerCodeCount(picks)).toBe(3);
  });
  it("sends them distinct and sorted, whatever order they were picked in", () => {
    expect(labelerCodes(picks)).toEqual(["0008", "0013", "0025"]);
    expect(labelerCodes([...picks].reverse())).toEqual(["0008", "0013", "0025"]);
  });
});
