import { useEffect, useId, useRef } from "react";
import toast from "react-hot-toast";
import { usePageVisible } from "../../Context/pageVisibility";

type Props = {
  /** From `useNewSearchResult`: each new key toasts once; null toasts nothing. */
  resultKey: string | null,
  /** Null when there is no result to announce. */
  message: string | null,
}

/**
 * Announces a search result while its page is on screen. A result that comes back while the page
 * is hidden waits until it's shown. Hiding the page takes the toast down for good: unlike an
 * error (`QueryErrorToast`), a result is news only once.
 */
export default function SearchResultToast({ resultKey, message }: Props) {
  const visible = usePageVisible();
  const id = useId();
  const shownKey = useRef<string | null>(null);

  useEffect(() => {
    if (!visible || !resultKey || !message || shownKey.current === resultKey) return;
    shownKey.current = resultKey;
    toast.success(message, { id });
  }, [visible, resultKey, message, id]);

  // Down when the page is hidden, or unmounts (leaving a standalone search page).
  useEffect(() => visible ? () => toast.dismiss(id) : undefined, [visible, id]);

  return null;
}
