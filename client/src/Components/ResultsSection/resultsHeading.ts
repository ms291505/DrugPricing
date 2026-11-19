import { createContext, type RefObject } from "react";

/**
 * The results heading (`ResultsSection`), focusable as a last resort when focus would otherwise
 * be lost with the content it was in. Null outside a results section.
 */
export const ResultsHeadingContext = createContext<RefObject<HTMLHeadingElement | null> | null>(null);
