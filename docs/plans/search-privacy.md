# Search privacy

## Context

A drug search can reveal a health condition. Someone who sees a search for an HIV,
psychiatric, or fertility drug learns something about the person who ran it, even though the
prices themselves are public. The app has no accounts and stores nothing about a user on the
server, so the exposure comes from two places: what the browser keeps, and what the server and
the network path record.

What's true today:

- **Everything the client saves is in `localStorage`** (`library/persist.ts`), unencrypted,
  and kept until the user clears it: the workspace, each tab's criteria and pins, Settings, the
  last Search source, and the standalone Search pages' criteria (`page-fda`, `page-nadac`) and
  shared pins (`search-pins`). Anyone who uses the same browser profile can read it, and the
  app itself reopens the searches on load, so they don't need DevTools to see them.
- **The standalone Search pages persist like the workspace does,** although nothing tells the
  user so except the last line of the "Tabs and your saved workspace" Help article. A person who
  runs one search on a shared computer leaves it for the next person.
- **The FDA search endpoint prints every search.** `GetWithAdvancedSearch`
  (`server/Endpoints/FdaProductEndpoints.cs:45` and `:49`) calls `Console.WriteLine` on the
  request, so the `drugpricing` service's stdout, and so the systemd journal on the Pi, probably
  holds every FDA search term. This is the only exposure that covers every visitor.
- **Search terms travel in URLs.** `nadac-prices/search?ndcDescription=…` and
  `fda-products/advanced-search?jsonString=…` are GETs. Cloudflare's tunnel terminates TLS and
  sees full URLs, and any access log, tracing, or error reporting added later records them by
  default. ASP.NET's own request lines are Information level and `Microsoft.AspNetCore` is at
  Warning in `appsettings.json`, so Kestrel doesn't log them today.
- **The client logs every request URL** to the browser console (`console.log(apiPath)` in
  `api/api.ts:14`, already a known rough edge).
- Route URLs don't carry search terms, so browser history doesn't show them.

Encryption in the browser doesn't help: without accounts, the key would sit in the same browser
as the data.

## Decisions

- **Search is for the session; Workspace is for keeping.** The standalone Search pages save
  their criteria and shared pins in `sessionStorage`, so a reload or Back still restores them,
  and closing the browser tab discards them. The workspace stays in `localStorage`, because
  keeping tabs between visits is what it's for, unless the user chooses otherwise (below). **Add
  search to workspace** is how a user keeps a Search page's work past the browser tab, when the
  workspace is kept on this device, and its pins come along as they do today.
- **The workspace says what it saves.** The user should know, before and after adding a tab,
  that the workspace keeps search terms and pinned prices in this browser, that anyone who uses
  this browser can see them, and how to delete them.
- **A new workspace asks where to keep it.** When a workspace starts fresh, the user chooses
  between keeping it on this device (`localStorage`, the default) and keeping it only until the
  browser tab closes (`sessionStorage`). The question is a checkbox, "Keep this workspace on this
  device", checked by default. Its wording says the saved tabs and pins stay in this browser, and
  separately that searches send their terms to the server only to find prices. It isn't a dialog: keeping the default is a valid answer, and a dialog
  would block every first visit. The same checkbox stays in the workspace drawer, so the choice
  can be changed later.
- **The server never records a search term.** Not in stdout, logs, traces, or error reports. A
  future feature that needs search counts ("Popular searches" in `docs/future-work.md`) records
  counts without the requester's IP and needs its own decision.
- **Search terms move out of URLs.** The two searches the client calls become POSTs with a JSON
  body.
- Settings and the last Search source (`fda` or `nadac`) stay in `localStorage`: they reveal
  nothing about what anyone searched for.

## Changes

### 1. Stop the server printing searches

Do this first, on its own: it is two deleted lines and closes the widest exposure.

- Delete both `Console.WriteLine` calls in `FdaProductEndpoints.GetWithAdvancedSearch`.
- Check the rest of `server/` for anything that writes a request, query, or term
  (`Console.Write*`, `ILogger` calls with the request). Nothing else turned up in a quick
  search, but check the services and repositories too.
- On the Pi, check what the journal already holds (`journalctl -u drugpricing`) and rotate or
  vacuum it (`journalctl --vacuum-time=…`) once the fix is deployed. That's the author's step;
  it needs the Pi.
