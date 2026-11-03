import { useEffect, useId, useRef } from "react";
import toast from "react-hot-toast";
import FlagIcon from "@mui/icons-material/Flag";
import { usePageVisible } from "../../Context/pageVisibility";

type Props = {
  /** From `useNewSearchResult`: each new key toasts once; null toasts nothing. */
  resultKey: string | null,
  /** Null for a result that isn't worth a toast (e.g. no price changes). */
  message: string | null,
  /** `success` for results; `flag` for flagged price changes. */
  kind?: "success" | "flag",
}

/**
 * Announces a search result while its page is on screen. A result that comes back while the page
 * is hidden waits until it's shown. Hiding the page takes the toast down for good: unlike an
 * error (`QueryErrorToast`), a result is news only once.
 */
export default function SearchResultToast({ resultKey, message, kind = "success" }: Props) {
  const visible = usePageVisible();
  const id = useId();
  const shownKey = useRef<string | null>(null);

  useEffect(() => {
    if (!visible || !resultKey || !message || shownKey.current === resultKey) return;
    shownKey.current = resultKey;
    if (kind === "success") toast.success(message, { id });
    // 20px, the size of the toast's own success and error icons.
    else toast(message, { id, icon: <FlagIcon sx={{ fontSize: 20 }} /> });
  }, [visible, resultKey, message, kind, id]);

  // Down when the page is hidden, or unmounts (leaving a standalone search page).
  useEffect(() => visible ? () => toast.dismiss(id) : undefined, [visible, id]);

  return null;
}
