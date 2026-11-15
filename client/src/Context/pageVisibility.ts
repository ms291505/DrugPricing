import { createContext, useContext } from "react";

/**
 * Whether the search page around a component is on screen. A workspace tab is while it's shown in
 * a pane and the workspace route is open (`TabInstance`); hidden tabs and the workspace on other
 * routes stay mounted. Standalone search pages also stay mounted after their first visit; their route
 * sets the same visibility context.
 *
 * Kept apart from the components so only the few that read it (`QueryErrorToast`,
 * `SearchResultToast`) re-render when a tab is shown or hidden, never the page.
 */
export const PageVisibleContext = createContext(true);

export const usePageVisible = () => useContext(PageVisibleContext);
