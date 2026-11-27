/**
 * Focus helpers. The rules they serve are in AGENTS.md (UI conventions, Accessibility): move
 * focus from code only when the user would otherwise lose their place, and never because
 * something new appeared.
 *
 * The one pattern for that case: when the user's own action removes the control that has focus
 * (a card's Close, a pin's Remove, Close tab), focus would fall to `<body>` and the next Tab
 * starts over (WCAG 2.4.3). Use it only there, and try the flow with a keyboard first.
 * - A button decides with `holdsFocus` before the change. After a tap on iOS nothing holds focus,
 *   so nothing moves.
 * - A menu item decides with `fromKeyboard(event)`, since MUI focuses menu items even after a
 *   tap, and moves focus after the menu has closed, or the menu's focus trap pulls it back.
 * - The target is a surviving neighbor (the next card's toggle, else the previous card's, else a
 *   heading), focused with `preventScroll` unless `fromKeyboard(event)`.
 *
 * Focus targets found through the DOM use data attributes, not class names or text:
 * `data-collapse-toggle` (`ExplorerGridItem`'s collapse button), `data-card-heading` (its
 * heading), `data-results-heading` (`ResultsSection`'s `h2`), `data-first-term` (the search
 * panel's first text field), `data-price-change-list` (each list card's grid item) and
 * `data-pinned-item` (each pinned card's grid item).
 */

/**
 * Enter or Space on a button or menu item: those clicks have `detail` 0. MUI's ButtonBase passes
 * the KeyboardEvent itself to `onClick` for non-button elements such as `MenuItem`.
 */
export const fromKeyboard = (event: { detail: number }) => event.detail === 0;

/** Call before removing or disabling `container`: whether focus is inside it and would be lost. */
export const holdsFocus = (container: Element | null | undefined) =>
  !!container?.contains(document.activeElement);

// Older Safari does not implement checkVisibility. Hidden kept pages can still have rects.
function isVisible(element: HTMLElement): boolean {
  if (typeof element.checkVisibility === "function") return element.checkVisibility();
  if (!element.getClientRects().length) return false;
  for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
    if (getComputedStyle(ancestor).getPropertyValue("content-visibility") === "hidden") return false;
  }
  return true;
}

/**
 * The first element matching `selector` that is shown, searching outward from `from`: the
 * nearest ancestor that holds one. Hidden pages and tabs (`content-visibility: hidden`) don't
 * count. For focus targets that live outside the component's React tree.
 */
export function nearestVisible(from: Element, selector: string): HTMLElement | null {
  for (let scope = from.parentElement; scope; scope = scope.parentElement) {
    const found = [...scope.querySelectorAll<HTMLElement>(selector)].find(isVisible);
    if (found) return found;
  }
  return null;
}
