import { useEffect, useRef, useState } from "react";
import { useWorkspaceActions } from "../Context/WorkspaceContext";

export default function useTabRename(id: string, title: string) {
  const [active, setActive] = useState(false);
  const [draft, setDraft] = useState(title);

  const { renameTab, } = useWorkspaceActions();

  const inputRef = useRef<HTMLInputElement>(null);
  /** The button that opens the rename; focus returns to it after Enter or Escape. */
  const returnFocusRef = useRef<HTMLButtonElement>(null);
  // Only Enter and Escape restore focus. A blur means the user moved focus somewhere on purpose.
  const restoreFocus = useRef(false);

  // In an effect, not in the key handler: by now the input is gone, so focusing the button
  // can't blur it and commit twice, and the button is enabled again (the Fab is disabled
  // while renaming).
  useEffect(() => {
    if (active) {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else if (restoreFocus.current) {
      restoreFocus.current = false;
      returnFocusRef.current?.focus();
    }
  }, [active])

  const start = () => {
    setDraft(title);
    setActive(true);
  }

  const cancel = () => {
    setDraft(title);
    setActive(false);
  }

  const commit = () => {
    renameTab(id, draft);
    setActive(false);
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      // Focus is back on the button before this Enter's keypress fires, which would click it
      // and reopen the menu. Cancelling the keydown suppresses the keypress.
      e.preventDefault();
      e.stopPropagation();
      restoreFocus.current = true;
      commit();
    }
    if (e.key === "Escape") {
      // Keeps Escape from closing the phone drawer.
      e.stopPropagation();
      restoreFocus.current = true;
      cancel();
    }
  }

  return {
    active,
    start,
    cancel,
    commit,
    draft,
    setDraft,
    inputRef,
    returnFocusRef,
    onKeyDown,
  }
}
