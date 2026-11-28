# AGENTS.md split and project skills

## Context

`AGENTS.md` is 482 lines and 5,028 words, and every agent session loads all of it, whether the
work touches the client, the server, or the ETL. About two thirds of it is client detail
(Workspace, Standalone Search, data rules, UI conventions, and persistence take 230 lines), and
the worktree runbook alone is 61 lines. Much of the client text narrates the implementation:
which hook refines what, how a cache is keyed, and the order of steps inside a function. An
agent can read that from the code, and the text goes stale when the code changes.

What's true today:

- The root `CLAUDE.md` imports `AGENTS.md`. There are no nested `AGENTS.md` or `CLAUDE.md` files
  and no `.claude/skills/` directory. `.claude/launch.json` is tracked, and `.claude/slots/` is
  gitignored.
- `client/CHARTS.md` and `client/RESULTS.md` already hold chart, card, table, and price activity
  rules. `AGENTS.md` repeats some of them (pinned snapshots, price activity).
- The README covers setup, the development commands, and deployment. It doesn't mention
  `docker compose up -d`, `npm run dev:phone`, or the Pi's `.env.production` path.
- The "Known rough edges (fair game for review)" heading contradicts the line under it, which
  says not to report backlog items as new findings.

This plan splits the guidance into three layers by when an agent needs it, and turns four
procedures into skills. Behavior of the app doesn't change.

## Decisions

### The sorting test

Each rule goes where it will be loaded when it's needed. The test is: would an agent break this
rule without reading the code first?

- **Yes, from any part of the repo:** it stays in the root `AGENTS.md`. Example: never record a
  search term on the server.
- **Yes, but only while editing the client:** it goes to `client/AGENTS.md`. Example: code inside
  a tab must not read the panes or the drawer state.
- **Yes, but only while doing one kind of change:** it goes to that change's skill. Example: a new
  persisted field is optional with a default, and `VERSION` is bumped only when old data would be
  misread.
- **No, the code shows it:** it's deleted from the guides. If the code has no comment explaining
  it and the reason isn't obvious, the implementation adds one beside the code. Example: the
  order of steps in `addSearchTab`.

Dated decisions ("a labeler alone is never a search, decided 2026-11-27") stay as one-liners
wherever their area lands, so agents stop proposing them again. Their reasoning can be cut.

Line counts are an outcome, not a target. The expected result is about 170 lines for the root
and about 170 for the client file.

### Three layers

1. **Root `AGENTS.md`**, always loaded. It holds orientation, cross-cutting invariants, server and
   ETL rules, branching, and a table that names each skill and when to use it.
2. **`client/AGENTS.md`**, with a `client/CLAUDE.md` that imports it the same way the root
   `CLAUDE.md` does. Claude Code loads a subdirectory's `CLAUDE.md` when it reads files in that
   directory, so client rules arrive with client work and stay out of server and ETL work. Other
   agents that read `AGENTS.md` files by working directory only load it when started in `client/`,
   so the root file links to it by path and says to read it before editing the client.
3. **Skills** in `.claude/skills/<name>/SKILL.md`. Claude Code loads a skill when its description
   matches the task. The root table names every skill's `SKILL.md` path, so an agent that doesn't
   load skills, or misses a match, can still open it.

The server and ETL get no nested files. They're small enough that splitting them would save
little, and work that crosses layers should see their rules.

### Wording changes

- The opening line becomes "the entry point for project guidance", since the file links to other
  guides. Each rule has one home, and the other files link to it rather than repeating it.
- "Known rough edges (fair game for review)" moves to `docs/future-work.md` as backlog entries.
  The root keeps one review rule: don't report a backlog item as a new finding, but do report it
  when a change makes it worse or adds a regression.

## Root `AGENTS.md`

The new root file, in order:

1. **What this project is.** The current five-part list, shortened to one line per part, and the
   note that it's a learning project and agents should lead where the author asks.
2. **Where guidance lives.** The style guide, `docs/plans/`, `docs/reviews/`, `docs/content/`, and
   `docs/future-work.md`, plus `client/AGENTS.md` ("read before editing `client/`"),
   `client/CHARTS.md`, `client/RESULTS.md`, and the skills table.
3. **Privacy.** One section that collects the rules about search terms across layers: never
   recorded on the server, searches are POSTs, labeler matching happens in the browser, Standalone
   Search state stays in `sessionStorage`, and the workspace is the only search state kept between
   visits.
4. **Data rules for every layer.** API dates are calendar days. There's never one price per NDC per
   date. NADAC NDCs are stored without leading zeros, the FDA join supplies dashed codes, and a
   dashed code is never rebuilt. `ProductNdc` is the FDA product key, never `ProductId`. Every FDA
   query filters `DelistedAt == null`.
