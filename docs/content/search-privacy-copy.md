# Search privacy copy

Copy for [Search privacy](../plans/search-privacy.md), change 3. It tells users what the app
saves, where, who can see it, and how to delete it. The drawer gives a short line and links to
Help, which explains the rest. Follows the [writing style guide](../README.md#writing-style).

Standalone Search state "stays in this browser tab", not "until you close this browser tab": a
browser that restores a closed tab can restore its session state too, so the copy doesn't
promise deletion. Workspace copy doesn't promise storage either: Help names private windows and
cleared site data as the ways a workspace goes away.

Search terms reach the server with their dates; refine filters apply in the browser, so the copy
says "terms and dates" (Help, About), never "filters".

Say "workspace tab" or "browser tab" wherever someone could act on the wrong one: closing,
reloading, opening Help elsewhere, and keeping a Search page's state. "Workspace" is capitalized
only as the name of the destination (the app bar's **Workspace**, the Workspace menu).

Account-free use is a benefit stated plainly: no sign-up and no personal information. Don't
write "nothing is stored"; the workspace is in the browser and searches reach the server.

## Workspace menu, above Clear workspace

Under 20 words, then a link that opens Help at "What's saved and who can see it":

> Your workspace is saved in this browser so it's here when you come back. [What's saved and
> who can see it]

The blank workspace tab's search chooser has no storage note (removed 2026-11-27).

## Add search to workspace

Tooltip and accessible description (a `hidden` span the button's `aria-describedby` names) of the
button:

> Saves this search and its pins in this browser, in a new workspace tab.

Adding a tab opens the workspace and shows no confirmation. The caption that used to sit beside
the button, and its pins-only variant after Clear search, were removed on 2026-11-27; Help covers
it.

## Help, "Workspace tabs and what they save"

Topic ID `tabs-and-your-saved-workspace`. The article in
`client/src/content/help/tabs-and-your-saved-workspace.md` is the current copy. Its sections:

- **What's saved and who can see it**: no account, what the workspace holds, who can see it,
  private windows, and that the server doesn't keep search terms and dates. The drawer links here,
  so renaming the heading breaks that link (`helpSectionId`).
- **Closing tabs and clearing the workspace**: "Closing a workspace tab deletes its search and
  pins. If you close the browser tab, your workspace will still be here when you return in the
  same browser profile, unless you used a private window or cleared this site's data in your
  browser."
- **Keeping a search from the Search pages**: "Under **Search**, your searches and shared pins stay in this
  browser tab. To keep a copy between visits, choose **Add search to workspace**…"

## Help, "Searching"

> - Under **Search**, your searches and shared pins stay in this browser tab. To keep a copy
>   between visits, choose **Add search to workspace**, which opens it in a new workspace tab.

## About, "Privacy"

> You can use DrugPricing without signing up or giving any personal information. Your
> workspace, with its tabs, searches, and pinned charts, is saved in this browser on this device
> along with your settings, while a search on the FDA or NADAC page under Search stays in this
> browser tab. Each search sends its terms and dates to the server only to find prices, and the
> server doesn't keep them. [Workspace tabs and what they save] explains what's saved and how to
> delete it.
