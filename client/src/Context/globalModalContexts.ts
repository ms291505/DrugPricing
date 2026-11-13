import { createContext, useContext, type Dispatch, type SetStateAction } from "react";
import type { HelpTopicId } from "../library/help";
export type GlobalModal = "settings" | "about" | "onboarding" | "help";
export type HelpTarget = { topic?: HelpTopicId, returnFocus?: HTMLElement | null };
export const GlobalModalContext = createContext<{
  globalModal: GlobalModal | null;
  setGlobalModal: Dispatch<SetStateAction<GlobalModal | null>>;
  helpTarget: HelpTarget;
  openHelp: (topic?: HelpTopicId, returnFocus?: HTMLElement | null) => void;
} | null>(null);
export function useGlobalModalContext() {
  const context = useContext(GlobalModalContext);
  if (!context) throw new Error("Global modal provider is missing");
  return context;
}
