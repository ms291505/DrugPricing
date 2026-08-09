import { tabTypeRegistry, type WorkspaceTab } from "../../library/types.ts";
import { Box } from "@mui/material";
import { useEffect } from "react";
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

  return (
    <>
      <Box
        sx={{
          display: visible ? "flex" : "none",
          minWidth: 0,
          width: "100%"
        }}>
        <Provider>
          <Content />
        </Provider>
      </Box>

      {
        visible
          ? <TabContextFab />
          : null
      }

    </>
  )
}
