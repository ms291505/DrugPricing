import { useMemo, useState, type ReactNode } from "react";
import {
  GlobalModalActionsContext,
  GlobalModalStateContext,
  type GlobalModalActions,
  type OpenGlobalModal,
} from "./globalModalContexts";

export function GlobalModalContextProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<OpenGlobalModal | null>(null);
  const actions = useMemo<GlobalModalActions>(() => ({
    openModal: (modal, options) => setOpen({ ...options, modal }),
    openHelp: (helpTopic, options) => setOpen({ ...options, modal: "help", helpTopic }),
    closeModal: () => setOpen(null),
  }), []);
  return (
    <GlobalModalActionsContext.Provider value={actions}>
      <GlobalModalStateContext.Provider value={open}>{children}</GlobalModalStateContext.Provider>
    </GlobalModalActionsContext.Provider>
  );
}
