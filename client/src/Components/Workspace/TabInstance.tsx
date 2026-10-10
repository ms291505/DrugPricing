import type { WorkspaceTab } from "../../library/types.ts";
import { tabTypeRegistry } from "../../library/tabTypeRegistry.ts";
import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import { useTabInstanceContext } from "../../Context/TabInstanceContext.tsx";
import TabContextFab from "./TabContextFab.tsx";

type Props = {
  workspaceTab: WorkspaceTab,
  visible: boolean,
}

export default function TabInstance({ workspaceTab, visible }: Props) {

  const { setId } = useTabInstanceContext();

  useEffect(() =>
    setId(workspaceTab.id)
    , [setId, workspaceTab.id]);

  const { Provider, Content } = tabTypeRegistry[workspaceTab.type];

  // Hidden tabs stay mounted. A restored tab waits to run its search until it is first shown,
  // so reloading a many-tab workspace doesn't fire every tab's search at once.
  const [hasBeenVisible, setHasBeenVisible] = useState(visible);
  if (visible && !hasBeenVisible) setHasBeenVisible(true);

  const showTabContextFab = visible && workspaceTab.type !== "new" ? true : false;

  return (
    <>
      <Box
        sx={{
          display: visible ? "flex" : "none",
          minWidth: 0,
          width: "100%"
        }}>
        <Provider tabId={workspaceTab.id} active={hasBeenVisible}>
          <Content />
        </Provider>
      </Box>

      {
        showTabContextFab
          ? <TabContextFab />
          : null
      }

    </>
  )
}
