import { useEffect, useRef, useState } from "react";
import { Button, type ButtonProps } from "@mui/material";

/** How long the button waits for the confirming click before it backs off. */
const CONFIRM_TIMEOUT_MS = 4000;
/** A confirming click this soon after arming is the rest of a double-click or double-tap. */
const MIN_CONFIRM_DELAY_MS = 300;

type Props = {
  label: string,
  /** Shown while waiting for the second click. */
  confirmLabel: string,
  onConfirm: () => void,
  color?: ButtonProps["color"],
}

/**
 * A button for a destructive action that takes two clicks: outlined at first, then filled and
 * asking to be clicked again. It backs off if the second click doesn't come within a few seconds
 * or focus leaves it (on iOS a tap doesn't focus a button, so there only the timeout applies).
 *
 * Nothing but a deliberate second click confirms: not the rest of a double-click or double-tap,
 * which comes within `MIN_CONFIRM_DELAY_MS`, and not a held Enter key, whose repeats would each
 * click.
 */
export default function ConfirmButton({ label, confirmLabel, onConfirm, color }: Props) {
  const [armed, setArmed] = useState(false);
  const armedAt = useRef(0);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), CONFIRM_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <Button
      color={color}
      variant={armed ? "contained" : "outlined"}
      onClick={(event) => {
        if (!armed) {
          armedAt.current = event.timeStamp;
          setArmed(true);
          return;
        }
        if (event.timeStamp - armedAt.current < MIN_CONFIRM_DELAY_MS) return;
        setArmed(false);
        onConfirm();
      }}
      // A held key repeats keydown, and a button clicks on each Enter keydown.
      onKeyDown={(event) => { if (event.repeat) event.preventDefault(); }}
      onBlur={() => setArmed(false)}
    >
      {armed ? confirmLabel : label}
    </Button>
  );
}
