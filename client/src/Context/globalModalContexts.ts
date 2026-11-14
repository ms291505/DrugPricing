import { createContext, useContext } from "react";
import type { HelpTopicId } from "../library/help";

// Split like the workspace contexts: the buttons that open a modal sit in every tab (grid
// headers, cells, chart captions), so they read only the stable actions, and opening or closing
// a modal re-renders nothing but `GlobalModal`, the one reader of the state.

export type GlobalModal = "settings" | "about" | "onboarding" | "help";

export type ModalOptions = {
  /**
   * Where focus goes when the modal closes, for an opener that is gone by then (the phone
   * drawer's buttons). Without it the dialog returns focus to whatever opened it.
   */
  returnFocus?: HTMLElement | null,
};

export type OpenGlobalModal = ModalOptions & {
  modal: GlobalModal,
  /** The Help topic to open on; the index when unset. */
  helpTopic?: HelpTopicId,
};

/** Never change identity, so reading them doesn't re-render a component. */
export type GlobalModalActions = {
  openModal: (modal: GlobalModal, options?: ModalOptions) => void,
  openHelp: (topic?: HelpTopicId, options?: ModalOptions) => void,
  closeModal: () => void,
};

export const GlobalModalActionsContext = createContext<GlobalModalActions | null>(null);
/** `undefined` outside the provider; `null` when no modal is open. */
export const GlobalModalStateContext = createContext<OpenGlobalModal | null | undefined>(undefined);

export function useGlobalModalActions() {
  const actions = useContext(GlobalModalActionsContext);
  if (!actions) throw new Error("Global modal provider is missing");
  return actions;
}

/** The open modal. Changes on every open and close: only `GlobalModal` reads it. */
export function useGlobalModal() {
  const state = useContext(GlobalModalStateContext);
  if (state === undefined) throw new Error("Global modal provider is missing");
  return state;
}
