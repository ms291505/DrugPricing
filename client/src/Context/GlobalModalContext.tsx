import { useCallback, useMemo, useState, type ReactNode } from "react";
import { GlobalModalContext, type GlobalModal, type HelpTarget } from "./globalModalContexts";
import type { HelpTopicId } from "../library/help";

export function GlobalModalContextProvider({ children }: { children: ReactNode }) {
  const [globalModal, setGlobalModal] = useState<GlobalModal | null>(null);
  const [helpTarget, setHelpTarget] = useState<HelpTarget>({});
  const openHelp = useCallback((topic?: HelpTopicId, returnFocus?: HTMLElement | null) => {
    setHelpTarget({ topic, returnFocus });
    setGlobalModal("help");
  }, []);
  const value = useMemo(() => ({ globalModal, setGlobalModal, helpTarget, openHelp }), [globalModal, helpTarget, openHelp]);
  return <GlobalModalContext.Provider value={value}>{children}</GlobalModalContext.Provider>;
}