- Check `cloudflared`'s log level on the Pi. At `info` it doesn't log each request, but `debug`
  does.

### 2. Standalone Search state in `sessionStorage`

In `library/persist.ts`:

- Give `read`, `write`, and `remove` a storage argument (default `localStorage`) and add a small
  wrapper for session keys. Route `SEARCH_PINS_KEY` and the two `STANDALONE_TAB_IDS` tab keys
  through `sessionStorage`. Keep the key names, so `loadSearchPins`, `saveSearchPins`, and
  `saveStandaloneSearch` keep their signatures and `StandaloneSearchProviders.tsx` doesn't
  change.
- Session writes ignore `readOnly`. `sessionStorage` belongs to one browser tab and fires no
  `storage` event in other windows, so another window can't conflict with it.
  `watchOtherWindows` already ignores events outside `localStorage`.
- The failed-write toast says "workspace" today. Keep that wording for workspace keys and give
  session keys their own ("Couldn't save this search in this tab: browser storage is full or
  unavailable."), each warned once.
- **Migration.** Before `pruneStoredState` runs, migrate the `page-fda`, `page-nadac`, and
  `search-pins` values in `localStorage` one key at a time. When this tab's session key is empty,
  write the legacy value to `sessionStorage`. Delete the legacy key only after that write
  succeeds, or when this tab already holds a valid session copy. If the write fails, leave the
  legacy key for a later load to retry. Only the migration deletes legacy standalone keys:
  `pruneStoredState` keeps exempting `STANDALONE_TAB_IDS` and `search-pins`, so a key whose
  migration failed is never pruned. The legacy per-source pin merge in `loadSearchPins` reads
  from `sessionStorage` after the move and otherwise stays as it is. No `VERSION` bump: nothing is
  misread.

  This means an existing user's Search pins last only until they close that browser tab. That's
  acceptable for a project with few users. If it isn't, the alternative is to turn legacy
  Search state with pins into a workspace tab through `addSearchTab`, which is more code for a
  one-time step.
- Behavior to know: duplicating a browser tab copies its `sessionStorage`, and a link opened in
  a new tab starts empty. Each browser tab has its own Search state, which matches the "for
  this session" rule.

Tests (`persist.test.ts`): stub `sessionStorage` with the same `memoryStorage()` helper. Cover
Search state going to `sessionStorage` and never to `localStorage`; the migration moving and
deleting legacy keys, and not overwriting existing session values; a failed session write
keeping the legacy key, which a later load then migrates; a valid session copy letting the
legacy key go without a write; `pruneStoredState` keeping legacy standalone keys; session writes
while `readOnly`; and the workspace and Settings still going to `localStorage`.

### 3. Workspace storage choice

**A fresh workspace** is one that starts with nothing saved: a first visit, a browser whose
site data was cleared, a new browser tab when the workspace was kept only for the session, and
the blank workspace that **Clear workspace** leaves.

**Storing the choice.** Add `WorkspaceStorage = "device" | "session"` to `persist.ts`, and route
the workspace key and every `.tab.<tabId>` key through the chosen storage. At startup
(`initWorkspace`):

- A valid workspace in this tab's `sessionStorage` means `"session"`. It's checked first
  because `sessionStorage` belongs to this browser tab alone: another tab may have saved a device
  workspace since this one chose session, and that mustn't take this tab's workspace's place.
  Unchecking the box saves the workspace to `sessionStorage` right away, blank tab or not, so a
  reload keeps the choice.
- Otherwise, a workspace in `localStorage` means `"device"`.
- Otherwise the workspace is fresh, and it starts as `"device"`.

Startup never deletes a workspace record from either storage. Pruning works on one storage at a
time, against that storage's own workspace record. A `"session"` tab prunes only
`sessionStorage`, so it leaves the device workspace and its tabs alone. A `"device"` tab prunes
`localStorage`.

The mode is a property of the workspace, not of the app: add an optional `storage` field to
`PersistedWorkspace` (default `"device"`, so no `VERSION` bump) and keep no separate app-wide
key for it. Keep it in the workspace state in `WorkspaceContext`, and expose it with a setter
through `useWorkspaceActions` (stable) and a narrow read hook. Only the checkbox and the drawer
caption read it, so a change doesn't re-render tabs.

**Changing it** moves the data, in an order that's safe to reload at any point. Startup finds a
workspace only through its record, so the destination record is what makes the move take effect:

0. Write a move marker to this tab's `sessionStorage` (`workspace-move`), recording:
   - the direction;
   - the ids of the tabs being moved;
   - a fingerprint of each source key, meaning the workspace record and each tab key (a short
     synchronous hash of its stored string);
   - the fingerprint of the destination record this move will write.

   Both directions involve this tab's `sessionStorage`, so the marker always has somewhere to go
   that no other tab writes to. If the marker can't be written, the move doesn't start.
1. Write each of the workspace's tab keys to the destination.
2. Write the destination workspace record, only once every tab write has succeeded.
3. Delete the source workspace record first, then the source tab keys, then the marker. When the
   source is the device workspace, delete only the keys whose fingerprints still match the
   marker's. If the device record itself has changed, another window has worked on it since:
   leave the record and every tab key it lists.

If step 1 or 2 fails, remove the destination tab keys this move wrote (never keys that were
there before it), leave the source untouched, keep the current mode, delete the marker, and warn
with the failed-write toast.

**Finishing an interrupted move on reload.** A move can stop at any step: the tab closes, the
browser crashes, or storage fails. Startup checks for a marker before applying the
session-first rule, and decides from it whether the destination record was published:

- **Device to session:** published if this tab's session record exists, because only this tab
  writes it.
- **Session to device:** published if the device record lists every moved tab id. A device
  record changed by another window afterwards still counts.

If it was published, startup finishes step 3 under the same fingerprint rule. A different or
later-changed device workspace is never deleted. If it wasn't, startup rolls back: it deletes the
moved tab keys from the destination where no destination record lists them, and keeps the
source. Either way, startup then deletes the marker and applies the startup rule.

So the checkbox and the storage always agree after a reload. An unchecked box means no device copy
of this workspace remains, unless another window changed that copy, in which case that window's
work is kept. Leftover destination tab keys with no marker (from an older bug, or cleared
`sessionStorage`) aren't in any record, so that storage's next prune deletes them.

Unchecking deletes the device copy at once, and checking again moves it back, so neither
direction needs a confirmation.

**Checking the box when a device workspace already exists.** Another browser tab may have
saved one since this tab chose session. Replacing it would delete that tab's work, so the move
merges this workspace into it. The device workspace keeps its tabs, layout and panes. This
workspace's tabs are added after its tabs, and this window shows the merged workspace with
this tab's selected tab in its pane. Tab ids are unique, so the tab keys can't collide, and a
tab whose id the device workspace already lists is skipped. Once there
are multiple workspaces, this case becomes saving a second device workspace instead, and the
merge goes away.

- `watchOtherWindows` watches workspace keys only in `"device"` mode, since session keys can't
  conflict. Unchecking in one window deletes the shared keys, so another window open on the device
  workspace goes read-only and asks for a reload, as it does today for any other change. After
  the reload it starts fresh. That's correct, and it's rare.
- **Add search to workspace** writes the new tab's state to whichever storage the workspace uses.
  A failed save still opens no tab.
- **Clear workspace** deletes only the workspace on screen: its record and tab keys, in the
  storage it uses. A separate device workspace saved by another browser tab survives the clearing
  of a session workspace. The fresh workspace that replaces it starts as `"device"` (box
  checked), with one exception: when it was a session workspace and a device workspace exists,
  it stays `"session"` (box unchecked). A fresh device-mode workspace would save over the other
  tab's device workspace. Checking the box then merges, as above.

**Where it's asked.**

- **The new tab page** (`Components/TabCreator/TabCreator.tsx`) shows the checkbox while the
  workspace is fresh: one blank tab and no search run yet. Once a search runs, the checkbox
  leaves this page, and the drawer is where it's changed. Workspace tabs only, never on
  standalone Search.
- **The workspace drawer** (`Workspace/DrawerContent.tsx`) always shows it, above **Clear
  workspace**, with the caption from change 4 under it.

**Proposed wording** (draft in `docs/content/` with the rest of the copy):

- Label: "Keep this workspace on this device"
- Helper text, checked: "Your tabs, searches, and pinned charts are saved in this browser so
  they're here when you come back, and anyone who uses this browser can see them. Searches send
  their terms to the server to find prices, and the server doesn't keep them."
- Helper text, unchecked: "Your tabs, searches, and pinned charts are saved in this browser tab
  only and deleted when you close it. Searches send their terms to the server to find prices,
  and the server doesn't keep them."

"The server doesn't keep them" is true only once change 1 has shipped, which is why change 1
goes first.

Connect the helper text to the checkbox with `aria-describedby`. On narrow layouts the whole
row is a 44px target. A change announces nothing beyond the checkbox's own state.

Tests: the startup rule for each combination of stored keys, including a session workspace in
this tab and a different device workspace, where session wins and both survive startup and
pruning; a mode change moving every key and deleting the old copies only after a complete write;
a write that fails after some tab keys have been written, followed by a reload, which finds the
source workspace whole and the partial destination keys gone; a reload after each step of a
move in both directions, which finishes or rolls back and leaves the checkbox matching the
storage; a reload after an interrupted device-to-session move where another window changed the
device workspace in between, which keeps that workspace; checking the box with an existing
device workspace, which merges and loses no tab; Clear workspace on a device workspace, which
deletes it and resets the mode; Clear workspace on a session workspace while a separate device
workspace exists, which leaves the device workspace and its tabs intact and stays in session
mode; `watchOtherWindows` ignoring workspace
keys in `"session"` mode; `pruneStoredState` working against the storage in use.

**Leave room for multiple workspaces.** The app may later hold several workspaces. This plan
doesn't build that, but nothing in it should assume there is only one:

- The storage choice belongs to a workspace (the `storage` field above), so each future
  workspace can have its own, some kept on the device and some only for the session. Write the
  copy about "this workspace", never "your workspace" or "the app".
- Give the persistence functions that move or delete workspace data (the mode change, Clear
  workspace, pruning) the workspace's record and its tab ids as arguments, instead of having them
  read the single `WORKSPACE_KEY` themselves. A later change can then add a workspace id to the
  key without rewriting them.
- `pruneStoredState` keeps any tab id that some workspace still lists. Today that's one list;
  don't write it in a way that deletes tabs belonging to another workspace once there are more.
  Tab keys are already unique ids, so they don't need a workspace prefix.
- Clear workspace and the mode change act on one workspace's keys, never on everything under
  `drugpricing.`.
- "Fresh" means this workspace has nothing saved, not that the browser has no workspace at all.
  A later "new workspace" action then shows the same checkbox without any extra code.

### 4. Tell users what's saved and where

Draft the copy in `docs/content/` first and follow the writing style guide. Proposed wording:

- **Workspace drawer**: the storage checkbox's helper text (change 3) is the caption, with a
  "Learn more" link to the `tabs-and-your-saved-workspace` Help topic. Always shown, in
  `text.secondary`.
- **Add search to workspace**: give the button an accessible description and a tooltip that
  follow the mode: "Saves this search and its pins in this browser" on the device, or "…in
  this browser tab" for the session. If it shows a confirmation after adding a tab, use the
  same wording (check what it says today).
- **Search pages**: a one-line caption in the Search panel or near **Pinned**, "This search is
  kept until you close this browser tab. To keep it longer, add it to a workspace kept on this
  device." Pick the spot
  that's visible without being noisy on a phone. Without this, users who relied on Search
  restoring after a restart lose their work without warning.
- **Help, "Tabs and your saved workspace"**: rewrite the storage paragraph to say what's saved
  (search terms, dates, filters, and pinned charts and their prices), where (this browser on
  this device, or only this browser tab), who can see it (anyone using this browser profile),
  the **Keep this workspace on this device** choice and where to change it, and how to delete
  it (close a tab, **Clear workspace**, uncheck the box, clear this site's data, or use a
  private window). In a separate paragraph, say what the server gets: each search sends its
  terms, dates and filters to the server, which uses them to find prices and doesn't keep them.
  Replace the last line about Search pages with the session rule. Keep the topic ID.
- **Help, "Searching"**: one sentence on the Search pages keeping a search until the browser
  tab closes, and on adding it to a workspace kept on this device to keep it longer.
- **About**: a short "Privacy" section: no accounts, what the browser keeps and where, that
  searches send their terms to the server only to find prices and the server doesn't keep
  them, and a link to the Help topic.

### 5. Search terms out of URLs

- Change the two searches the client calls to POST with a JSON body:
  `nadac-prices/search` (a body with `ndcDescription`, `ndc`, `minDate`, `maxDate`) and
  `fda-products/advanced-search` (the `AdvancedFdaSearchRequest` as the body, which removes
  `jsonString` and the hand-rolled `JsonSerializer.Deserialize`). Keep the routes and validation
  the same otherwise.
- Coordinate with [Search result cap](search-result-cap.md), which changes the same endpoints. Land whichever is first and rebase the other; the
  POST change is mechanical.
- **No compatibility window.** The GET forms go in the same change. During the cutover a search
  can fail briefly, and a browser tab already open on the old client fails until it's refreshed.
  We accepted that given how little the app is used today. A push to `main` deploys the client
  and API together (`deploy.yml`), so ship them in one merge, then refresh and check both
  searches in production.
- CORS: the client already sends JSON, but a POST with `Content-Type: application/json` is a
  preflighted request. Check the production origins allow it (the CORS policy may need
  `AllowAnyMethod`/`AllowAnyHeader` or the explicit pair).
- React Query is unaffected (its keys are built from the criteria, not the URL). Nothing caches
  these responses over HTTP today, so POST costs nothing there.
- The unused `fda-products/search?proprietaryName=` GET still takes a term in its URL. Its fate
  is already an open item in `docs/future-work.md`; note the privacy reason there.

### 6. Client console logging

Remove `console.log(apiPath)` from `api/api.ts` and the rough-edge note in AGENTS.md. After
change 5 the URL no longer has the term, but the log is noise either way.

### 7. Guard the rule for later work

- AGENTS.md: add "Never record a search term on the server: not in stdout, logs, traces, or
  error reports" under the server gotchas, and a line under Persistence saying standalone Search
  state is in `sessionStorage` and the workspace goes to `localStorage` or `sessionStorage`,
  whichever the user chose (`WorkspaceStorage`).
- [Observability](observability.md): when the OpenTelemetry stack goes in, check that the
  ASP.NET instrumentation redacts `url.query` (recent versions do by default; set it
  explicitly) and that Npgsql spans don't record parameter values. After change 5 the terms are
  in request bodies, which the instrumentation doesn't record unless asked. GlitchTip, if added,
  must strip request bodies and breadcrumbs that carry criteria.
- `docs/future-work.md`: under "Popular searches", point to the rule above.

## Order

1. Change 1 (server stdout), shipped alone to `main` as soon as possible.
2. Changes 2 and 4 together: moving Search to `sessionStorage` without the copy would lose
   users' work without telling them. Change 3 can land with them or after: it builds on the
   storage argument from change 2, and change 4's drawer caption is its helper text.
3. Change 5, coordinated with the search result cap plan.
4. Changes 6 and 7 with whichever lands last.

## Checks

- `npm test` and `npm run lint` in `client/`.
- In the browser: run a search and pin a chart on `/search/nadac`, reload (still there), close
  the tab and open the app again (gone), and confirm DevTools shows no `page-*` or `search-pins`
  key in `localStorage`. Add the search to the workspace, close the browser tab, reopen, and
  confirm the tab and its pins are there.
- With legacy keys planted in `localStorage`, load once and confirm they move to
  `sessionStorage` and are deleted.
- Open two windows, change Search in one, and confirm the other doesn't go read-only.
- On a fresh workspace, the new tab page shows the checkbox, checked. Run a search, close the
  browser tab, reopen: the workspace is there. Clear workspace, uncheck the box, run a search,
  and reload: it's still there, with the box unchecked and nothing under `drugpricing.` in
  `localStorage` except Settings and the last Search source. Close the tab and reopen: a fresh
  workspace, box checked.
- Toggle the box on a workspace with several tabs and pins, both ways, and confirm every tab
  and pin survives and the old storage is empty.
- Read the checkbox and its helper text with VoiceOver in Safari on macOS (the simulator has
  none).
- On a phone width, confirm the drawer caption and the Search caption fit and don't crowd
  **Clear workspace** or the search fields.
- In the network panel, the two searches are POSTs with no term in the URL, in dev and against
  the deployed API. After the production deploy, refresh and run an FDA and a NADAC search.
- On the Pi after deploy, run an FDA search and confirm `journalctl -u drugpricing` shows
  nothing from it.

## Not in this plan

- Encrypting browser storage, or a passphrase for the workspace.
- Expiring saved workspace data on a timer.
- A Settings entry for the storage choice: it belongs to the workspace, so it lives in the
  drawer and on the new tab page.
- Multiple workspaces. This plan only keeps the way open (see "Leave room for multiple
  workspaces" under change 3).
