# Topic-based Help — discussion draft

Started 2026-11-13. Content: [Help draft](../content/help.md). Related decisions:
[browser usability](browser-usability.md). This proposes implementation; it does not authorize it.

## Recommendation

Make the existing global modal the default way to open Help. Add `/help` and `/help/:topic`
as a second presentation of the same content, with an “Open in new tab” link in the modal.
These are client routes, not API endpoints; no server data service is needed.

The user favors browsing without leaving their place. The modal preserves the current route,
unsubmitted fields, selection, chart state and scroll position. In `App.tsx`, standalone search
pages currently unmount on route changes; their saved state is not a substitute for keeping
the live page mounted. Workspace remains mounted across routes, but that alone does not make
a dedicated page the right default everywhere.

The strongest argument against a modal is reference while working: it obscures the content and
blocks interaction with the page beneath it. A separate browser tab handles that case and
also provides bookmarks and shareable topic URLs. A persistent help side panel could support
simultaneous interaction later, but would introduce layout and chart-resize concerns and is
not proposed for the first version.

## Reading and navigation

- Keep the global modal's existing 600px width and full-screen phone presentation. Keep its
  title and Close control visible; use one scrolling content area.
- General Help opens a grouped topic index. Use the five groups actually listed in the draft
  (its introduction currently says four). Add a small “Find a topic” title/keyword filter;
  no search service or full-text search is needed.
- Selecting a topic replaces the index with one article. Show “All topics”, the topic heading
  and a few relevant related-topic links. Do not put the entire index above every article or
  squeeze it into a permanent sidebar at 600px.
- Contextual Help opens the relevant article directly. Internal article links stay inside
  Help. Local Back returns to the prior article or index; All topics always reaches the index.
- Start each newly selected article at the top and focus its heading. Returning to the index
  restores its filter, scroll and focused topic. General reopening starts at the index;
  contextual reopening always starts at the requested topic. No localStorage is needed.
- Opening/browsing the modal does not change the URL or browser history. Back within Help is
  explicit; browser Back retains normal app navigation. Close the modal on app route changes
  so it cannot linger over an unrelated destination.
- “Open in new tab” links to the current `/help/:topic` (or `/help` for the index), leaving the
  working app in place. Standalone articles use ordinary links and browser history, and an
  unknown topic offers the topic index. Verify direct URL loads with production SPA fallback.

The modal supports quick reading; the dedicated page supports extended reading. Neither needs
a different copy of an article. About stays separate. Keep the existing Welcome entry until
the broader welcome/navigation decisions are made, then reuse the relevant Help content.

## Content preparation

The Markdown file is an editorial document, not a publishable article bundle: it contains
Purpose, Check, Source and In context notes mixed with Draft text. Do not render it wholesale
or strip those markers at runtime.

Extract reviewed copy into one Markdown file per topic under `client/src/content/help/`.
Keep a typed catalog of stable topic IDs, title, group, search keywords and related topics in
`client/src/library/help.ts`. Both presentations consume that catalog and the same article
files. Keep unresolved checks and editorial provenance in `docs/content/help.md`; after
migration, identify the shipped files as the source of truth for published wording rather
than maintaining two independently edited copies.

Use a maintained Markdown renderer with table support and MUI mappings for headings, links,
lists and tables. Choose and check dependency compatibility during implementation. Disable raw
HTML; keep colors in theme roles. Tables may scroll within their own wrapper at phone widths,
but the article itself must not overflow horizontally. Use semantic headings and table headers.
Avoid MDX or a custom Markdown parser for this mostly prose content.

Before publishing each topic, resolve its Check notes, remove or qualify stale figures and
verify external factual claims against primary sources. Reconcile the charts, price changes
and workspace articles with whichever usability changes have actually shipped. Do not publish
planned behavior as current behavior. Shorten or split unusually long articles. The Sources
and disclaimer page still needs actual copy; its current Draft is an editorial instruction.

## Implementation steps

1. Prepare the catalog and a representative set of articles: What the prices mean, Filters
   and hidden results, Charts, and NDCs/products/packages. These exercise prose, links and
   tables. Build a shared article renderer and topic index in `Components/Help/`.
2. Replace the Help registry entry in `GlobalModal.tsx`, which currently renders `OnBoarding`.
   Add a typed `openHelp(topicId?)` action and optional topic target to the global modal state.
   Keep article navigation/filter state local to Help, so browsing topics does not update
   global context and redraw search pages. Keep provider exports component-only and contexts,
   hooks and types in separate modules when refactoring the existing mixed-export module.
3. Keep the drawer Help entry and add a labeled Help action to the shared app bar so standalone
   searches can reach it too. Preserve closing the mobile drawer before opening a dialog.
   Restore focus to the opener on close; when that opener belonged to the now-closed mobile
   drawer, use the visible drawer toggle instead.
4. Add `/help` and `/help/:topic` in `App.tsx`, using the shared renderer/catalog and a page
   shell. Add Open in new tab to the modal. Topic IDs are URL contracts and must survive title
   edits. Avoid route-backed overlays/background-location machinery in the first version.
5. Add a small first set of contextual entry points: Latest Price → What the prices mean;
   mixed-unit explanation → The results table; hidden-results hint → Filters and hidden
   results; chart range explanation → Charts. Use named controls such as “Help about pricing
   units”, not an unlabeled question mark. Do not make the entire sortable column header or
   selectable cell into a Help trigger. Avoid opening nested dialogs.
6. Migrate and review the remaining topics, then remove obsolete duplicated published copy
   where its replacement is agreed. A labeled fixed results example using the actual results
   component is a separate follow-up from the usability plan; basic Help should not depend on it.

A modal-only first PR is reasonable, followed by shared routes and contextual links. The full
proposed feature includes both presentations; decide the delivery split before coding.

## Acceptance and verification

- Open Help from Workspace, both standalone searches and the mobile drawer. Browse several
  topics and close it: route, search edits, filters, selection, pins and page scroll remain.
  Opening Help must not itself trigger a search, chart resize or hidden-tab redraw.
- Verify desktop and narrow phone layouts, both themes and zoomed text. Long articles and
  tables remain readable with a reachable Close control and no competing article scrollbars.
- Check keyboard focus trapping, Escape, focus restoration, heading focus on topic changes,
  local Back and screen-reader names. Verify the mobile drawer fallback specifically.
- Direct-load, reload and share topic URLs; check unknown IDs, related links and Open in new
  tab. Reading Help in another tab must not cause workspace writes or a multi-window warning.
  Existing workspace initialization/pruning needs inspection before promising that behavior.
- Add Node tests for catalog uniqueness, valid related-topic targets, topic lookup and filtering;
  manually verify modal behavior in the browser using the project's existing testing approach.
  Run client build, lint and tests after implementation.
- No editorial notes or unchecked claims appear in shipped articles. Review every migrated
  topic against the current app and record any intentionally deferred content.

## Decisions to discuss

Recommended defaults: modal-first with a separate-tab option; grouped index and one article at
a time; a small topic filter; no browser-history entries for modal navigation. The remaining
product question is how soon the separate-page option is valuable enough to ship. It can wait
without changing the content model or modal design.
