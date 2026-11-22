# Focus and touch cleanup

On a phone, a price change chart button keeps looking "open" after its chart closes, opening a
chart throws the page down to it, and Clear search opens the on-screen keyboard. The cause is code
that moves focus from code: onto new cards, back to the button that opened a closed chart, into
text fields. Most of it exists because a change chart opens after every list card, far from its
button, and because the docs told agents to route focus in detail.

This plan opens change charts in a dialog instead, on every screen size, which removes the
routing. It then gates or removes the remaining focus moves and replaces the detailed focus rules
in the docs with short ones, enforced where a lint rule can.

File paths are under `client/src/` unless stated otherwise. There are two PRs against `dev`, in
order. Two rounds of read-only reviews (implementation dry runs and an accessibility review), two
outside reviews and a check in the iOS Simulator shaped this version.

## Background

**What the iOS Simulator showed** (Safari on an iPhone 17 simulator, `http://localhost:5173`,
2026-11-21):

- Tapping a chart button scrolls the page down to the new chart's title.
- Hiding the chart with the same button leaves the button with its primary "open" border and icon
  color after the chart is gone. That's the reported bug. Two things can hold that look: the
  `event.currentTarget.focus()` in the button's click handler (focus style) and iOS's sticky
  `:hover`, since the button's `"&:hover, &.Mui-focusVisible"` style isn't inside
  `@media (hover: hover)`. Open, hover and focus also share one border and color.
- With the keyboard closed, tapping Clear search clears the field and opens the keyboard.
- Closing a chart with its Close button didn't jump the page back in this run; on desktop Chrome
  it does (`button.focus()` without `preventScroll` in `onChartRemovedWithFocus`).

**How the chart got far from its button.** The first price change plan opened a chart under its
group. When scans arrived (460737c), the same change could appear in several lists, so the charts
moved to the section level as "one chart per change across lists", rendered after every list
card. The focus routing (about 250 lines in `PriceChangesSection`, `EventChangeChart` and
`PinnedSection`) compensates for that distance.

**Why a dialog, and why on every screen.** The change chart inspects one package's change; it
isn't a comparison tool. Comparison has its own tools that work the same on any screen: Chart
selected (several packages in one chart), pinned charts with Match scale, and View data. A dialog
shows the chart at once and keeps the page where it was. MUI moves focus into it and traps it
there. Behavior is the same on phone and desktop; only presentation differs. The cost is one
unpinned chart at a time: Pin keeps one, and pinned charts compare side by side.

## The rules (AGENTS.md, UI conventions)

PR 1 adds both, with `Components/ui/focus.ts` and the lint rule, so the code and the docs never
disagree.

**Same behavior on every screen.** Layout adapts to the width tier; interaction doesn't. A
phone-only or desktop-only interaction needs a stated reason in its plan.

