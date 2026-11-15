# Welcome page content

Started 2026-11-13. Draft copy for the app's home page at `/welcome`, decided in
[the usability plan](../plans/browser-usability.md) (Stage 1, "Welcome"). Nothing here is
built: today `/welcome` shows the onboarding text (`OnBoarding`) and nothing links to it.

This is the home page, not a help page. It is shown at the bare site address on a first
visit, and the app name in the bar leads back to it. The help content has its own
[Welcome page](help.md) inside Help; the two should agree on the opening sentence and can
otherwise differ, since this one has buttons and that one has more to read.

It follows [help.md](help.md)'s conventions: **Draft** text is written for the user,
**Check** lines are facts to confirm before it ships, and button and field names are written
as the UI shows them.

## The page

**Purpose:** say what the app is in one sentence, get a visitor into Search or the Workspace
in one click, and name the few ideas that aren't obvious. Readers are assumed to know what
NADAC is; the page doesn't explain it, but links to the explanation.

**Draft:**

> # DrugPricing
>
> What US pharmacies pay for drugs, week by week since January 2022. Search for a drug, chart
> its price history, and pin charts side by side to compare.
>
> **[Find a drug]**   **[Open workspace]**
>
> **Products and packages.** A product is one drug at one strength and form. Its packages are
> the bottle and box sizes it comes in. FDA search can show either.
> [More about products and packages]
>
> **Prices are per unit.** Per tablet, millilitre or gram, never per package, and they are
> what a pharmacy pays its supplier, not what a patient pays. [What the prices mean]
>
> **Pin a chart to keep it.** Charts on a search page follow the search. Pin one and it stays
> as it is, so you can compare it with the next search. [Pinning and comparing]
>
> **Two ways to search.** FDA search finds drugs by brand or generic name. NADAC search looks
> through the prices themselves and covers drugs the FDA directory doesn't list. If one
> doesn't find it, try the other. [Which search to use]
>
> [What is NADAC?] · [About this project]

**Where each control goes:**

| Control | Goes to |
| --- | --- |
| Find a drug | Search, on the last source used, or FDA |
| Open workspace | Workspace |
| More about products and packages | Help: NDCs, products and packages |
| What the prices mean | Help: What the prices mean |
| Pinning and comparing | Help: Pinning and comparing |
| Which search to use | Help: Which search to use |
| What is NADAC? | Help: NADAC |
| About this project | `/about` |

**Notes for the author:**

- The plan agreed three idea lines. "Two ways to search" is a fourth, added because the
  default source is now FDA and NADAC holds prices FDA search can't show (about 15% of
  packages priced in the last year). Drop it if the page should stay at three; the FDA empty
  state's offer of NADAC covers the same ground at the moment it matters.
- The opening sentence is also what a portfolio visitor reads first, so it says what the
  thing is before it says how to use it.
- No search box on this page, by decision: the two buttons are the actions.

**Check:**

- "since January 2022": the loaded data starts 2022-01-05. Reword if older data is loaded.
- Help topic IDs, confirmed against `client/src/library/help.ts`: More about products and
  packages → `ndcs-products-and-packages`, What the prices mean → `what-the-prices-mean`,
  Pinning and comparing → `pinning-and-comparing`, Which search to use →
  `which-search-to-use`, What is NADAC? → `nadac`. Open them with `openHelp(id)`.
- "Pin one and it stays as it is" must still be true after Stage 3 of the usability plan
  (selected rows pin directly; Compare cards are live until pinned).

**Source:** `OnBoarding.tsx`, `About.tsx`, the Welcome and "Which search to use" pages of
[help.md](help.md), and the usability plan's Stage 1 decisions.
