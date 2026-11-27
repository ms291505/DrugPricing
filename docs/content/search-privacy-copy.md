# Search privacy copy

Draft copy for [Search privacy](../plans/search-privacy.md), change 3. It tells users what the
app saves, where, who can see it, and how to delete it, at the places they act. Help only
expands on it. Follows the [writing style guide](../README.md#writing-style).

"Saved for this browser tab only", not "until you close this browser tab": a browser that restores
a closed tab can restore its session state too, so the copy doesn't promise deletion.

Search terms reach the server with their dates; refine filters apply in the browser, so the copy
says "terms" (drawer) or "terms and dates" (Help, About), never "filters".

## New tab page, while the workspace is fresh

Shown in `text.secondary` above the tab choices while the workspace is a single blank tab.

> This workspace saves your tabs, searches, and pinned charts in this browser so they're here
> when you come back, and anyone who uses this browser can see them. To start over, use
> **Clear workspace** in the Workspace menu. If you use a private window, your browser clears
> your saved workspace when you close all private windows. [Learn more]

## Workspace menu, above Clear workspace

> This workspace's tabs, searches, and pinned charts are saved in this browser, where anyone who
> uses it can see them. Searches send their terms to the server, which doesn't keep them.
> [Learn more]

Tightened from the plan's wording to fit the 240px drawer; it keeps all three facts.

## Add search to workspace

Tooltip and accessible description (a `hidden` span the button's `aria-describedby` names) of the
button:

> Saves this search and its pins in this browser, in a new workspace tab.

Adding a tab opens the workspace and shows no confirmation, so there is no other message to
change.

## Search pages, beside Add search to workspace

Shown once a search has run:

> This search and its pins are saved for this browser tab only, unless you add the search to
> your workspace.

After Clear search, which keeps pins and hides the button, while there are pins:

> These pins are saved for this browser tab only.

## Help, "Tabs and your saved workspace"

Replaces the storage paragraph and the last line about Search pages. The storage paragraph
comes before the list about closing tabs and other windows, and the server paragraph after it.

> The app saves your workspace in this browser on this device: each tab's search terms, dates,
> and filters, and your pinned charts and their prices. Anyone who uses this browser profile can
> see them, because the app reopens your tabs when you come back. To delete them, close a tab,
> use **Clear workspace** in the Workspace menu, or clear this site's data in your browser. If
> you use a private window, your browser clears your saved workspace when you close all private
> windows.
>
> Each search sends its terms and dates to the server, which uses them to find prices and
> doesn't keep them.
>
> The FDA and NADAC pages under **Search** save their search and shared pins for this browser
> tab only. To keep a search longer, add it to the workspace.

## Help, "Searching"

> - The FDA and NADAC pages under **Search** save your search and its pins for this browser tab
>   only, unless you choose **Add search to workspace**.

## About, "Privacy"

> DrugPricing has no accounts. Your workspace, with its tabs, searches, and pinned charts, is
> saved in this browser on this device, along with your settings, while a search on the FDA or
> NADAC page under Search is saved for this browser tab only. Each search sends its
> terms and dates to the server only to find prices, and the server doesn't keep them.
> [Tabs and your saved workspace] explains what's saved and how to delete it.