5. **Server.** One line on layering (`Endpoints/` → `Services/` → `Data/Repositories/`). Every
   search counts its rows before loading and refuses past `SearchLimits.MaxRows`. Every
   `EF.Functions.ILike` on a term goes through `LikePattern`. Labelers are groups, picks only narrow
   a name search (decided 2026-11-27), and `LabelerGroups.Normalize` and `normalizeLabeler` change
   together. NADAC NDC normalization and the 5 to 11 digit rule. A fresh database needs `pg_trgm`.
   `NdcExcludeFlag` and `FdaPackageSearchResult.cs` are unused. Dev settings, indentation, and the
   three commands. The endpoint list is cut to the ones whose shape isn't obvious from
   `Endpoints/`.
6. **ETL.** Connection ownership and the single commit, `test_connection` borrowing its
   connection, the parsing rules in two lines, FDA duplicates (filter on `product_ndc`), keeping
   `models.py` in sync with `server/Models/`, and `NADAC_FILTER_BEFORE_INSERT`. Scheduling links
   to the README.
7. **Conventions across layers.** NADAC types in four files, duplicated minimum lengths and labeler
   code limits, the cache `SetList` and `Size` rule, the secrets rule, and the directories not to
   search.
8. **Branching and deployment.** PRs go to `dev`, never `main`. Deploys link to the README, plus
   the one line the README lacks: check the Pi's `.env.production` when a deploy calls the wrong
   API.
