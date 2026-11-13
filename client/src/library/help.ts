export const HELP_TOPICS = [
  {
    "id": "welcome",
    "title": "Welcome",
    "group": "Start here",
    "keywords": "welcome",
    "related": [
      "what-the-prices-mean",
      "which-search-to-use"
    ]
  },
  {
    "id": "what-the-prices-mean",
    "title": "What the prices mean",
    "group": "Start here",
    "keywords": "what the prices mean",
    "related": [
      "ndcs-products-and-packages",
      "five-ways-a-price-can-mislead",
      "sources-and-disclaimer"
    ]
  },
  {
    "id": "nadac",
    "title": "NADAC",
    "group": "The data",
    "keywords": "nadac",
    "related": [
      "the-fda-directory",
      "ndcs-products-and-packages",
      "how-the-two-fit-together"
    ]
  },
  {
    "id": "the-fda-directory",
    "title": "The FDA directory",
    "group": "The data",
    "keywords": "the fda directory",
    "related": [
      "nadac",
      "ndcs-products-and-packages",
      "how-the-two-fit-together"
    ]
  },
  {
    "id": "ndcs-products-and-packages",
    "title": "NDCs, products and packages",
    "group": "The data",
    "keywords": "ndcs, products and packages",
    "related": [
      "nadac",
      "the-fda-directory",
      "how-the-two-fit-together"
    ]
  },
  {
    "id": "how-the-two-fit-together",
    "title": "How the two fit together",
    "group": "The data",
    "keywords": "how the two fit together",
    "related": [
      "nadac",
      "the-fda-directory",
      "ndcs-products-and-packages"
    ]
  },
  {
    "id": "how-current-it-is",
    "title": "How current it is",
    "group": "The data",
    "keywords": "how current it is",
    "related": [
      "nadac",
      "the-fda-directory",
      "ndcs-products-and-packages"
    ]
  },
  {
    "id": "which-search-to-use",
    "title": "Which search to use",
    "group": "Using the app",
    "keywords": "which search to use",
    "related": [
      "searching",
      "dates",
      "filters-and-hidden-results"
    ]
  },
  {
    "id": "searching",
    "title": "Searching",
    "group": "Using the app",
    "keywords": "searching",
    "related": [
      "which-search-to-use",
      "dates",
      "filters-and-hidden-results"
    ]
  },
  {
    "id": "dates",
    "title": "Dates",
    "group": "Using the app",
    "keywords": "dates",
    "related": [
      "which-search-to-use",
      "searching",
      "filters-and-hidden-results"
    ]
  },
  {
    "id": "filters-and-hidden-results",
    "title": "Filters and hidden results",
    "group": "Using the app",
    "keywords": "filters hidden missing empty otc sample include",
    "related": [
      "searching",
      "dates",
      "troubleshooting"
    ]
  },
  {
    "id": "the-results-table",
    "title": "The results table",
    "group": "Using the app",
    "keywords": "table latest price mixed units product package",
    "related": [
      "which-search-to-use",
      "searching",
      "dates"
    ]
  },
  {
    "id": "charts",
    "title": "Charts",
    "group": "Using the app",
    "keywords": "charts line bar shaded band range readout legend csv",
    "related": [
      "the-results-table",
      "pinning-and-comparing",
      "keyboard-and-screen-readers"
    ]
  },
  {
    "id": "price-changes",
    "title": "Price changes",
    "group": "Using the app",
    "keywords": "price changes",
    "related": [
      "which-search-to-use",
      "searching",
      "dates"
    ]
  },
  {
    "id": "pinning-and-comparing",
    "title": "Pinning and comparing",
    "group": "Using the app",
    "keywords": "pinning and comparing",
    "related": [
      "which-search-to-use",
      "searching",
      "dates"
    ]
  },
  {
    "id": "tabs-and-your-saved-workspace",
    "title": "Tabs and your saved workspace",
    "group": "Using the app",
    "keywords": "tabs and your saved workspace",
    "related": [
      "which-search-to-use",
      "searching",
      "dates"
    ]
  },
  {
    "id": "settings",
    "title": "Settings",
    "group": "Using the app",
    "keywords": "settings",
    "related": [
      "which-search-to-use",
      "searching",
      "dates"
    ]
  },
  {
    "id": "keyboard-and-screen-readers",
    "title": "Keyboard and screen readers",
    "group": "Using the app",
    "keywords": "keyboard and screen readers",
    "related": [
      "which-search-to-use",
      "searching",
      "dates"
    ]
  },
  {
    "id": "five-ways-a-price-can-mislead",
    "title": "Five ways a price can mislead",
    "group": "Reading prices carefully",
    "keywords": "five ways a price can mislead",
    "related": [
      "things-to-try"
    ]
  },
  {
    "id": "things-to-try",
    "title": "Things to try",
    "group": "Reading prices carefully",
    "keywords": "things to try",
    "related": [
      "five-ways-a-price-can-mislead"
    ]
  },
  {
    "id": "glossary",
    "title": "Glossary",
    "group": "Reference",
    "keywords": "glossary",
    "related": [
      "troubleshooting",
      "sources-and-disclaimer"
    ]
  },
  {
    "id": "troubleshooting",
    "title": "Troubleshooting",
    "group": "Reference",
    "keywords": "troubleshooting",
    "related": [
      "glossary",
      "sources-and-disclaimer"
    ]
  },
  {
    "id": "sources-and-disclaimer",
    "title": "Sources and disclaimer",
    "group": "Reference",
    "keywords": "sources and disclaimer",
    "related": [
      "glossary",
      "troubleshooting"
    ]
  }
] as const;

export type HelpTopicId = typeof HELP_TOPICS[number]["id"];
export type HelpTopic = typeof HELP_TOPICS[number];
export const HELP_GROUPS = [...new Set(HELP_TOPICS.map(topic => topic.group))];
export function findHelpTopic(id: string | undefined) {
  return HELP_TOPICS.find(topic => topic.id === id);
}
export function filterHelpTopics(query: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return HELP_TOPICS.filter(topic => words.every(word =>
    `${topic.title} ${topic.group} ${topic.keywords}`.toLowerCase().includes(word)));
}
