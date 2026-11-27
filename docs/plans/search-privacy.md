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
  a Search page's work past the browser tab, and its pins come along as they do today.
- **The workspace says what it saves, on screen.** The user should know, before and after adding
  a tab, that the workspace keeps search terms and pinned prices in this browser, that anyone who
  uses this browser can see them, and how to delete them or avoid keeping them. Every fact a user
  needs in order to act is shown where they act: on the new tab page, in the drawer, and on
  Search. Help only expands on it, and a user never has to open Help to find out what's kept or
  how to remove it.
- **No session-only workspaces.** An earlier draft let each workspace choose between this
  device and this browser tab, with a checkbox. We dropped it: switching an existing workspace
  between storages needed an interrupt-safe move, a merge into another tab's workspace, and
  recovery on reload, all rarely run and costly to keep correct through later persistence
  changes. Session-only Search already covers a quick lookup on a shared computer. For anyone
  who wants temporary workspace tabs, the fresh-workspace note points to a private window, which also clears
  Search, Settings, and the browser's own history, at no code cost. Revisit only if people ask
  for it, and then as a choice made once when a workspace is created, never switched later.
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

**Leave room for multiple workspaces.** The app may later hold several workspaces. This plan
doesn't build that, but nothing in it should assume there is only one:

- The storage argument added above takes any `Storage`, so a later per-workspace choice (if one
  is ever wanted) needs no new plumbing in `read`, `write`, and `remove`.
- `pruneStoredState` keeps any tab id that some workspace still lists. Today that's one list;
  don't write it in a way that deletes tabs belonging to another workspace once there are more.
  Tab keys are already unique ids, so they don't need a workspace prefix.
- Write the new copy about "this workspace" where it describes one workspace's tabs, so it
  still reads correctly when there are several.

### 3. Tell users what's saved and where

Draft the copy in `docs/content/` first and follow the writing style guide. Proposed wording:

- **A fresh workspace explains itself.** The new tab page (`Components/TabCreator/TabCreator.tsx`)
  shows a short note while the workspace is fresh, before anything is saved. That's how a user
  learns what the workspace keeps before they rely on it, and the two ways not to keep it:
  "This workspace saves your tabs, searches, and pinned charts in this browser so they're here
  when you come back. Anyone who uses this browser can see them. To start over, use **Clear
  workspace** in the workspace menu. To keep nothing after you're done, open the app in a
  private window." Link "Learn more" to the `tabs-and-your-saved-workspace` Help topic.
  - **Fresh** means the workspace is a single blank tab: a first visit, cleared site data,
    after **Clear workspace**, or after closing every tab. It's derived from the tab list, so
    nothing new is stored. The note goes once a search runs or the tab changes type, and comes
    back whenever the workspace is fresh again. It isn't dismissible: a dismissal would be
    another stored value, and the note is short.
  - Workspace tabs only, never on standalone Search, which has its own caption below.
  - A plain paragraph in `text.secondary` above the tab choices, not an alert. It's information
    that's always true, and it mustn't push the tab choices below the fold on a phone, so check
    its height at phone width.

- **Workspace drawer**, as a caption above **Clear workspace** (`Workspace/DrawerContent.tsx`):
  "This workspace's tabs, searches, and pinned charts are saved in this browser so they're here
  when you come back, and anyone who uses this browser can see them. Searches send their terms
  to the server to find prices, and the server doesn't keep them." Link "Learn more" to the
  `tabs-and-your-saved-workspace` Help topic for more detail. Always shown, in
  `text.secondary`. If it crowds the drawer on a phone, tighten the wording, but keep all three
  facts on screen (saved in this browser, visible to anyone using it, and what the server gets).
  Never move one into Help to save space. **Clear workspace** sits directly under the caption,
  so the way to delete is right there.
- **Add search to workspace**: give the button an accessible description and a tooltip, "Saves
  this search and its pins in this browser". If it shows a confirmation after adding a tab, use
  the same wording (check what it says today).
- **Search pages**: a one-line caption in the Search panel or near **Pinned**, "This search is
  kept until you close this browser tab. Add it to your workspace to keep it." Pick the spot
  that's visible without being noisy on a phone. Without this, users who relied on Search
  restoring after a restart lose their work without warning.
