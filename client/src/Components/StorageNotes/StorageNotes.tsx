import { Link, Typography } from "@mui/material";
import { useGlobalModalActions } from "../../Context/globalModalContexts";
import { useWorkspaceActions } from "../../Context/workspaceContexts";
import { helpSectionId } from "../../library/help";

/*
 * Where the workspace is saved, in a line beside Clear workspace. Help explains what's saved, who
 * can see it, and what reaches the server. The copy is drafted in docs/content/search-privacy-copy.md.
 */

const HELP_TOPIC = "tabs-and-your-saved-workspace";
const HELP_SECTION = helpSectionId("What’s saved and who can see it");

/**
 * In the Workspace menu, directly above Clear workspace. `inMobileDrawer`: the phone drawer
 * closes before Help opens, and focus then returns to its toggle, since the link is hidden.
 */
export function WorkspaceMenuNote({ inMobileDrawer = false }: { inMobileDrawer?: boolean }) {
  const { setMobileDrawerIsOpen, mobileDrawerToggle } = useWorkspaceActions();
  const { openHelp } = useGlobalModalActions();
  return (
    <Typography variant="caption" component="p" color="text.secondary" sx={{ px: 1 }}>
      Your workspace is saved in this browser so it’s here when you come back.{" "}
      <Link
        component="button"
        type="button"
        sx={{ verticalAlign: "baseline", typography: "inherit", textAlign: "inherit" }}
        onClick={() => {
          if (inMobileDrawer) setMobileDrawerIsOpen(false);
          openHelp(HELP_TOPIC, {
            section: HELP_SECTION,
            ...inMobileDrawer && { returnFocus: mobileDrawerToggle.current },
          });
        }}
      >
        What’s saved and who can see it
      </Link>
    </Typography>
  );
}
