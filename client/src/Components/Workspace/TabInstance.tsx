import { tabTypeRegistry, type WorkspaceTab } from "../../library/types.ts";
type Props = {
  workspaceTab: WorkspaceTab,
  visible: boolean,
}

export default function TabInstance({ workspaceTab, visible }: Props) {
  const { Provider, Content } = tabTypeRegistry[workspaceTab.type];
  return (
    <div style={{ display: visible ? "flex" : "none" }}>
      <Provider>
        <Content />
      </Provider>
    </div>
  )
}
