import { useWorkspaceContext } from "../../Context/WorkspaceContext"
import type { WorkspaceTab } from "../../library/types";
import { Button } from "@mui/material";

type Props = {
  tab: WorkspaceTab,
  children: React.ReactNode,
}
export default function DrawerTab({ tab, children }: Props) {
  const { paneAssignment, setPaneAssigment } = useWorkspaceContext();
  const selected = paneAssignment.includes(tab.id);

  return (<>

    <Button
      onClick={() => setPaneAssigment([tab.id])}
      sx={{
        color: "text.primary",
        backgroundColor: selected ? "action.selected" : "transparent",
        "&:hover": {
          backgroundColor: selected ? "action.selected" : "action.hover",
        },
      }}
    >
      {children}
    </Button>
  </>)
}
