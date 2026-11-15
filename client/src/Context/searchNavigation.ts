import { createContext } from "react";

/** Stable action for standalone FDA search only. */
export const TryNadacContext = createContext<((description: string) => void) | null>(null);

/** A new object represents a deliberate handoff, including a repeat of the same terms. */
export type NadacOffer = { description: string };
export const NadacOfferContext = createContext<NadacOffer | null>(null);
