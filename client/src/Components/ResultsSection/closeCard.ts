import type { MouseEvent } from "react";
import { fromKeyboard, holdsFocus, nearestVisible } from "../ui/focus";

/** The closable cards in the results grid: added charts and price change lists. */
const CARD_SELECTOR = ":scope > [data-added-chart], :scope > [data-price-change-list]";

/**
 * Call before a results card closes. When the card holds focus, focus moves to the next card's
 * collapse toggle, else the previous card's, else the results heading, so it isn't lost with the
 * card. A tap or click on Close moves nothing.
 */
export function moveFocusFromClosingCard(card: HTMLElement | null, event: MouseEvent<HTMLElement>) {
  if (!card || !holdsFocus(card)) return;
  const cards = [...card.parentElement?.querySelectorAll<HTMLElement>(CARD_SELECTOR) ?? []];
  const index = cards.indexOf(card);
  const neighbor = cards[index + 1] ?? cards[index - 1];
  const target = neighbor?.querySelector<HTMLElement>("[data-collapse-toggle]") ?? nearestVisible(card, "[data-results-heading]");
  target?.focus({ preventScroll: !fromKeyboard(event) });
}
