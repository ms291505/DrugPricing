/** Shared with workspace tabs: hiding preserves layout and removes focusable descendants. */
export const hiddenPaneSx = {
  contentVisibility: "hidden",
  pointerEvents: "none",
  "@supports not (content-visibility: hidden)": { display: "none" },
} as const;
