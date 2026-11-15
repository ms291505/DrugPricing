// The Help catalog, in index order. Each `id` is a URL (`/help/<id>`) and the name of its article
// in `content/help/`, so it must survive title edits. `keywords` add words the title doesn't
// have (the filter also searches the title and group); `related` are a topic's real neighbours,
// listed under its article.
const TOPICS = [
  { id: "welcome", title: "Welcome", group: "Start here", related: ["what-the-prices-mean", "which-search-to-use"] },
  { id: "what-the-prices-mean", title: "What the prices mean", group: "Start here", keywords: "unit per each ml gram patient cost", related: ["ndcs-products-and-packages", "five-ways-a-price-can-mislead", "sources-and-disclaimer"] },
  { id: "nadac", title: "NADAC", group: "The data", keywords: "cms survey", related: ["the-fda-directory", "how-the-two-fit-together", "how-current-it-is"] },
  { id: "the-fda-directory", title: "The FDA directory", group: "The data", related: ["nadac", "how-the-two-fit-together"] },
  { id: "ndcs-products-and-packages", title: "NDCs, products and packages", group: "The data", keywords: "labeler code format dashes", related: ["the-results-table", "the-fda-directory"] },
  { id: "how-the-two-fit-together", title: "How the two fit together", group: "The data", keywords: "match missing", related: ["which-search-to-use", "filters-and-hidden-results"] },
  { id: "how-current-it-is", title: "How current it is", group: "The data", keywords: "weekly updated latest", related: ["dates", "nadac"] },
  { id: "which-search-to-use", title: "Which search to use", group: "Using the app", keywords: "fda nadac brand generic", related: ["searching", "how-the-two-fit-together"] },
  { id: "searching", title: "Searching", group: "Using the app", related: ["which-search-to-use", "filters-and-hidden-results", "troubleshooting"] },
  { id: "dates", title: "Dates", group: "Using the app", related: ["pinning-and-comparing", "how-current-it-is"] },
  { id: "filters-and-hidden-results", title: "Filters and hidden results", group: "Using the app", keywords: "missing empty otc sample include", related: ["searching", "dates", "troubleshooting"] },
  { id: "the-results-table", title: "The results table", group: "Using the app", keywords: "latest price mixed units product package", related: ["what-the-prices-mean", "ndcs-products-and-packages", "charts"] },
  { id: "charts", title: "Charts", group: "Using the app", keywords: "line bar shaded band range readout legend csv", related: ["the-results-table", "pinning-and-comparing", "keyboard-and-screen-readers"] },
  { id: "price-changes", title: "Price changes", group: "Using the app", keywords: "flag drop rise", related: ["five-ways-a-price-can-mislead", "dates", "charts"] },
  { id: "pinning-and-comparing", title: "Pinning and comparing", group: "Using the app", keywords: "pin snapshot match scale", related: ["charts", "tabs-and-your-saved-workspace"] },
  { id: "tabs-and-your-saved-workspace", title: "Tabs and your saved workspace", group: "Using the app", keywords: "storage browser clear", related: ["pinning-and-comparing", "troubleshooting"] },
  { id: "settings", title: "Settings", group: "Using the app", keywords: "theme dark light", related: ["charts"] },
  { id: "keyboard-and-screen-readers", title: "Keyboard and screen readers", group: "Using the app", keywords: "accessibility", related: ["charts"] },
  { id: "five-ways-a-price-can-mislead", title: "Five ways a price can mislead", group: "Reading prices carefully", related: ["things-to-try", "what-the-prices-mean"] },
  { id: "things-to-try", title: "Things to try", group: "Reading prices carefully", keywords: "examples", related: ["five-ways-a-price-can-mislead", "which-search-to-use"] },
  { id: "glossary", title: "Glossary", group: "Reference", keywords: "terms definitions", related: ["ndcs-products-and-packages", "what-the-prices-mean"] },
  { id: "troubleshooting", title: "Troubleshooting", group: "Reference", keywords: "problem no results slow reload", related: ["searching", "filters-and-hidden-results", "how-the-two-fit-together"] },
  { id: "sources-and-disclaimer", title: "Sources and disclaimer", group: "Reference", keywords: "cms fda advice", related: ["nadac", "the-fda-directory"] },
] as const;

export type HelpTopicId = typeof TOPICS[number]["id"];

type HelpIndexEntry = { title: string, group: string, keywords?: string };
export type HelpTopic = HelpIndexEntry & { id: HelpTopicId, related: readonly HelpTopicId[] };

/** Typed here, so a `related` id that isn't a topic fails to compile. */
export const HELP_TOPICS: readonly HelpTopic[] = TOPICS;
export const HELP_GROUPS = [...new Set(HELP_TOPICS.map(topic => topic.group))];

/** Index entries for pages outside Help, listed in their group after its topics. */
export const HELP_PAGE_LINKS: readonly (HelpIndexEntry & { to: string })[] = [
  { title: "About this project", group: "Start here", keywords: "author portfolio", to: "/about" },
];

export function findHelpTopic(id: string | undefined) {
  return HELP_TOPICS.find(topic => topic.id === id);
}

const matching = <T extends HelpIndexEntry>(entries: readonly T[], query: string) => {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return entries.filter(entry => words.every(word =>
    `${entry.title} ${entry.group} ${entry.keywords ?? ""}`.toLowerCase().includes(word)));
};

export const filterHelpTopics = (query: string) => matching(HELP_TOPICS, query);
export const filterHelpPageLinks = (query: string) => matching(HELP_PAGE_LINKS, query);
