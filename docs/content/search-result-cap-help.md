# Help copy: searches that match too many results

Draft for the `searching` Help article ([client/src/content/help/searching.md](../../client/src/content/help/searching.md)),
from [the search result cap plan](../plans/search-result-cap.md). The number follows
`SearchLimits.MaxRows`; if the near-limit check lowers the cap, change it here and in the article.

> - A search that matches more than 200,000 results shows a message above the results instead
>   of a table, because that many are too many to show. In NADAC each price counts as a result.
>   In FDA each package counts too, along with its prices, so an FDA search can reach the limit
>   with fewer than 200,000 prices. Use a more specific name or description, for example
>   `metformin` instead of `tablet`, or shorten the **Dates**.

Notes:

- It sits after the bullet about searches with no matches, since both say what to do when a
  search doesn't show results.
- "results" matches the server's message. The server counts NADAC price rows, plus packages for
  an FDA search, so the article says how each page counts.
