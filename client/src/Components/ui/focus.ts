/**
 * Focus helpers. The rules they serve are in AGENTS.md (UI conventions, Accessibility): move
 * focus from code only when the user would otherwise lose their place, and never because
 * something new appeared.
 */

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
export function nearestVisible(from: Element, selector: string): HTMLElement | null {
  for (let scope = from.parentElement; scope; scope = scope.parentElement) {
    const found = [...scope.querySelectorAll<HTMLElement>(selector)].find(element => element.checkVisibility());
    if (found) return found;
  }
  return null;
}
