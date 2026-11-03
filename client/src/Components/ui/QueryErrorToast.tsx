import { useEffect, useId } from "react";
import toast from "react-hot-toast";
import { usePageVisible } from "../../Context/pageVisibility";

/**
 * Shows a search's error as a toast while its page is on screen, and takes it down when the
 * page is hidden, so an error never shows over a page it isn't about. Coming back to a page whose
 * search still failed shows it again.
 */
export default function QueryErrorToast({ error }: { error: Error | null }) {
  const visible = usePageVisible();
  const id = useId();

  useEffect(() => {
    if (!error || !visible) return;
    toast.error(error.message, { id });
    return () => toast.dismiss(id);
  }, [error, visible, id]);

  return null;
}
