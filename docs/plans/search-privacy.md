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
  keeping tabs between visits is what it's for. **Add search to workspace** is how a user keeps
  a Search page's work, and its pins come along as they do today.
- **The workspace says what it saves.** The user should know, before and after adding a tab,
  that the workspace keeps search terms and pinned prices in this browser, that anyone who uses
  this browser can see them, and how to delete them.
- **A new workspace asks where to keep it.** When a workspace starts fresh, the user chooses
  between keeping it on this device (`localStorage`, the default) and keeping it only until the
  browser tab closes (`sessionStorage`). The question is a checkbox, "Keep this workspace on this
  device", checked by default, and its wording says the data stays in this browser and is never
  sent to the server. It isn't a dialog: keeping the default is a valid answer, and a dialog
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
- **Migration.** Before `pruneStoredState` runs, move any `page-fda`, `page-nadac`, and
  `search-pins` values in `localStorage` into this tab's `sessionStorage` (only when the session
  keys are empty) and delete them from `localStorage`. Then `pruneStoredState` stops exempting
  `STANDALONE_TAB_IDS`, so a leftover copy is deleted on the next load. The legacy per-source
  pin merge in `loadSearchPins` reads from `sessionStorage` after the move and otherwise stays
  as it is. No `VERSION` bump: nothing is misread.

  This means an existing user's Search pins last only until they close that browser tab. That's
  acceptable for a project with few users. If it isn't, the alternative is to turn legacy
  Search state with pins into a workspace tab through `addSearchTab`, which is more code for a
  one-time step.
- Behavior to know: duplicating a browser tab copies its `sessionStorage`, and a link opened in
  a new tab starts empty. Each browser tab has its own Search state, which matches the "for
  this session" rule.

Tests (`persist.test.ts`): stub `sessionStorage` with the same `memoryStorage()` helper. Cover
Search state going to `sessionStorage` and never to `localStorage`; the migration moving and
deleting legacy keys, and not overwriting existing session values; session writes while
`readOnly`; `pruneStoredState` deleting legacy standalone keys; and the workspace and Settings
still going to `localStorage`.

### 3. Workspace storage choice

**A fresh workspace** is one that starts with nothing saved: a first visit, a browser whose
site data was cleared, a new browser tab when the workspace was kept only for the session, and
the blank workspace that **Clear workspace** leaves.

**Storing the choice.** Add `WorkspaceStorage = "device" | "session"` to `persist.ts`, and route
the workspace key and every `.tab.<tabId>` key through the chosen storage. At startup
(`initWorkspace`):

- A workspace in `localStorage` means `"device"`.
- Otherwise, a workspace in `sessionStorage` means `"session"`. Unchecking the box saves the
  workspace there right away, blank tab or not, so a reload keeps the choice.
- Otherwise the workspace is fresh, and it starts as `"device"`.

The mode is a property of the workspace, not of the app: add an optional `storage` field to
`PersistedWorkspace` (default `"device"`, so no `VERSION` bump) and keep no separate app-wide
key for it. Keep it in the workspace state in `WorkspaceContext`, and expose it with a setter
through `useWorkspaceActions` (stable) and a narrow read hook. Only the checkbox and the drawer
caption read it, so a change doesn't re-render tabs.

**Changing it** moves the data. Write every workspace and tab key to the new storage first, and
delete the old copies only once every write succeeds, as `saveSearchPins` does. Unchecking
deletes the device copy at once, and checking again moves it back, so neither direction needs a
confirmation.

- `watchOtherWindows` watches workspace keys only in `"device"` mode, since session keys can't
  conflict. Unchecking in one window deletes the shared keys, so another window open on the device
  workspace goes read-only and asks for a reload, as it does today for any other change. After
  the reload it starts fresh. That's correct, and it's rare.
- `pruneStoredState` prunes the storage in use. It also deletes a workspace left in the other
  storage, unless `migrate` is still running.
- **Add search to workspace** writes the new tab's state to whichever storage the workspace uses.
  A failed save still opens no tab.
- **Clear workspace** deletes the workspace from both storages and resets the mode to `"device"`,
  so the checkbox shows checked again on the fresh workspace.

**Where it's asked.**

- **The new tab page** (`Components/TabCreator/TabCreator.tsx`) shows the checkbox while the
  workspace is fresh: one blank tab and no search run yet. Once a search runs, the checkbox
  leaves this page, and the drawer is where it's changed. Workspace tabs only, never on
  standalone Search.
- **The workspace drawer** (`Workspace/DrawerContent.tsx`) always shows it, above **Clear
  workspace**, with the caption from change 4 under it.

**Proposed wording** (draft in `docs/content/` with the rest of the copy):

- Label: "Keep this workspace on this device"
- Helper text, checked: "Your tabs, searches, and pinned charts stay in this browser so they're
  here when you come back. They're never sent to the server, but anyone who uses this browser
  can see them."
- Helper text, unchecked: "Your tabs, searches, and pinned charts stay in this browser tab only
  and are deleted when you close it. They're never sent to the server."

Connect the helper text to the checkbox with `aria-describedby`. On narrow layouts the whole
row is a 44px target. A change announces nothing beyond the checkbox's own state.

Tests: the startup rule for each combination of stored keys; a mode change moving every key and
deleting the old copies only after a complete write, including a failed write partway; Clear
workspace clearing both storages and resetting the mode; `watchOtherWindows` ignoring workspace
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
  kept until you close this browser tab. Add it to your workspace to keep it." Pick the spot
  that's visible without being noisy on a phone. Without this, users who relied on Search
  restoring after a restart lose their work without warning.
- **Help, "Tabs and your saved workspace"**: rewrite the storage paragraph to say what's saved
  (search terms, dates, filters, and pinned charts and their prices), where (this browser on
  this device, never sent to the server), who can see it (anyone using this browser profile),
  the **Keep this workspace on this device** choice and where to change it, and how to delete
  it (close a tab, **Clear workspace**, uncheck the box, clear this site's data, or use a
  private window). Replace the last line about Search pages with the session rule. Keep the
  topic ID.
- **Help, "Searching"**: one sentence on the Search pages keeping a search until the browser
  tab closes, and on adding it to the workspace to keep it.
- **About**: a short "Privacy" section: no accounts, the server doesn't record searches, what
  the browser keeps, and a link to the Help topic.

### 5. Search terms out of URLs

- Change the two searches the client calls to POST with a JSON body:
  `nadac-prices/search` (a body with `ndcDescription`, `ndc`, `minDate`, `maxDate`) and
  `fda-products/advanced-search` (the `AdvancedFdaSearchRequest` as the body, which removes
  `jsonString` and the hand-rolled `JsonSerializer.Deserialize`). Keep the routes and validation
  the same otherwise.
- Coordinate with [Search result cap](search-result-cap.md), which changes the same endpoints.
  Land whichever is first and rebase the other; the POST change is mechanical.
- Keep the GET forms for a release only if something outside the client calls them. Nothing in
  the repo does.
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
  the deployed API.
- On the Pi after deploy, run an FDA search and confirm `journalctl -u drugpricing` shows
  nothing from it.

## Not in this plan

- Encrypting browser storage, or a passphrase for the workspace.
- Expiring saved workspace data on a timer.
- A Settings entry for the storage choice: it belongs to the workspace, so it lives in the
  drawer and on the new tab page.
- Multiple workspaces. This plan only keeps the way open (see "Leave room for multiple
  workspaces" under change 3).