- **Help, "Tabs and your saved workspace"**: rewrite the storage paragraph to say what's saved
  (search terms, dates, filters, and pinned charts and their prices), where (this browser on
  this device), who can see it (anyone using this browser profile), and how to delete it (close
  a tab, **Clear workspace**, or clear this site's data). Add that a private window keeps a
  workspace only until the window closes, for anyone who wants that. In a separate paragraph,
  say what the server gets: each search sends its terms, dates and filters to the server, which
  uses them to find prices and doesn't keep them. Replace the last line about Search pages with
  the session rule. Keep the topic ID.
- **Help, "Searching"**: one sentence on the Search pages keeping a search until the browser
  tab closes, and on adding it to the workspace to keep it.
- **About**: a short "Privacy" section: no accounts, what the browser keeps and where, that
  searches send their terms to the server only to find prices and the server doesn't keep
  them, and a link to the Help topic.

"The server doesn't keep them" is true only once change 1 has shipped, which is why change 1
goes first.

### 4. Search terms out of URLs

- Change the two searches the client calls to POST with a JSON body:
  `nadac-prices/search` (a body with `ndcDescription`, `ndc`, `minDate`, `maxDate`) and
  `fda-products/advanced-search` (the `AdvancedFdaSearchRequest` as the body, which removes
  `jsonString` and the hand-rolled `JsonSerializer.Deserialize`). Keep the routes and validation
  the same otherwise.
- Coordinate with [Search result cap](search-result-cap.md), which changes the same endpoints.
  Land whichever is first and rebase the other; the POST change is mechanical.
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

### 5. Client console logging

Remove `console.log(apiPath)` from `api/api.ts` and the rough-edge note in AGENTS.md. After
change 4 the URL no longer has the term, but the log is noise either way.

### 6. Guard the rule for later work

- AGENTS.md: add "Never record a search term on the server: not in stdout, logs, traces, or
  error reports" under the server gotchas, and a line under Persistence saying standalone Search
  state is in `sessionStorage` and the workspace is the only thing kept between visits.
- [Observability](observability.md): when the OpenTelemetry stack goes in, check that the
  ASP.NET instrumentation redacts `url.query` (recent versions do by default; set it
  explicitly) and that Npgsql spans don't record parameter values. After change 4 the terms are
  in request bodies, which the instrumentation doesn't record unless asked. GlitchTip, if added,
  must strip request bodies and breadcrumbs that carry criteria.
- `docs/future-work.md`: under "Popular searches", point to the rule above.

## Order

1. Change 1 (server stdout), shipped alone to `main` as soon as possible.
2. Changes 2 and 3 together: moving Search to `sessionStorage` without the copy would lose
   users' work without telling them.
3. Change 4, coordinated with the search result cap plan.
4. Changes 5 and 6 with whichever lands last.

## Checks

- `npm test` and `npm run lint` in `client/`.
- In the browser: run a search and pin a chart on `/search/nadac`, reload (still there), close
  the tab and open the app again (gone), and confirm DevTools shows no `page-*` or `search-pins`
  key in `localStorage`. Add the search to the workspace, close the browser tab, reopen, and
  confirm the tab and its pins are there.
- With legacy keys planted in `localStorage`, load once and confirm they move to
  `sessionStorage` and are deleted.
- Open two windows, change Search in one, and confirm the other doesn't go read-only.
- On a fresh workspace (first load on a clean origin, and after **Clear workspace**), the new tab
  page shows the note, and it's gone once a search runs. Close every tab, and it's back.
- On a phone width, confirm the fresh-workspace note, the drawer caption, and the Search caption
  fit, and that they don't crowd the tab choices, **Clear workspace**, or the search fields.
- In the network panel, the two searches are POSTs with no term in the URL, in dev and against
  the deployed API. After the production deploy, refresh and run an FDA and a NADAC search.
- On the Pi after deploy, run an FDA search and confirm `journalctl -u drugpricing` shows
  nothing from it.

## Not in this plan

- Encrypting browser storage, or a passphrase for the workspace.
- Expiring saved workspace data on a timer.
- A session-only workspace or a per-workspace storage choice (see Decisions).
- Multiple workspaces. This plan only keeps the way open (see "Leave room for multiple
  workspaces" under change 2).