**Accessibility: WCAG 2.2 Level AA.** As built after PR 1's review, AGENTS.md keeps only the
policy: semantic HTML and MUI's keyboard and focus behavior first, accessible names, visible
focus, a logical order, status messages in an always-mounted `role="status"` line (new content
doesn't take focus), and custom focus handling only for a specific usability problem, with the
reason in a comment. Try the flow with a keyboard first; if you can tell where you are and
continue, keep the default. Two touch rules stay: focus a text field from code only
`fromKeyboard(event)` or when the user asked to type, and no `event.currentTarget.focus()` in
click handlers (ESLint rejects it). Custom `&:hover` styles go inside `@media (hover: hover)`.

The review proposed a longer block that tied each rule to a criterion and spelled out the focus
techniques. It wasn't adopted: detailed techniques in AGENTS.md invite the hand-rolled routing
this plan removes. The one pattern still needed, for an action that removes the focused control
(`holdsFocus` before the change, `fromKeyboard` and after-close timing for menu items, a
surviving neighbor, `preventScroll` unless from the keyboard), is in `focus.ts`'s header, where
only code that already moves focus reads it. PR 2's items below follow it, and its "go
somewhere" actions (Chart selected, Show) scroll for everyone and focus the destination's
heading only `fromKeyboard(event)`.

```ts
/**
 * Enter or Space on a button or menu item: those clicks have `detail` 0. MUI's ButtonBase passes
 * the KeyboardEvent itself to `onClick` for non-button elements such as `MenuItem`.
 */
export const fromKeyboard = (event: { detail: number }) => event.detail === 0;
/** Call before removing or disabling `container`: whether focus is inside it and would be lost. */
export const holdsFocus = (container: Element | null | undefined) =>
  !!container?.contains(document.activeElement);
/**
 * The first element matching `selector` that is shown, searching outward from `from`: the
 * nearest ancestor that holds one. Hidden pages and tabs (`content-visibility: hidden`) don't
 * count. For focus targets that live outside the component's React tree.
 */
export function nearestVisible(from: Element, selector: string): HTMLElement | null;
```

`fromKeyboard` is only `detail === 0`. A `:focus-visible` check was considered and dropped:
WebKit can treat a scripted focus as `:focus-visible`, so a tapped menu item that MUI focused on
open would read as keyboard. Screen readers vary (VoiceOver on iOS and TalkBack activate with
`detail` 1, so they're treated as touch), which is why removal is decided by `holdsFocus` and
announcements carry what focus doesn't.

Focus targets found through the DOM use data attributes, not class names or text:
`data-collapse-toggle` (`ExplorerGridItem`'s collapse button), `data-results-heading`
(`ResultsSection`'s `h2`), `data-first-term` (the search panel's first text field) and
`data-price-change-list={listId}` (each list card's grid item).

## PR 1: Change charts open in a dialog

### Testing on iOS without a device

Safari in the Xcode iOS Simulator on the same Mac opens `http://localhost:5173` and reaches the API
at `localhost:5250` with no setup: `localhost` is a secure context, so `crypto.randomUUID()` works.
It runs real iOS WebKit (taps don't focus buttons, sticky hover, the on-screen keyboard), which is
what this plan's phone checks need. Document it beside the client commands as the first phone
check. The Simulator has no VoiceOver.

### Real-device test setup (dev only)

For VoiceOver on iOS and for Android. A device can't reach `localhost`, and plain HTTP over the LAN
isn't a secure context, so `crypto.randomUUID()` (workspace startup, pins, scans) throws.

- `vite.config.ts` becomes `defineConfig(({ mode }) => …)`. Only `mode === "phone"`:
  - `server.proxy` sends `/api` to `http://localhost:5250` (the server's routes are already under
    `/api`; no rewrite). The device calls the API on the page's own origin: no CORS change, no
    mixed content.
  - `server.https` reads an mkcert certificate from a gitignored `client/.cert/` and fails with a
    clear message if it's missing.
  - `server.allowedHosts: [".local"]`, so the device can use `https://<Mac name>.local:5173`, which
    survives DHCP changes.
- Commit `client/.env.phone` with `VITE_API_URL=/api` (not secret; `--mode phone` doesn't load
  `.env.development`, so without it every API URL breaks). Add `npm run dev:phone`
  (`vite --mode phone --host`).
- Document: generate the certificate with SANs for `<Mac name>.local`, the LAN IP and `localhost`;
  install mkcert's root CA on the device and turn on full trust (iOS: Settings › General › About ›
  Certificate Trust Settings); remove that trust profile after testing, since anyone with
  `rootCA-key.pem` could intercept the device's traffic; use a trusted network, since `--host`
  exposes Vite and the proxied API to the LAN; expect the macOS firewall prompt for node. Android
  Chrome can skip the certificate with `chrome://inspect` port forwarding of 5173 and 5250.
  `@vitejs/plugin-basic-ssl` (self-signed) is a documented fallback, not a dependency.

### Helpers, rules and lint

- Add `Components/ui/focus.ts` (above) and the data attributes.
- `AGENTS.md`: add both rules to UI conventions.
- ESLint: `no-restricted-syntax` rejecting `event.currentTarget.focus()` (a `CallExpression` whose
  callee is `*.currentTarget.focus`), with a message pointing to the Accessibility rule.

### The dialog

Every price change list (Notable price changes, scan cards, pinned lists) opens its change charts
the same way.

- **The button.** "Chart this change for <NDC>" with `aria-haspopup="dialog"`. It no longer
  toggles: no `aria-expanded`, `aria-controls`, `ref` or open styling. Its custom hover border goes
  inside `@media (hover: hover)`; its `&.Mui-focusVisible` border stays outside it, so keyboard
  focus is visible. Keep the 44px size on narrow cards. Remove its `click.currentTarget.focus()`.
- **`PriceChangeChartDialog.tsx`** (replaces `EventChangeChart.tsx`). A local MUI
  `Dialog`, not `GlobalModal`: the global modal renders at the app root, outside each tab's pin
  provider, so Pin inside it would reach the wrong pins or none. React context passes through the
  dialog's portal, so the local one reaches the tab's pins.
  - Rendered conditionally (`{open && <Dialog open …>}`), as `GlobalModal` is, so there's no exit
    transition to manage when it closes on its own.
  - Full screen below `sm` and on short screens (`(max-height: 500px)`, landscape phones);
    otherwise `fullWidth` and `maxWidth="md"`.
  - `TitleBar` with `eventChartTitle` (date, NDC, unit) names the dialog. Below it, one context
    line, wired as `aria-describedby`: the list's title and the chart's dates
    (`formatWindow(dateWindow, dateBounds(prices))`).
  - `LineViz` with `eventDate`, the change marked and the readout resting on it, as today, with
    View data.
  - **Pin:** `PinButton` with the props `EventChangeChart` passes today (`eventDate`, `origin`,
    `colors`, `dateWindow`, and the pinned list's `source` under Pinned). It pins a regular line
    chart pin and toasts, and the dialog stays open. While a dialog is open MUI sets `aria-hidden`
    on `#root`, which holds the `<Toaster>`, so screen readers won't hear the toast: the dialog
    also has an always-mounted, visually hidden `role="status"` line. Its text changes with each
    pin, so a second pin is announced too (the visible toast shows above the backdrop).
  - **Close:** the title bar's close button, Esc, or the backdrop. Esc needs one fix:
    `ReadoutContent` (`Charts/ReadoutDock.tsx`) stops every `keydown`, so Esc from Unlock never
    reaches the dialog. Let `Escape` through. With a point locked, the first Esc (from the chart
    or from Unlock) unlocks (`useLockedPoint` stops it) and gives focus back to the chart, since
    Unlock unmounts; the second closes. Say so in CHARTS.md.
  - **Restoring focus.** MUI's FocusTrap restores whatever had focus before the dialog opened
    (`relatedTarget`), not the chart button, and without `preventScroll`. After a tap on iOS that
    can be a stale element: a heading Chart selected focused, an earlier text field. In the
    button's click handler, record `holdsFocus(event.currentTarget)`, and pass
    `disableRestoreFocus` when it was false, with a comment. A keyboard user gets focus back on
    the button; a tap restores nothing. Revisit in PR 2 (see "Restoring focus after a tap").
- **State.** `PriceChangeListBody` holds the one open change (`{ key, title, prices, eventDate,
  restoreFocus }`, captured in the click handler: `loadedPrices()` computes when called) and
  renders the dialog, for results lists and pinned lists alike. It takes `chartPrices(group,
  event)` and a `chartContext` (`listTitle`, `origin`, `colors`, `dateWindow`, and
  `source` under Pinned) in place of `openCharts`, `onToggleChart` and `onRegisterButton`.
  - `PriceChangesSection` builds them from the page's `ChartSource` (the `loadedPrices` filter by
    package NDC and unit that `toggleChart` uses today).
  - `PinnedPriceChangeList` builds them from the item's histories, filtered by `seriesNdc` and
    unit: colors memoized on histories and palette with `themedSeriesColor`, `origin` from
    `item.source` (`resultPrices: []`), `listTitle` from the item's title.
- **Closing on its own.** Reset the open change when `groups` changes identity (new prices), with
  the set-state-during-render pattern. When the page is hidden (`usePageVisible()` false), the
  dialog returns null and closes itself in an effect: it renders into `<body>`, and hidden tabs and
  standalone pages stay mounted, so browser Back could otherwise leave it over another page. If
  the opener is gone (new prices, a hidden page), focus falls to `<body>`; that's rare, since the
  dialog is modal, and accepted.

Behavior that changes on purpose:

- One unpinned change chart at a time, on every screen. The "one chart per change across lists"
  rule goes, along with charts that outlive their list.
- A chart no longer sits in the card grid; pinning is how a chart stays on the page.

### Code that goes away

- `PriceChangesSection.tsx`: the `charts` map and `chartsPrices`, `toggleChart`, `closeChart`, the
  `buttons` and `headings` registries, `chartsRef`, `shownHeadings`, `onChartRemovedWithFocus`,
  `onListRemovedWithFocus`, `isShown`, `byPosition`, `sectionId`, the rendering of open charts,
  and `ResultsHeadingContext` (the fallbacks find the heading by `data-results-heading`). The
  section returns null when `!showAuto && !scans.length`.
- `Context/resultsHeading.ts`, and the heading ref and provider in `ResultsSection.tsx`. The
  heading keeps `tabIndex={-1}` for the fallbacks.
- `EventChangeChart.tsx`: the card shell, the mount focus and scroll, the removal detection,
  `openerId`, `cardId` and `onRemovedWithFocus`.
- `ExplorerGrid/PinnedSection.tsx`: the temporary charts grid, `TemporaryChartCard`, `charts`,
  `chartIdPrefix`, `toggleChart`, `closeChart`, `buttons`, `registerButton`, `gridRef`, and the
  Pinned heading's `ref`, `tabIndex={-1}` and `:focus-visible` style (nothing else focuses it).
  `ExplorerGrid/PinnedItemCard.tsx` drops the chart props and renders `PinnedPriceChangeList`
  unconditionally; `PinnedListChartProps` goes.
- `PriceChangeListBody.tsx`: `openCharts`, `onRegisterButton`, the `chartId` lookups, and the
  `currentTarget.focus()` calls on Show all events / Show fewer and Show all packages / Show fewer
  packages (the same Safari workaround, and PR 1's checks open charts from expanded groups).
- `eventKey`'s doc comment: the "shows as open in all" rule.

### List cards: Close and data updates

- **List Close.** `closeList` moves focus to the next card's heading on every close today. In the
  Close click handler, before the card goes: if `holdsFocus(card)`, focus the next card's
  `[data-collapse-toggle]`, else the previous card's, else `[data-results-heading]`, with
  `preventScroll: !fromKeyboard(event)`. Cards are found by `data-price-change-list`. Remove
  Close's `event.currentTarget.focus()`.
- **New prices remove a focused scan card: nothing moves focus.** PR 1 first kept a layout-effect
  check that sent focus to Notable price changes or the results heading; the review removed it.
  It only ran when a slow fetch landed after the user tabbed into a card, the Notable card
  unmounts during loading too, and browsers resume Tab from the removed node's position. A small,
  deliberate risk under 2.4.3, traded for the most intricate lifecycle code left.

### Docs in PR 1

- `AGENTS.md`:
  - UI conventions: the two rules. In the Global modal bullet, note the change chart dialog is a
    local `Dialog` because it needs the tab's pins.
  - Price Activity: the chart button opens that package's change in a dialog, one at a time, on
    every screen, pinnable. Delete the focus routing sentences ("Focus from a closed or discarded
    chart goes to the…" through "…else the results heading."), "There is one chart per change…",
    "A chart stays until its own Close…", and "A chart card has no event list and no Around this
    change."
  - Workspace: "which the drawer focuses" becomes "which the drawer focuses after a keyboard
    close" if PR 2 lands that; leave it until then.
- `client/CHARTS.md`: the price change section (what `PriceChangesSection` holds; the event chart
  card; "Opening moves focus…"; "Only list cards receive the open charts"; "A chart card has no
  event list…"), the `h3` mention for event charts (line ~110; the dialog title is the name now),
  "Focused event charts" (line ~130), the pinned list bullet (no second grid; delete "Focus from a
  closed temporary chart…"), and the readout section (Esc in a dialog unlocks first).
- Comments that go stale: `PinnedSection`'s "Below them, the charts…", `PinnedPriceChangeList`'s,
  `PinnedItemCard`'s memo comment, `PriceChangesSection`'s "Always mounted, so the open
  charts…", and `ResultsSection`'s `priceChanges` prop doc.
- Help: `content/help/price-changes.md` (the chart opens in a dialog; Pin keeps a copy; drop "Hide
  chart" and "across the lists") and `content/help/pinning-and-comparing.md` (the "stays open if
  you collapse or remove the list" sentence).
- `docs/future-work.md`: add **Previous and Next in the change chart dialog**, **Chart a change
  group** (one multi-series chart of a group's packages, in the same dialog, for comparing), and
  **Browser Back closes dialogs** (on a phone, Back with a full-screen dialog open leaves the page;
  Help has the same problem; it needs a history entry when a dialog opens).
- `docs/plans/browser-usability-cleanup.md`: point its Agent documentation and Verification focus
  notes to this plan.
- Commit this plan and list it in `docs/README.md`.

### Verifying PR 1

Run `npm run lint`, `npm run build` and `npm test` in `client/`. There are no component tests, so
they don't cover any of this; the checks below do.

In the iOS Simulator (Safari, `localhost:5173`):

- From Notable price changes, a scan card and a pinned list, including the first row of a group
  expanded with Show all packages: the chart appears at once, full screen; closing it (close
  button and backdrop) leaves the page exactly where it was, and the chart button shows no border,
  ring or tooltip.
- Tap Chart selected (a heading may hold focus), scroll back, open and close a change chart: the
  page doesn't move.
- Rotate to landscape: the dialog is full screen.
- Pin from the dialog: the toast shows; after closing, the pin is under Pinned with the change
  marked.
- Close a list card by tap: nothing scrolls and no ring appears.

On desktop with the keyboard only (Chrome, and Safari with "Press Tab to highlight each item" on):

- Enter on a chart button opens the dialog with focus inside it; Esc closes it and focus is back
  on that button. Lock a point, then from the chart and again from Unlock: the first Esc unlocks
  and focus is on the chart, the second closes the dialog. Outside a dialog (a pinned chart), Esc
  from Unlock unlocks and focus is on the chart.
- Close a list card with the keyboard: focus lands on the next card's toggle, else the previous
  card's, else the results heading.

On a real device with `npm run dev:phone`, once with VoiceOver: the dialog is announced by its
title and context line; Pin announces "Pinned…"; Android Chrome, if available, repeats the
Simulator checks.

## PR 2: Remaining focus moves

No layout changes. The data attributes and helpers come from PR 1.

- **Clear search** (`SearchPanel/SearchPanel.tsx`): the button disables itself. Focus the
  `[data-first-term]` field only when `fromKeyboard(event)`. A tap or mouse click leaves focus
  alone (the Simulator showed a tap opening the keyboard today).
- **Clear filters** (`SearchPanel.tsx`): it also disables itself. When `fromKeyboard(event)`, focus
  More filters.
- **Scan popover** (`ResultsSection/AutoCharts.tsx`): remove the Scan button's
  `event.currentTarget.focus()` and the `transition.onEntered` focus (MUI's Modal gives the paper
  `tabIndex={-1}` and FocusTrap focuses it, so the dialog is announced by its `aria-label`; Tab
  reaches the input). Presets set the value without focusing the input. Delete `inputRef`.
  Accepted cost: after choosing a preset by keyboard, Enter presses the preset again; Tab to Scan.
- **Scan results** (`hooks/usePriceChangeScans.ts`, `AutoCharts.tsx`, `PriceChangesSection.tsx`):
  - A new scan card neither scrolls nor takes focus: delete `focusOnMount` and its effect. MUI
    returns keyboard focus to Scan price changes, and scrolling away from it made the next Tab
    jump back.
  - Replace `emptyMessage` with `report: { message, scanId } | null`. Every scan sets the status
    line beside Scan: "Found N package changes of X% or more in these dates and filters." (N
    counts events, the package changes), or today's empty-scan text. New prices clear it. Rename
    the `scanMessage` prop and update its docs and `runScan`'s.
  - Beside a report with a card still open, a **Show** button (`aria-label` "Show <list title>")
    scrolls to the card (`[data-price-change-list=…]`, `block: "center"`, smooth unless reduced
    motion) and, when `fromKeyboard(event)`, focuses its heading. Hide Show once that card is
    closed; keep the message.
  - The status changes in the same render in which MUI returns focus to Scan. Check with VoiceOver
    that the message is spoken; if it's dropped, set the report after the popover's `onExited`.
- **Chart selected** (`ResultsSection/ChartSelectedControl.tsx`): one flag (`highlight.focus`)
  gates both the scroll and the focus today (`ExplorerGrid/PinnedItemCard.tsx`), so split it into
  `{ id, scroll, focus }` in `Context/pinnedItemsContexts.ts`, `addItems`/`addItem` and
  `Context/PinnedItemsProvider.tsx`. `PinnedItemCard` gates the effect on `scroll` and focuses the
  heading only when `focus`. Chart selected passes `{ scroll: true, focus: fromKeyboard(event) }`.
  Add a toast for one chart: "Added a line chart to Pinned." (or bar); today only the
  several-units case toasts.
- **Pinned card Remove** (`ExplorerGrid/PinnedItemCard.tsx`): Remove unmounts the menu's anchor,
  so keyboard focus falls to `<body>`. When `fromKeyboard(event)`, choose the target before
  removing: the next card's `[data-collapse-toggle]` (cards are sibling grid items), else the
  previous card's, else `nearestVisible(card, "[data-results-heading]")`, else
  `nearestVisible(card, "[data-first-term]")`. `PinnedSection` isn't inside `ResultsSection` (on
  standalone pages one shared section sits outside both kept search pages), so these are found
  through the DOM. Then close the menu, remove the item, and focus the target in a
  `requestAnimationFrame` if it's still connected. `Collection` has none of these; focus is left
  alone there.
- **Close tab** (`Workspace/DrawerTab.tsx`, `Workspace/DrawerContent.tsx`): pass
  `fromKeyboard(event)` from the menu item to `closeTab`, and set `focusAfterClose` only then. The
  existing effect runs after the menu's trap is gone. `replacementTabId` already picks next, else
  previous, else the new blank tab.
- **Phone drawer modals** (`Workspace/DrawerContent.tsx`): pass `returnFocus` only when
  `holdsFocus(event.currentTarget)`, and `GlobalModal` focuses it with `preventScroll`. After a tap
  on iOS, focusing the drawer toggle showed a ring for nothing.
- **Unlock** (`Charts/ReadoutDock.tsx`, `LineViz.tsx`, `BarViz.tsx`): `onUnlock` takes the event.
  `unlockAndFocus` gives focus back to the chart only when `holdsFocus(event.currentTarget)`, with
  `preventScroll: !fromKeyboard(event)`. Check in the Simulator that a tap on Unlock doesn't switch
  `useChartReadout` into announcing.
- **Help navigation** (`Help/HelpBrowser.tsx`): it moves focus because the clicked link unmounts,
  in a layout effect that runs after the old content is gone. Record `holdsFocus(root)` in the
  handlers that navigate (open topic, Back, All topics, topic links) and focus in the effect only
  when it was true, with `preventScroll` unless from the keyboard.
- **Series legend** (`Charts/SeriesLegend.tsx`): the "button goes away" check becomes
  `holdsFocus(event.currentTarget)`; wrap its custom hover in `@media (hover: hover)`.
- **Hover styles**: wrap `Help/HelpBrowser.tsx`'s custom hover in `@media (hover: hover)`.
- **Focus not hidden under the app bar** (WCAG 2.4.11): the app bar is `position: fixed` and
  nothing reserves its height, so Shift+Tab can put focus under it, and the phone FAB can cover
  the bottom edge. Add `scroll-padding-top` (app bar height) and `scroll-padding-bottom` (FAB) on
  `html`, in the theme's global styles.
- **Restoring focus after a tap** (`PriceChangeChartDialog.tsx`, from PR 1's review): the
  `restoreFocus` field and `disableRestoreFocus` guard against MUI restoring focus to a stale
  element after an iOS tap. That stale focus mostly comes from the tap-time focus moves this PR
  removes (the scan's `focusOnMount`, Chart selected's heading focus). Once they're gone, try
  MUI's default in the Simulator: tap Chart selected, open and close a change chart. If no ring
  appears and the page doesn't move, delete the field, the click-time `holdsFocus` and the prop.
- **Sweep**: search for `\.focus\(`, `preventScroll`, `checkVisibility`, `returnFocus` and
  `&:hover`. Each focus call left must follow the rules; each custom hover style must be inside
  `@media (hover: hover)`.
- **Keep, without rework:** MUI's dialog, menu and popover focus; `useTabRename` (the user asked to
  type); the chart's keyboard readout (`useChartReadout`); `ConfirmButton`; `enterTouchDelay` on
  tooltips; the legend's `pointerType` check; the DataGrid's `hasFocus` in `priceColumns.tsx`.

### Docs in PR 2

- `AGENTS.md`: Workspace, "which the drawer focuses" → "which the drawer focuses after a keyboard
  close"; Price Activity, the scan status line and Show; remove the pointer to this plan.
- `client/CHARTS.md`: Chart selected scrolls to the new card and focuses it only from the
  keyboard (the "highlighting/focusing the first" sentence); Unlock gives focus back only when it
  had it.
- Help: `content/help/price-changes.md` (every scan reports its count; Show).
- Comments and docs: `DrawerTab`'s `onClose`, `scanMessage`/`runScan`, `PinHighlight`.
- `docs/future-work.md`: rewrite **The tab FAB's Close Tab and Minimize drop keyboard focus** to
  the menu rule (`fromKeyboard`, focus after the menu closes, nothing after a tap). Keep **Restyle
  the focus outline on headings that take focus from code**: keyboard Chart selected, Show and the
  fallbacks still focus headings. Move any open question below that's still open into it.
- `docs/README.md`: remove this plan.

### Verifying PR 2

The same commands. In the iOS Simulator:

- Clear search, Clear filters, the scan popover and its presets don't open the keyboard unless you
  tap the input.
- A scan reports its count beside Scan and the page stays put; Show scrolls to the card.
- Chart selected scrolls to the new pinned card and shows the toast, with no ring on its heading.
- Unlock, Help navigation, Close tab, pinned Remove, and closing Help or Settings opened from the
  phone drawer: no focus ring after a tap.
- Without `disableRestoreFocus`, if it was removed: closing a change chart leaves the page where
  it was and shows no ring.

On desktop with the keyboard only:

- Every control in these flows is reachable with Tab and works with Enter or Space.
- Nothing leaves focus on `<body>` when used from the keyboard: Clear search, Clear filters,
  pinned Remove (including the only pin after Clear search, when there's no results heading), Close
  tab, Help navigation, Unlock.
- Shift+Tab up a long page: the focused control is never hidden under the app bar.

On a real device, once with VoiceOver:

- A scan's count is announced; Chart selected with one row announces "Added a line chart to
  Pinned."
- Remove a pin and close a tab from their menus, and note where the VoiceOver cursor lands. A
  VoiceOver tap reads as touch (`detail` 1), so nothing restores focus; if the cursor is lost,
  revisit the menu rule.

## Open questions

- **Chart selected's re-centering loop** (`PinnedItemCard.tsx`, about 30 lines). It re-centers the
  new pinned card while charts above it draw and grow past their placeholders. With PR 2's
  `scroll-padding`, try placeholders of the right height (or `contain-intrinsic-size`). If the
  card then lands in place in the Simulator, delete the loop.
- **MUI Menu focuses its first item after a tap**, which may show a ring on iOS. Check the tab and
  pinned card menus in the Simulator; if the ring shows, pass `disableAutoFocusItem` when the menu
  was opened by a tap (MUI then focuses the menu list instead).
- **Scan presets** could submit the scan at their percent (`type="submit"`), which would remove
  the Enter cost above. That's a behavior change; decide separately.
