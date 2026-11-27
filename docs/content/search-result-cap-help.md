# Help copy: searches that match too many prices

Draft for the `searching` Help article ([client/src/content/help/searching.md](../../client/src/content/help/searching.md)),
from [the search result cap plan](../plans/search-result-cap.md). The number follows
`SearchLimits.MaxRows`; if the near-limit check lowers the cap, change it here and in the article.

> - A search that matches more than 200,000 prices shows a message above the results instead
>   of a table, because that many prices are too many to show. Use a more specific name or
>   description, for example `metformin` instead of `tablet`, or shorten the **Dates**.

Notes:

- It sits after the bullet about searches with no matches, since both say what to do when a
  search doesn't show results.
- "prices" matches the server's message, which counts NADAC price rows (and, for FDA, packages).
  Readers think in prices, so the article doesn't mention packages.
