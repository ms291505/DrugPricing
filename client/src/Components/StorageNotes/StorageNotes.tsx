import { Link, Typography, type SxProps, type Theme } from "@mui/material";
import { useGlobalModalActions } from "../../Context/globalModalContexts";
import { useWorkspaceActions, useWorkspaceTabs } from "../../Context/workspaceContexts";
import { isFreshWorkspace } from "../../library/workspace";

/*
 * What the workspace saves, where, and who can see it, shown where the user acts. Help only
 * expands on it. The copy is drafted in docs/content/search-privacy-copy.md. Each note speaks of
 * "this workspace", so it still reads correctly if the app ever holds several.
 */

const HELP_TOPIC = "tabs-and-your-saved-workspace";

function LearnMore({ beforeOpen, returnFocus }: { beforeOpen?: () => void, returnFocus?: () => HTMLElement | null }) {
  const { openHelp } = useGlobalModalActions();
  return (
    <Link
      component="button"
      type="button"
      sx={{ verticalAlign: "baseline", typography: "inherit" }}
      onClick={() => {
        beforeOpen?.();
        openHelp(HELP_TOPIC, returnFocus && { returnFocus: returnFocus() });
      }}
    >
      Learn more
    </Link>
  );
}

/**
 * On the new tab page while the workspace is fresh, before anything is saved; gone once the tab
 * becomes a search or another tab opens, and back whenever the workspace is fresh again. Not
 * dismissible, since a dismissal would be one more stored value. It reads the tab list itself,
 * so the page around it doesn't re-render on every tab change (the list doesn't change on a
 * tab switch).
 */
export function FreshWorkspaceNote({ sx }: { sx?: SxProps<Theme> }) {
  const tabs = useWorkspaceTabs();
  if (!isFreshWorkspace(tabs)) return null;
  return (
    <Typography variant="body2" color="text.secondary" sx={sx}>
      This workspace saves your tabs, searches, and pinned charts in this browser so they’re here when you come back,
      and anyone who uses this browser can see them. To start over, use <strong>Clear workspace</strong> in the
      Workspace menu. If you use a private window, your browser clears your saved workspace when you close all
      private windows. <LearnMore />
    </Typography>
  );
}

/**
 * In the Workspace menu, directly above Clear workspace. `inMobileDrawer`: the phone drawer
 * closes before Help opens, and focus then returns to its toggle, since the link is hidden.
 */
export function WorkspaceMenuNote({ inMobileDrawer = false }: { inMobileDrawer?: boolean }) {
  const { setMobileDrawerIsOpen, mobileDrawerToggle } = useWorkspaceActions();
  return (
    <Typography variant="caption" component="p" color="text.secondary" sx={{ px: 1 }}>
      This workspace’s tabs, searches, and pinned charts are saved in this browser, where anyone who uses it can see
      them. Searches send their terms to the server, which doesn’t keep them.{" "}
      <LearnMore {...inMobileDrawer && {
        beforeOpen: () => setMobileDrawerIsOpen(false),
        returnFocus: () => mobileDrawerToggle.current,
      }} />
    </Typography>
  );
}
