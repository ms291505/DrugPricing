import { useEffect, useState } from "react";
import { Button, type ButtonProps } from "@mui/material";

/** How long the button waits for the confirming click before it backs off. */
const CONFIRM_TIMEOUT_MS = 4000;

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
 * or focus leaves it. A double-click arms it only: its second click isn't a confirmation.
 */
export default function ConfirmButton({ label, confirmLabel, onConfirm, color }: Props) {
  const [armed, setArmed] = useState(false);

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
          setArmed(true);
          return;
        }
        // `detail` counts the clicks in a quick series; a keyboard press is 0.
        if (event.detail > 1) return;
        setArmed(false);
        onConfirm();
      }}
      onBlur={() => setArmed(false)}
    >
      {armed ? confirmLabel : label}
    </Button>
  );
}
