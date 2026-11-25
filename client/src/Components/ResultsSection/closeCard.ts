import type { MouseEvent } from "react";
import { fromKeyboard, holdsFocus, nearestVisible } from "../ui/focus";

/** The closable cards in the results grid: added charts and price change lists. */
const CARD_SELECTOR = ":scope > [data-added-chart], :scope > [data-price-change-list]";

/** An added chart can be several cards, one per pricing unit, which all close together. */
const sameCard = (a: HTMLElement, b: HTMLElement) =>
  a === b || (a.dataset.addedChart !== undefined && a.dataset.addedChart === b.dataset.addedChart);

/**
 * Call before a results card closes. When the card holds focus, focus moves to the next card's
 * collapse toggle, else the previous card's, else the results heading, so it isn't lost with the
 * card. A tap or click on Close moves nothing.
 */
export function moveFocusFromClosingCard(card: HTMLElement | null, event: MouseEvent<HTMLElement>) {
  if (!card || !holdsFocus(card)) return;
  const cards = [...card.parentElement?.querySelectorAll<HTMLElement>(CARD_SELECTOR) ?? []];
  const index = cards.indexOf(card);
  const neighbor = cards.slice(index + 1).find(other => !sameCard(other, card))
    ?? cards.slice(0, index).reverse().find(other => !sameCard(other, card));
  const target = neighbor?.querySelector<HTMLElement>("[data-collapse-toggle]") ?? nearestVisible(card, "[data-results-heading]");
  target?.focus({ preventScroll: !fromKeyboard(event) });
}