9. **Worktrees.** One trigger line ("before starting any server from a worktree, use the
   `worktree-servers` skill"), plus the rules that protect other sessions: claim a slot before
   starting servers, a branch with a migration needs its own database, stop only what you started,
   never kill by port, and shut servers down when the browser checks are done.
10. **Skills.** A table with each skill's name, path, and when to use it.
11. **Reviews.** The review rule from "Wording changes" and a link to the backlog.

## `client/AGENTS.md`

It keeps the client rules an agent breaks without reading the code, and deletes the narration.

- **Map.** `src/` folders and feature folders, about ten lines. Each search page is its panel, its
  results, and `PinnedSection`, and a results page's charts read a `ChartSource`.
- **Workspace.** A workspace always has a tab. Imports stay acyclic and provider modules stay
  component-only. A tab switch must not re-render hidden tabs: the narrow hooks, what a tab or
  drawer row may read, and the `memo` rule. Hidden panes share one grid cell with
  `content-visibility: hidden`. Tab titles follow the search until the user renames the tab, and
  only the search panels read the tab list.
- **Standalone Search.** Each source stays mounted after its first visit. Bare addresses show
  Welcome. The NADAC handoff is the only thing that changes NADAC's draft. One pin provider wraps
  the two sources and never the workspace. Add search to workspace copies applied criteria with
  fixed dates (decision about the caption, 2026-11-27, kept as one line).
- **Search behavior.** The user-visible contract: only text terms wait for Search, everything else
  applies at once, Search is disabled while the terms are the search on screen, and Clear search
  resets the fields but keeps pins, the tab, and the detail level. Panel layout follows the panel's
  width, never the window's, and a new arrangement is a new `SearchPanelLayout`. Dates default to
  the last `DEFAULT_NADAC_SEARCH_MONTHS` and are the window for the whole page. Toasts show only
  while their page is on screen. React Query doesn't refetch on focus or reconnect. The field
  mechanics move to the `add-search-field` skill.
- **Charts.** Never two pricing units on one axis or in one figure, the axis exaggeration limit,
  and pinned items are snapshots. Each links to `CHARTS.md` instead of repeating it.
- **UI conventions.** Kept nearly whole, since every component edit needs them: JSX parentheses,
  same behavior on every screen, WCAG 2.2 AA with the two touch rules and target sizes, the theme
  rules, the global modal, Help topic IDs, and where new preferences go.
- **Persistence.** The keys, field-by-field validation, the read-only rule for several windows, and
  "anything that resets state when data loads undoes a restore". The steps for adding or changing
  a saved field move to the `persisted-state` skill.
- **Commands and testing.** The npm commands, the phone check in the iOS Simulator, and that tests
  run in Node with `TZ=America/Chicago`.

## Skills

Each skill's description names the work that should load it, in the words an agent or the author
would use. Each one ends with the checks to run.

### `worktree-servers`

Replaces the 61-line runbook. It covers creating the worktree from `dev`, copying the server
settings without reading them, picking and claiming a slot, starting the servers with
`preview_start` using that slot's configs, checking that they run the worktree's code, the
background-shell fallback, a separate database for migrations, and shutting down and releasing the
slot. It also keeps the reasons that matter when something fails: `preview_start` runs from the
main checkout, so a missing slot link gives `ENOENT`, and configs without `cwd` once ran the main
checkout's code and looked like success.

Three scripts in the skill's folder do the parts that are easy to get wrong by hand. They're
written for macOS (BSD tools), and they print what they did.

- `claim-slot.sh` checks each slot in order, skips any slot with an existing link (even a dangling
  one), skips a slot if either port is listening, claims the first free one with `ln -sn`, and
  prints the slot number. With all three held, it exits nonzero and says to ask the author.
- `check-servers.sh <slot>` finds the listener on each of the slot's ports and prints its working
  directory, and fails if either one isn't inside this worktree.
- `release-slot.sh <slot>` removes the link only if it points at this worktree, then confirms both
  ports are free. It never stops a process.

Stopping servers stays a tool call (`preview_stop` with the ids `preview_start` returned), since a
script can't tell which listener this session started.

### `add-search-field`

For adding or changing a NADAC or FDA search field or filter. It covers deciding whether the field
is a load field (`nextLoad`) or a refine field, storing exclusions rather than selections,
clearing them in `apply*Search`, from-results options (`*FilterOptions`) and the "(N hidden)"
counts, `hiddenResultsHint`, where the field goes in More filters (`FilterGroup`,
`moreFiltersLayout`), reading tabs saved before the field existed (`legacy*Criteria`), and Clear
search. FDA specifics: dates widen and snap (`widenToAsOfDates`, `fdaShownDates`), Labeler picks
apply at once through `fdaLoadHolds` and `matchesLabelerCodes`, and the Price activity rules
(fixed field, all five categories listed, judged over the shown dates). It ends with the unit tests
to add in `src/library/`.

### `add-server-search`

For a new search endpoint or repository query. It covers a POST with a JSON body, never a term in
the URL or a log, the bounded count and load in one `REPEATABLE READ` transaction over one query
builder, `LimitedRows<T>`, the 422 `too-many-rows`, `LikePattern`, passing the
`CancellationToken` down, caching through `SetList` with its own `CacheKeys` key and a `Size`, the
`DelistedAt` filter, the matching minimum lengths in the client, and showing a refusal as
`TooManyRowsNotice`. The privacy and `LikePattern` rules also stay in the root, because other edits
can break them.

### `persisted-state`

For adding or changing anything saved to `localStorage` or `sessionStorage`. It covers when to bump
`VERSION` (only when old data would be misread), optional fields with defaults, field-by-field
validation, `pruneStoredState`, which storage each kind of state uses and why, blank tabs saving
nothing, the read-only behavior with several windows, and restoring without a reset on data load.
It ends with the `persist.test.ts` cases to add, including its per-test re-import.

### Not now

Help topics, retheming, and ETL changes are small enough to stay as rules in their guides. A skill
for one of them is worth adding if that work comes up often. `docs/future-work.md` gets one line
listing them.

## Implementation

Three PRs against `dev`, in this order, so each one can be checked alone.

1. **`worktree-servers`.** Add the skill and its three scripts, and replace the runbook in
   `AGENTS.md` with the trigger line and the shared-resource rules. This is the largest single
   saving and the only part with code.
2. **Client split.** Add `client/AGENTS.md` and `client/CLAUDE.md`, move the client sections, and
   trim them by the sorting test. Remove text that repeats `CHARTS.md` or `RESULTS.md`, and add
   code comments where a deleted explanation isn't obvious from the code.
3. **Remaining skills and the root rewrite.** Add the other three skills, rewrite the root in the
   order above, move the rough edges to the backlog, add the README's two missing commands, and
   update `docs/README.md`.

Each PR description includes an inventory: every rule in the text it removes (one row per bullet
or sentence that states a rule), with where it went (root, client file, a skill, a code comment,
the README, or the backlog) or why it was deleted. A rule with no destination and no reason is a
bug in the PR.

## Verification

- **Nothing lost.** A reviewer checks the inventory against the removed text, and spot-checks a few
  destinations.
- **Nested loading.** In a fresh Claude Code session started at the repo root, ask for a client
  edit and confirm `client/CLAUDE.md` is loaded once a client file is read. Ask for a server edit
  and confirm it isn't.
- **Skill matching.** In fresh sessions, try prompts written the way the author would, for example
  "add a Route filter to FDA search", "start the servers for this worktree", "add an endpoint to
  search by ingredient", and "save the chart style per tab". Confirm each loads its skill. Reword
  descriptions until they do.
- **Scripts.** Run `claim-slot.sh` with no slots held, with slot 1 held by a link, with slot 1's
  client port held but no link, with a dangling link, and with all three held. Run
  `release-slot.sh` against a slot linked to another worktree and confirm it refuses. Run
  `check-servers.sh` with the servers started from the main checkout and confirm it fails.
- **End to end.** Follow `worktree-servers` from a new worktree through a browser check and
  shutdown, and confirm the ports are free and the link is gone.

## Open questions

- Which other agents work in this repo, and do they load skills from `.claude/skills/`? The root
  table names every path either way, but if another agent loads skills from its own folder, a link
  or a copy there may be worth it.
- Should `client/AGENTS.md` keep the UI conventions whole, or should accessibility and theming go
  to a `ui-change` skill? This plan keeps them in the client file, because nearly every component
  edit needs them.
