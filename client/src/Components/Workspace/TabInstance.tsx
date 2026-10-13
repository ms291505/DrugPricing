import type { WorkspaceTab } from "../../library/types.ts";
import { tabTypeRegistry } from "../../library/tabTypeRegistry.ts";
import { Box } from "@mui/material";
import { memo, useMemo, useState } from "react";
import { TabInstanceContextProvider } from "../../Context/TabInstanceContext.tsx";
import TabContextFab from "./TabContextFab.tsx";

// Unlike `display: none`, `content-visibility: hidden` keeps the tab's layout, so showing it
// again doesn't lay out the whole page from scratch. It also takes the content out of the
// accessibility tree, the tab order and find-in-page.
const hiddenPaneSx = {
  contentVisibility: "hidden",
  pointerEvents: "none",
  "@supports not (content-visibility: hidden)": { display: "none" },
} as const;

type Props = {
  workspaceTab: WorkspaceTab,
  visible: boolean,
}

// Memoized: a tab switch re-renders only the tabs whose `visible` changed. `workspaceTab` keeps
// its identity until the tab itself changes (WorkspaceContext).
export default memo(function TabInstance({ workspaceTab, visible }: Props) {

  const { id, type } = workspaceTab;
  const { Provider, Content } = tabTypeRegistry[type];

  // Hidden tabs stay mounted. A restored tab waits to run its search until it is first shown,
  // so reloading a many-tab workspace doesn't fire every tab's search at once.
  const [hasBeenVisible, setHasBeenVisible] = useState(visible);
  if (visible && !hasBeenVisible) setHasBeenVisible(true);

  // The same element on every render, so showing or hiding the tab doesn't re-render its page.
  const page = useMemo(() => (
    <Provider tabId={id} active={hasBeenVisible}>
      <Content />
    </Provider>
  ), [Provider, Content, id, hasBeenVisible]);

  const showTabContextFab = visible && type !== "new";

  return (
    <TabInstanceContextProvider id={id}>
      <Box
        sx={{
          display: "flex",
          minWidth: 0,
          // Every pane shares one grid cell (Workspace), so hidden tabs keep the visible tab's
          // width and their charts and grids see no resize when shown.
          gridArea: "1 / 1",
          alignSelf: "start",
          ...(visible ? {} : hiddenPaneSx),
        }}>
        {page}
      </Box>

      {
        showTabContextFab
          ? <TabContextFab />
          : null
      }

    </TabInstanceContextProvider>
  )
});
